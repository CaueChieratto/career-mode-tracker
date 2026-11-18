import { describe, expect, it, vi, beforeEach } from "vitest";
import { ServiceMatches } from "../common/services/ServiceMatches";
import { PlayerMatchStat } from "../common/interfaces/PlayerMatchStat";
import { stat } from "./factories/domain";
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
  getDocs: vi.fn(),
  getDoc: vi.fn(),
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

vi.mock("../common/services/ServiceTable", () => ({
  ServiceTable: {
    reconcileMatch: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("ServiceMatches savePlayerStatsToSubcollection fallback em caso de quota exceeded", () => {
  beforeEach(() => {
    resetQuotaExceeded();
    vi.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
  });

  const testStats: PlayerMatchStat[] = [
    stat({ playerId: "p1", goals: 1, minutesPlayed: 90 }),
  ];
  const allStats: PlayerMatchStat[] = [
    stat({ playerId: "p1", goals: 1, minutesPlayed: 90 }),
    stat({ playerId: "p2", goals: 2, minutesPlayed: 85 }),
  ];

  it("executa fallback com writeBatch quando runTransaction estoura quota (code resource-exhausted)", async () => {
    mockRunTransaction.mockRejectedValue({
      code: "resource-exhausted",
      message: "Quota exceeded.",
    });

    const result = await ServiceMatches.savePlayerStatsToSubcollection(
      "career-1",
      "season-1",
      "match-1",
      testStats,
      allStats,
      "p1",
    );

    expect(result).toBeDefined();
    expect(result.some((s) => s.playerId === "p1")).toBe(true);
    expect(result.some((s) => s.playerId === "p2")).toBe(true);
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("executa fallback quando erro contém 429 Too Many Requests", async () => {
    mockRunTransaction.mockRejectedValue(
      new Error("POST https://firestore.googleapis.com/... 429 (Too Many Requests)"),
    );

    const result = await ServiceMatches.savePlayerStatsToSubcollection(
      "career-1",
      "season-1",
      "match-2",
      testStats,
      allStats,
      "p1",
    );

    expect(result).toBeDefined();
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it("repassa o erro caso NÃO seja relacionado a quota (ex: permission-denied)", async () => {
    const permError = { code: "permission-denied", message: "Missing permissions" };
    mockRunTransaction.mockRejectedValue(permError);

    await expect(
      ServiceMatches.savePlayerStatsToSubcollection(
        "career-1",
        "season-1",
        "match-err",
        testStats,
        allStats,
      ),
    ).rejects.toEqual(permError);

    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("salva partida diretamente via setDoc se writeBatch.commit falhar no fallback de quota", async () => {
    mockRunTransaction.mockRejectedValue({ code: "resource-exhausted" });
    mockBatchCommit.mockRejectedValue(new Error("Batch write limit reached"));

    const result = await ServiceMatches.savePlayerStatsToSubcollection(
      "career-1",
      "season-1",
      "match-batch-fail",
      testStats,
      allStats,
      "p1",
    );

    expect(result).toBeDefined();
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "users/user-123/careers/career-1/seasons/season-1/matches/match-batch-fail",
      }),
      expect.objectContaining({
        _playerStatsVersion: 1,
      }),
      { merge: true },
    );
  });

  it("salva diretamente e NÃO invoca runTransaction se circuit breaker de quota já estiver ativo", async () => {
    markQuotaExceeded();

    const result = await ServiceMatches.savePlayerStatsToSubcollection(
      "career-1",
      "season-1",
      "match-circuit-breaker",
      testStats,
      allStats,
      "p1",
    );

    expect(result).toBeDefined();
    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockBatchCommit).toHaveBeenCalled();
  });
});
