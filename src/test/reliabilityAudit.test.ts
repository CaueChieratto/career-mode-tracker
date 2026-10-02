import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isLocalhostEnvironment,
  shouldConnectEmulator,
} from "../common/services/Firebase/emulatorGuard";
import { withFirestoreRetry } from "../common/utils/firestoreRetry";
import { getAllCareers, clearGettersCache } from "../common/helpers/Getters";
import { ServiceMatches } from "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { ServicePlayers } from "../common/services/ServicePlayers";
import { ServiceTable } from "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable";
import { querySnapshot, onSnapshot, getDocs } from "./mocks/firestore";
import { career, season } from "./factories/domain";
import type { Career } from "../common/interfaces/Career";

vi.mock(
  "../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches",
  () => ({ ServiceMatches: { getMatchesBySeason: vi.fn() } }),
);
vi.mock("../common/services/ServicePlayers", () => ({
  ServicePlayers: { getPlayersBySeason: vi.fn() },
}));
vi.mock(
  "../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable",
  () => ({ ServiceTable: { getTableBySeason: vi.fn() } }),
);

describe("Auditoria de Confiabilidade — Emulator Guard", () => {
  it("identifica corretamente ambientes localhost", () => {
    expect(isLocalhostEnvironment("localhost")).toBe(true);
    expect(isLocalhostEnvironment("127.0.0.1")).toBe(true);
    expect(isLocalhostEnvironment("::1")).toBe(true);
    expect(isLocalhostEnvironment("[::1]")).toBe(true);
    expect(isLocalhostEnvironment("app.localhost")).toBe(true);
  });

  it("identifica corretamente domínios remotos de produção", () => {
    expect(isLocalhostEnvironment("career-mode-tracker.web.app")).toBe(false);
    expect(isLocalhostEnvironment("meu-app.firebaseapp.com")).toBe(false);
    expect(isLocalhostEnvironment("career-tracker.vercel.app")).toBe(false);
    expect(isLocalhostEnvironment("custom-domain.com")).toBe(false);
  });

  it("recusa conexão com emulador se VITE_USE_FIREBASE_EMULATOR não for true", () => {
    expect(shouldConnectEmulator(undefined, "localhost")).toBe(false);
    expect(shouldConnectEmulator("false", "localhost")).toBe(false);
    expect(shouldConnectEmulator("", "localhost")).toBe(false);
  });

  it("permite conexão com emulador exclusivamente em localhost quando flag for true", () => {
    expect(shouldConnectEmulator("true", "localhost")).toBe(true);
    expect(shouldConnectEmulator("true", "127.0.0.1")).toBe(true);
  });

  it("BLOQUEIA terminantemente conexão com emulador em domínios remotos mesmo com flag true", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(shouldConnectEmulator("true", "career-mode-tracker.web.app")).toBe(
      false,
    );
    expect(shouldConnectEmulator("true", "production.com")).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("Auditoria de Confiabilidade — withFirestoreRetry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna imediatamente se a operação for bem-sucedida", async () => {
    const op = vi.fn().mockResolvedValue("sucesso");
    const result = await withFirestoreRetry(op);
    expect(result).toBe("sucesso");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retenta e resolve com sucesso em caso de erro 429 transitório", async () => {
    const error429 = new Error("429 Too Many Requests");
    const op = vi
      .fn()
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce("recuperado");

    const result = await withFirestoreRetry(op, 2, 10);
    expect(result).toBe("recuperado");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("retenta e resolve em caso de resource-exhausted (quota/burst)", async () => {
    const quotaError = Object.assign(new Error("Quota exceeded"), {
      code: "resource-exhausted",
    });
    const op = vi
      .fn()
      .mockRejectedValueOnce(quotaError)
      .mockResolvedValueOnce("ok");

    const result = await withFirestoreRetry(op, 2, 10);
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("rejeita imediatamente em erro não transitório sem retentar", async () => {
    const permError = Object.assign(new Error("Permission denied"), {
      code: "permission-denied",
    });
    const op = vi.fn().mockRejectedValue(permError);

    await expect(withFirestoreRetry(op, 2, 10)).rejects.toThrow(
      "Permission denied",
    );
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("esgota retentativas e propaga o erro se falha persistir", async () => {
    const err = Object.assign(new Error("Unavailable"), {
      code: "unavailable",
    });
    const op = vi.fn().mockRejectedValue(err);

    await expect(withFirestoreRetry(op, 2, 10)).rejects.toThrow("Unavailable");
    expect(op).toHaveBeenCalledTimes(3); // 1 inicial + 2 retries
  });
});

describe("Auditoria de Confiabilidade — Getters Caching & N+1 Prevention", () => {
  beforeEach(() => {
    clearGettersCache();
    vi.mocked(ServiceMatches.getMatchesBySeason).mockReset().mockResolvedValue([]);
    vi.mocked(ServicePlayers.getPlayersBySeason).mockReset().mockResolvedValue([]);
    vi.mocked(ServiceTable.getTableBySeason).mockReset().mockResolvedValue([]);
    getDocs.mockReset().mockResolvedValue(querySnapshot([]));
    onSnapshot.mockReset();
  });

  it("evita reconsultar subcoleções de carreira cujo updatedAt não mudou entre snapshots", async () => {
    let deliver: ((snapshot: ReturnType<typeof querySnapshot>) => Promise<void>) | undefined;
    onSnapshot.mockImplementation((_ref, callback) => {
      deliver = callback as typeof deliver;
      return vi.fn();
    });

    const c1: Career = career({
      id: "c1",
      updatedAt: 1000,
      clubData: [season({ id: "s1", seasonNumber: 1 })],
    });

    const callback = vi.fn();
    getAllCareers("test-user", callback);

    // 1º snapshot: hidrata c1
    await deliver!(querySnapshot([{ id: "c1", data: c1 }]));
    expect(ServiceMatches.getMatchesBySeason).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);

    // 2º snapshot: carreira c1 com mesmo updatedAt (ex: confirmação de escrita do Firestore)
    await deliver!(querySnapshot([{ id: "c1", data: c1 }]));
    // NÃO deve ter chamado ServiceMatches novamente!
    expect(ServiceMatches.getMatchesBySeason).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("re-hidrata a carreira quando updatedAt for atualizado", async () => {
    let deliver: ((snapshot: ReturnType<typeof querySnapshot>) => Promise<void>) | undefined;
    onSnapshot.mockImplementation((_ref, callback) => {
      deliver = callback as typeof deliver;
      return vi.fn();
    });

    const c1Initial: Career = career({
      id: "c1",
      updatedAt: 1000,
      clubData: [season({ id: "s1", seasonNumber: 1 })],
    });

    const callback = vi.fn();
    getAllCareers("test-user", callback);

    // 1º snapshot: c1 com updatedAt = 1000
    await deliver!(querySnapshot([{ id: "c1", data: c1Initial }]));
    expect(ServiceMatches.getMatchesBySeason).toHaveBeenCalledTimes(1);

    // 2º snapshot: c1 modificado com updatedAt = 2000
    const c1Updated: Career = { ...c1Initial, updatedAt: 2000 };
    await deliver!(querySnapshot([{ id: "c1", data: c1Updated }]));
    // Deve ter re-hidratado c1 porque updatedAt mudou
    expect(ServiceMatches.getMatchesBySeason).toHaveBeenCalledTimes(2);
  });
});
