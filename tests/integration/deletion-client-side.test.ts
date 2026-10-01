import { expect, it, vi, beforeEach } from "vitest";
import {
  deleteCareerClientTree,
  deleteCareerFromFirestore,
  deleteCareerLocalStorage,
} from "../../src/common/helpers/Deleters";
import {
  academyPlayer,
  career,
  match,
  player,
  season,
  stat,
} from "../../src/test/factories/domain";
import { auth } from "./firebaseClient";
import { login, put, read, seedCareer } from "./helpers";

let callableCallCount = 0;
vi.mock("firebase/functions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/functions")>();
  return {
    ...actual,
    httpsCallable: (
      functionsInstance: Parameters<typeof actual.httpsCallable>[0],
      name: string,
    ) => {
      callableCallCount++;
      return actual.httpsCallable(functionsInstance, name);
    },
  };
});

// Mock localStorage para o ambiente Node dos testes
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

beforeEach(() => {
  callableCallCount = 0;
  globalThis.localStorage = new MemoryStorage();
});

const careerPathFor = (cId: string, uid = auth.currentUser!.uid) =>
  `users/${uid}/careers/${cId}`;
const seasonPathFor = (cId: string, sId: string, uid = auth.currentUser!.uid) =>
  `${careerPathFor(cId, uid)}/seasons/${sId}`;
const matchPathFor = (
  cId: string,
  sId: string,
  mId: string,
  uid = auth.currentUser!.uid,
) => `${seasonPathFor(cId, sId, uid)}/matches/${mId}`;

async function populateFullTree(careerId = "c1") {
  await login("a");
  const uid = auth.currentUser!.uid;

  await seedCareer(
    career({
      id: careerId,
      clubData: [season({ id: "s1" })],
    }),
  );

  const docs = [
    [seasonPathFor(careerId, "s1", uid), { id: "s1" }],
    [matchPathFor(careerId, "s1", "m1", uid), match({ matchesId: "m1" })],
    [
      `${matchPathFor(careerId, "s1", "m1", uid)}/playerStats/p1`,
      stat({ playerId: "p1" }),
    ],
    [`${seasonPathFor(careerId, "s1", uid)}/players/p1`, player({ id: "p1" })],
    [`${seasonPathFor(careerId, "s1", uid)}/table/t1`, { id: "t1", points: 3 }],
    [
      `${seasonPathFor(careerId, "s1", uid)}/academyPlayers/a1`,
      academyPlayer({ id: "a1" }),
    ],
    [
      `${seasonPathFor(careerId, "s1", uid)}/academyTournaments/tour1`,
      { id: "tour1" },
    ],
  ] as const;

  for (const [path, data] of docs) {
    await put(path, data);
  }

  return { uid, docs: docs.map(([path]) => path) };
}

it("modo Emulator continua usando a callable B12", async () => {
  await populateFullTree("c-emu");
  const initialCallCount = callableCallCount;

  // No modo padrão de teste, VITE_USE_FIREBASE_EMULATOR === "true"
  expect(import.meta.env.VITE_USE_FIREBASE_EMULATOR).toBe("true");

  await deleteCareerFromFirestore("c-emu");

  // Prova que chamou a Cloud Function via httpsCallable
  expect(callableCallCount).toBe(initialCallCount + 1);
});

it("modo real sem VITE_ALLOW_REAL_MANUAL_DELETE=true aborta antes de qualquer delete", async () => {
  const { uid, docs } = await populateFullTree("c-protect");

  try {
    // Simula ambiente de produção sem a flag explícita
    vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "false");
    vi.stubEnv("VITE_ALLOW_REAL_MANUAL_DELETE", "false");

    await expect(deleteCareerFromFirestore("c-protect")).rejects.toThrow(
      /desabilitada neste ambiente/i,
    );

    // Garante que a raiz e todos os documentos foram preservados intactos
    expect(await read(careerPathFor("c-protect", uid))).toBeDefined();
    for (const docPath of docs) {
      expect(await read(docPath)).toBeDefined();
    }
  } finally {
    vi.unstubAllEnvs();
  }
});

it("fluxo client-side apaga toda a arvore canonica (career, seasons, players, academy, table, tournaments, matches, playerStats)", async () => {
  const { uid, docs } = await populateFullTree("c-canonical");

  // Salva chaves no localStorage para testar limpeza seletiva
  localStorage.setItem("colorSaved_c-canonical", JSON.stringify(["#fff"]));
  localStorage.setItem("colorSaved_c-other", JSON.stringify(["#000"]));

  await deleteCareerClientTree(uid, "c-canonical");
  deleteCareerLocalStorage("c-canonical");

  // Garante que a raiz e todos os ramos foram apagados
  expect(await read(careerPathFor("c-canonical", uid))).toBeUndefined();
  for (const docPath of docs) {
    expect(await read(docPath)).toBeUndefined();
  }

  // LocalStorage: somente a carreira excluída é limpa
  expect(localStorage.getItem("colorSaved_c-canonical")).toBeNull();
  expect(localStorage.getItem("colorSaved_c-other")).not.toBeNull();
});

it("temporada existente no Firestore mas ausente de clubData tambem e removida", async () => {
  const { uid } = await populateFullTree("c-orphan");

  // Semeia temporada fantasma e jogador que não constam em clubData
  const orphanSeasonPath = `users/${uid}/careers/c-orphan/seasons/s-ghost`;
  const orphanPlayerPath = `${orphanSeasonPath}/players/p-ghost`;
  await put(orphanSeasonPath, { id: "s-ghost" });
  await put(orphanPlayerPath, { id: "p-ghost", name: "Fantasma" });

  expect(await read(orphanSeasonPath)).toBeDefined();
  expect(await read(orphanPlayerPath)).toBeDefined();

  await deleteCareerClientTree(uid, "c-orphan");

  expect(await read(careerPathFor("c-orphan", uid))).toBeUndefined();
  expect(await read(orphanSeasonPath)).toBeUndefined();
  expect(await read(orphanPlayerPath)).toBeUndefined();
});

it("falha intermediaria em batch nao apaga a raiz prematuramente e retry consegue concluir", async () => {
  const { uid, docs } = await populateFullTree("c-retry");

  let failOnce = true;
  const failingBatchCommit = async (
    batch: Parameters<Parameters<typeof deleteCareerClientTree>[2] & {}>[0],
  ) => {
    if (failOnce) {
      failOnce = false;
      throw new Error("Erro de rede simulado no lote intermediario");
    }
    await batch.commit();
  };

  // Primeira tentativa: deve falhar no primeiro lote
  await expect(
    deleteCareerClientTree(uid, "c-retry", failingBatchCommit),
  ).rejects.toThrow("Erro de rede simulado no lote intermediario");

  // A raiz da carreira NÃO pode ter sido apagada prematuramente
  expect(await read(careerPathFor("c-retry", uid))).toBeDefined();

  // Retry com execução normal deve concluir e apagar tudo inclusive a raiz
  await deleteCareerClientTree(uid, "c-retry");

  expect(await read(careerPathFor("c-retry", uid))).toBeUndefined();
  for (const docPath of docs) {
    expect(await read(docPath)).toBeUndefined();
  }
});

it("nenhuma chamada para httpsCallable / Cloud Function ocorre no modo real manual com flag ativa", async () => {
  const { uid, docs } = await populateFullTree("c-realmode");
  const initialCallCount = callableCallCount;

  try {
    vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "false");
    vi.stubEnv("VITE_ALLOW_REAL_MANUAL_DELETE", "true");

    // Chama a API pública deleteCareerFromFirestore no modo real manual
    await deleteCareerFromFirestore("c-realmode");

    // Prova que NENHUMA chamada para httpsCallable ocorreu
    expect(callableCallCount).toBe(initialCallCount);

    // Prova que a deleção client-side removeu a carreira e todos os seus descendentes
    expect(await read(careerPathFor("c-realmode", uid))).toBeUndefined();
    for (const docPath of docs) {
      expect(await read(docPath)).toBeUndefined();
    }
  } finally {
    vi.unstubAllEnvs();
  }
});
