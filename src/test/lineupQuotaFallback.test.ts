import { describe, expect, it, vi, beforeEach } from "vitest";
import { ServiceLineup } from "../pages/Match/services/ServiceLineup";
import { PlayerMatchStat } from "../common/interfaces/PlayerMatchStat";
import { lineup, stat } from "./factories/domain";
import {
  markQuotaExceeded,
  resetQuotaExceeded,
} from "../common/utils/firestoreRetry";

// Mock Firebase & Auth
vi.mock("../common/services/Firebase", () => ({
  db: {},
  auth: {
    currentUser: { uid: "user-123" },
  },
}));

const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatchDelete = vi.fn();
const mockBatchSet = vi.fn();
const mockBatchUpdate = vi.fn();
const mockRunTransaction = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, path) => ({ path })),
  doc: vi.fn((_db, path, id) => ({ path: id ? `${path}/${id}` : path, id })),
  deleteField: vi.fn(() => "__DELETE_FIELD__"),
  getDocsFromServer: vi.fn(),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  writeBatch: vi.fn(() => ({
    delete: mockBatchDelete,
    set: mockBatchSet,
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

describe("ServiceLineup fallback em caso de quota exceeded", () => {
  beforeEach(() => {
    resetQuotaExceeded();
    vi.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
  });

  const testLineup = lineup();

  const testStats: PlayerMatchStat[] = [
    stat({ playerId: "g1", minutesPlayed: 90 }),
    stat({ playerId: "p1", minutesPlayed: 90 }),
    stat({ playerId: "p2", minutesPlayed: 0 }),
    stat({ playerId: "removed-1", minutesPlayed: 0 }),
  ];

  it("executa fallback com writeBatch quando runTransaction estoura quota (code resource-exhausted)", async () => {
    mockRunTransaction.mockRejectedValue({
      code: "resource-exhausted",
      message: "Quota exceeded.",
    });

    const result = await ServiceLineup.saveLineupToMatch(
      "career-1",
      "season-1",
      "match-1",
      testLineup,
      testStats,
      ["removed-1"],
    );

    expect(result).toBeDefined();
    // Removed player must not be in finalStats
    expect(result.some((s) => s.playerId === "removed-1")).toBe(false);
    expect(result.some((s) => s.playerId === "p1")).toBe(true);
    expect(result.some((s) => s.playerId === "g1")).toBe(true);

    // Batch operations must have been performed
    expect(mockBatchCommit).toHaveBeenCalled();
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "users/user-123/careers/career-1/seasons/season-1/matches/match-1",
      }),
      expect.objectContaining({
        lineup: testLineup,
        _playerStatsVersion: 1,
      }),
      { merge: true },
    );
  });

  it("executa fallback quando erro contém 429 Too Many Requests", async () => {
    mockRunTransaction.mockRejectedValue(
      new Error("POST https://firestore.googleapis.com/... 429 (Too Many Requests)"),
    );

    const result = await ServiceLineup.saveLineupToMatch(
      "career-1",
      "season-1",
      "match-2",
      testLineup,
      testStats,
      [],
    );

    expect(result).toBeDefined();
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("repassa o erro caso NÃO seja relacionado a quota (ex: permission-denied)", async () => {
    const permError = { code: "permission-denied", message: "Missing permissions" };
    mockRunTransaction.mockRejectedValue(permError);

    await expect(
      ServiceLineup.saveLineupToMatch(
        "career-1",
        "season-1",
        "match-err",
        testLineup,
        testStats,
      ),
    ).rejects.toEqual(permError);

    expect(mockBatchCommit).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("salva partida diretamente via setDoc se writeBatch.commit falhar no fallback de quota", async () => {
    mockRunTransaction.mockRejectedValue({ code: "resource-exhausted" });
    mockBatchCommit.mockRejectedValue(new Error("Batch write limit reached"));

    const result = await ServiceLineup.saveLineupToMatch(
      "career-1",
      "season-1",
      "match-batch-fail",
      testLineup,
      testStats,
      [],
    );

    expect(result).toBeDefined();
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "users/user-123/careers/career-1/seasons/season-1/matches/match-batch-fail",
      }),
      expect.objectContaining({
        lineup: testLineup,
        _playerStatsVersion: 1,
      }),
      { merge: true },
    );
  });

  it("salva diretamente e NÃO invoca runTransaction se circuit breaker de quota já estiver ativo", async () => {
    markQuotaExceeded();

    const result = await ServiceLineup.saveLineupToMatch(
      "career-1",
      "season-1",
      "match-circuit-breaker",
      testLineup,
      testStats,
      [],
    );

    expect(result).toBeDefined();
    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalled();
  });
});
