import { beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import { getCareerById } from "../common/helpers/Getters";
import { updateCareerFirestore } from "../common/helpers/Setters";
import { auth } from "./mocks/firebaseClient";
import {
  arrayUnion,
  deleteDoc,
  getDoc,
  getDocs,
  getDocsFromServer,
  querySnapshot,
  runTransaction,
  writeBatch,
} from "./mocks/firestore";
import {
  academyPlayer,
  career,
  deepFreeze,
  player,
  season,
} from "./factories/domain";
import { loanPlayer, rosterScenarios } from "./fixtures/scenarios";

vi.mock("../common/helpers/Getters", () => ({ getCareerById: vi.fn() }));
vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn(),
}));

const batchSet = vi.fn<(...args: unknown[]) => void>();
const batchUpdate = vi.fn<(...args: unknown[]) => void>();
const commit = vi.fn<() => Promise<void>>();

beforeEach(() => {
  auth.currentUser = { uid: "test-user" };
  batchSet.mockReset();
  batchUpdate.mockReset();
  commit.mockReset().mockResolvedValue(undefined);
  writeBatch.mockReset().mockReturnValue({
    set: batchSet,
    update: batchUpdate,
    commit,
  } as never);
  arrayUnion.mockClear();
  getDoc.mockReset();
  getDocs.mockReset();
  runTransaction.mockReset();
  getDocsFromServer.mockReset().mockResolvedValue(querySnapshot([]));
  deleteDoc.mockReset().mockResolvedValue(undefined);
  vi.mocked(getCareerById).mockReset();
  vi.mocked(updateCareerFirestore).mockReset().mockResolvedValue(undefined);
});

describe("criação write-only de temporada", () => {
  it("cria a primeira temporada com ID determinístico e zero reads", async () => {
    await ServiceSeasons.addSeason(career());

    expect(batchSet).not.toHaveBeenCalled();
    expect(arrayUnion).toHaveBeenCalledWith({
      id: "season-1",
      seasonNumber: 1,
      players: [],
      leagues: [],
    });
    expect(batchUpdate).toHaveBeenCalledWith(
      { path: "users/test-user/careers/c1" },
      {
        clubData: {
          __op: "arrayUnion",
          elements: [
            {
              id: "season-1",
              seasonNumber: 1,
              players: [],
              leagues: [],
            },
          ],
        },
        updatedAt: expect.any(Number),
      },
    );
    expect(commit).toHaveBeenCalledOnce();
    expect(getDoc).not.toHaveBeenCalled();
    expect(getDocs).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it("usa o menor número livre e copia apenas a temporada anterior", async () => {
    const input = career({
      clubData: [
        season({ players: [player()] }),
        season({ id: "s3", seasonNumber: 3 }),
      ],
    });
    await ServiceSeasons.addSeason(input);

    expect(arrayUnion).toHaveBeenCalledWith(
      expect.objectContaining({ id: "season-2", seasonNumber: 2 }),
    );
    expect(batchSet).toHaveBeenCalledTimes(1);
  });

  it("transporta elenco elegível e só atletas ativos da base", async () => {
    const players = rosterScenarios().filter((entry) => entry.id !== "loan");
    players[0] = player({ age: 20, contractTime: 0, buy: true, ballonDor: 2 });
    const input = deepFreeze(
      career({
        clubData: [
          season({
            players,
            academyPlayers: [
              academyPlayer(),
              academyPlayer({ id: "a2", status: "promoted" }),
              academyPlayer({ id: "a3", status: "released" }),
            ],
          }),
        ],
      }),
    );

    await ServiceSeasons.addSeason(input);
    const writes = batchSet.mock.calls.map((call) => call[1]);
    expect(writes).toHaveLength(4);
    expect(writes[0]).toMatchObject({
      id: "p1",
      age: 21,
      contractTime: 0,
      buy: false,
      ballonDor: 0,
      statsLeagues: [],
    });
    expect(writes[1]).toMatchObject({
      id: "incoming",
      incomingLoan: true,
      loan: true,
    });
    expect(writes[2]).toMatchObject({ id: "promoted", isAcademy: true });
    expect(writes[3]).toMatchObject({ id: "a1", evolutionHistory: [] });
  });

  it.each([
    ["Inglaterra", 6],
    ["Brasil", 0],
    ["País desconhecido", 0],
  ])(
    "preserva o calendário de %s ao devolver atleta emprestado",
    async (nation, expectedMonth) => {
      const input = deepFreeze(
        career({
          nation,
          clubData: [season({ players: [loanPlayer()] })],
        }),
      );
      const before = structuredClone(input);

      await ServiceSeasons.addSeason(input);
      const transported = batchSet.mock.calls[0][1] as ReturnType<
        typeof player
      >;
      expect(transported.loan).toBe(false);
      expect(transported.contract).toHaveLength(3);
      expect(transported.contract[1].dataArrival?.getMonth()).toBe(
        expectedMonth,
      );
      expect(input).toEqual(before);
    },
  );

  it("duas chamadas do mesmo snapshot usam os mesmos paths e metadados", async () => {
    const input = deepFreeze(
      career({ clubData: [season({ players: [player()] })] }),
    );
    await Promise.all([
      ServiceSeasons.addSeason(input),
      ServiceSeasons.addSeason(input),
    ]);

    expect(batchSet.mock.calls[0]).toEqual(batchSet.mock.calls[1]);
    expect(arrayUnion.mock.calls[0]).toEqual(arrayUnion.mock.calls[1]);
    expect(commit).toHaveBeenCalledTimes(2);
  });

  it("falha do commit não publica estado local nem escrita separada", async () => {
    const input = deepFreeze(
      career({ clubData: [season({ players: [player()] })] }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    commit.mockRejectedValueOnce(new Error("commit-failed"));

    await expect(ServiceSeasons.addSeason(input)).rejects.toThrow(
      "commit-failed",
    );
    expect(input.clubData).toHaveLength(1);
    expect(updateCareerFirestore).not.toHaveBeenCalled();
  });

  it("recusa lote acima de 500 writes antes de criar o batch", async () => {
    const players = Array.from({ length: 500 }, (_, index) =>
      player({ id: `p${index}` }),
    );
    await expect(
      ServiceSeasons.addSeason(
        career({ clubData: [season({ players })] }),
      ),
    ).rejects.toThrow("limite de 500 escritas");
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it("sem autenticação não inicia read nem write", async () => {
    auth.currentUser = null;
    await expect(ServiceSeasons.addSeason(career())).rejects.toThrow(
      "Usuário não autenticado",
    );
    expect(writeBatch).not.toHaveBeenCalled();
    expect(getDoc).not.toHaveBeenCalled();
    expect(getDocs).not.toHaveBeenCalled();
  });

  it("não cria temporada de carreira com base sem snapshot carregado", async () => {
    const input = career({
      academy: { name: "Academia", nickname: "Base", tournament: "" },
      clubData: [season()],
    });
    await expect(ServiceSeasons.addSeason(input)).rejects.toThrow(
      "Jogadores da base não foram carregados",
    );
    expect(writeBatch).not.toHaveBeenCalled();
  });
});

describe("regressão de exclusão de temporada", () => {
  it("remove subcoleções e playerStats antes da partida", async () => {
    vi.mocked(getCareerById).mockImplementation(async (_uid, _id, callback) => {
      const input = career({ clubData: [season()] });
      callback?.(input.clubData);
      return input;
    });
    getDocsFromServer.mockImplementation(async (ref) => {
      const path = (ref as { path: string }).path;
      return querySnapshot([{ id: `${path}/child`, data: {} }]);
    });

    await ServiceSeasons.deleteSeason("c1", "s1");
    expect(deleteDoc).toHaveBeenCalledTimes(7);
    expect(updateCareerFirestore).toHaveBeenCalledWith("test-user", "c1", {
      clubData: [],
    });
  });

  it("falha de leitura impede exclusão parcial", async () => {
    vi.mocked(getCareerById).mockImplementation(async (_uid, _id, callback) => {
      const input = career({ clubData: [season()] });
      callback?.(input.clubData);
      return input;
    });
    getDocsFromServer.mockRejectedValue(new Error("offline"));

    await expect(ServiceSeasons.deleteSeason("c1", "s1")).rejects.toThrow(
      "offline",
    );
    expect(deleteDoc).not.toHaveBeenCalled();
    expect(updateCareerFirestore).not.toHaveBeenCalled();
  });
});
