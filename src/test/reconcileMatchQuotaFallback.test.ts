import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isQuotaExceededError,
  reconcileMatch,
} from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable/reconcileMatch";
import { Match } from "../common/interfaces/Match";

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
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
}));

describe("isQuotaExceededError", () => {
  it("retorna true para code resource-exhausted", () => {
    expect(isQuotaExceededError({ code: "resource-exhausted" })).toBe(true);
  });

  it("retorna true para mensagem com 429 Too Many Requests", () => {
    expect(
      isQuotaExceededError({
        message: "POST https://firestore.googleapis.com/... 429 (Too Many Requests)",
      }),
    ).toBe(true);
  });

  it("retorna true para mensagem com Quota exceeded", () => {
    expect(
      isQuotaExceededError({
        message: "FirebaseError: Quota exceeded.",
      }),
    ).toBe(true);
  });

  it("retorna false para erros não relacionados a quota", () => {
    expect(isQuotaExceededError({ code: "permission-denied" })).toBe(false);
    expect(isQuotaExceededError(new Error("Network connection lost"))).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
    expect(isQuotaExceededError(undefined)).toBe(false);
  });
});

describe("reconcileMatch fallback em caso de quota exceeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executa fallback direto com setDoc quando runTransaction estoura quota (code resource-exhausted)", async () => {
    const quotaError = {
      code: "resource-exhausted",
      message: "Quota exceeded.",
    };
    mockRunTransaction.mockRejectedValue(quotaError);

    const matchUpdate: Match = {
      matchesId: "match-123",
      date: "10/05/26",
      league: "Premier League",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      homeScore: 2,
      awayScore: 1,
      status: "FINISHED",
      result: "V",
    };

    await expect(
      reconcileMatch("career-1", "season-1", "match-123", matchUpdate),
    ).resolves.toBeUndefined();

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/user-123/careers/career-1/seasons/season-1/matches/match-123" }),
      expect.objectContaining({
        matchesId: "match-123",
        date: "10/05/26",
        homeScore: 2,
        awayScore: 1,
        status: "FINISHED",
      }),
      { merge: true },
    );
  });

  it("executa fallback direto com setDoc quando erro contém 429 Too Many Requests", async () => {
    const rateLimitError = new Error(
      "reconcileMatch.ts:35 POST https://firestore.googleapis.com/.../documents:batchGet 429 (Too Many Requests)",
    );
    mockRunTransaction.mockRejectedValue(rateLimitError);

    const matchUpdate: Match = {
      matchesId: "match-456",
      date: "15/06/26",
      league: "Champions League",
      homeTeam: "Real Madrid",
      awayTeam: "Bayern",
      status: "SCHEDULED",
      result: "?",
    };

    await expect(
      reconcileMatch("career-1", "season-1", "match-456", matchUpdate),
    ).resolves.toBeUndefined();

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/user-123/careers/career-1/seasons/season-1/matches/match-456" }),
      expect.objectContaining({
        matchesId: "match-456",
        date: "15/06/26",
        status: "SCHEDULED",
      }),
      { merge: true },
    );
  });

  it("trata remoção de pênaltis com deleteField no fallback de quota", async () => {
    const quotaError = { code: "resource-exhausted" };
    mockRunTransaction.mockRejectedValue(quotaError);

    const matchUpdate: Match = {
      matchesId: "match-pen",
      date: "20/07/26",
      league: "Copa",
      homeTeam: "Time A",
      awayTeam: "Time B",
      homeScore: 1,
      awayScore: 1,
      homePenScore: 4,
      awayPenScore: 5,
      status: "FINISHED",
      result: "V",
    };

    await reconcileMatch("career-1", "season-1", "match-pen", matchUpdate, true);

    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        matchesId: "match-pen",
        homePenScore: "__DELETE_FIELD__",
        awayPenScore: "__DELETE_FIELD__",
      }),
      { merge: true },
    );
  });

  it("executa deleteDoc no fallback quando update é undefined (exclusão de partida)", async () => {
    const quotaError = { code: "resource-exhausted" };
    mockRunTransaction.mockRejectedValue(quotaError);

    await reconcileMatch("career-1", "season-1", "match-to-delete", undefined);

    expect(mockDeleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: "users/user-123/careers/career-1/seasons/season-1/matches/match-to-delete" }),
    );
  });

  it("repassa o erro caso NÃO seja relacionado a quota (ex: permission-denied)", async () => {
    const permError = { code: "permission-denied", message: "Missing permissions" };
    mockRunTransaction.mockRejectedValue(permError);

    await expect(
      reconcileMatch("career-1", "season-1", "match-err", {
        matchesId: "match-err",
        date: "01/01/26",
        league: "Liga",
        homeTeam: "A",
        awayTeam: "B",
        status: "SCHEDULED",
        result: "?",
      }),
    ).rejects.toEqual(permError);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

