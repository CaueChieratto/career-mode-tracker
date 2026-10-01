import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPromotedPlayer } from "../pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPromotedPlayer";
import { buildPlayerAcademyTournaments } from "../pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPlayerAcademyTournaments";
import { AcademyService } from "../pages/Academy/layouts/AcademyContent/services/AcademyService";
import type { AcademyTournaments } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";
import { academyPlayer, career, deepFreeze, player, season } from "./factories/domain";
import { auth } from "./mocks/firebaseClient";
import {
  getDoc,
  getDocs,
  getDocsFromServer,
  runTransaction,
  writeBatch,
} from "./mocks/firestore";

const batchSet = vi.fn<(...args: unknown[]) => void>();
const batchUpdate = vi.fn<(...args: unknown[]) => void>();
const commit = vi.fn<() => Promise<void>>();

vi.mock("uuid", () => ({ v4: () => "promotion-history" }));

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
  getDoc.mockReset();
  getDocs.mockReset();
  getDocsFromServer.mockReset();
  runTransaction.mockReset();
});

const tournament = (): AcademyTournaments => ({
  id: "t1",
  name: "Copa Base",
  date: "01/08/2024",
  totalMatches: 2,
  isChampion: true,
  tournamentResult: "Campeão",
  matches: [
    {
      id: "am1",
      date: "01/08/2024",
      opponentTeam: "Rival",
      userGoals: 1,
      opponentGoals: 1,
      userPenalties: 0,
      opponentPenalties: 1,
      lineup: [
        {
          playerId: "a1",
          playerName: "Junior",
          goals: 1,
          assists: 0,
          rating: 8,
          defesas: 2,
          cleanSheets: 0,
        },
      ],
    },
    {
      id: "am2",
      date: "02/08/2024",
      opponentTeam: "Rival",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
    },
  ],
});

describe("helpers da promoção", () => {
  it("preserva atributos, data, histórico e origem sem mutar", () => {
    const source = deepFreeze(academyPlayer());
    const result = buildPromotedPlayer(source, "03/08/2024", [], "Base FC");
    expect(result).toMatchObject({
      name: "Junior",
      nation: "Brasil",
      overall: 65,
      isAcademy: true,
      salary: 0,
      ballonDor: 0,
      statsLeagues: [],
      academyNickname: "Base FC",
      shirtNumber: "",
    });
    expect(result.contract[0]).toMatchObject({
      fromClub: "Base",
      dataArrival: new Date(2024, 7, 3),
    });
    expect(result.academyHistory).toEqual(source.evolutionHistory);
    expect(result.academyData).toMatchObject({ id: "a1", potential: "80-90" });
    expect(result.academyData).not.toHaveProperty("name");
    expect(result.academyData).not.toHaveProperty("evolutionHistory");
  });

  it("seleciona só partidas do atleta e preserva pênaltis zero", () => {
    const result = buildPlayerAcademyTournaments(
      deepFreeze([tournament()]),
      "a1",
    );
    expect(result[0]).toMatchObject({ totalMatches: 1, isChampion: true });
    expect(result[0].matches[0]).toMatchObject({
      userPenalties: 0,
      opponentPenalties: 1,
      lineup: [{ goals: 1, rating: 8, defesas: 2 }],
    });
    expect(result[0].matches[0].lineup[0]).not.toHaveProperty("playerId");
    expect(result[0].matches[0].lineup[0]).not.toHaveProperty("assists");
  });
});

describe("promoção write-only", () => {
  it("grava base, profissional e updatedAt em um batch sem reads", async () => {
    const source = deepFreeze(academyPlayer());
    const result = await AcademyService.promotePlayerToProfessional(
      career({ clubData: [season()] }),
      "s1",
      source,
      "03/08/2024",
      [tournament()],
    );

    expect(batchSet).toHaveBeenCalledTimes(2);
    expect(batchSet.mock.calls[0][0]).toEqual({
      path: "users/test-user/careers/c1/seasons/s1/academyPlayers/a1",
    });
    expect(batchSet.mock.calls[0][1]).toMatchObject({
      status: "promoted",
      exitDate: "03/08/2024",
    });
    expect(batchSet.mock.calls[1][0]).toEqual({
      path: "users/test-user/careers/c1/seasons/s1/players/academy-a1",
    });
    expect(result.professional).toMatchObject({
      id: "academy-a1",
      isAcademy: true,
      academyData: { id: "a1", status: "promoted" },
      shirtNumber: "",
    });
    expect(result.professional.academyHistory).toHaveLength(2);
    expect(result.professional.academyTournaments).toHaveLength(1);
    expect(batchUpdate).toHaveBeenCalledWith(
      { path: "users/test-user/careers/c1" },
      { updatedAt: expect.any(Number) },
    );
    expect(commit).toHaveBeenCalledOnce();
    expect(getDoc).not.toHaveBeenCalled();
    expect(getDocs).not.toHaveBeenCalled();
    expect(getDocsFromServer).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it("reutiliza ID profissional vinculado por academyData.id", async () => {
    const historical = player({
      id: "historical-id",
      isAcademy: true,
      academyData: academyPlayer({ status: "promoted" }),
    });
    await AcademyService.promotePlayerToProfessional(
      career({
        clubData: [
          season({ id: "old", players: [historical] }),
          season({ id: "s1", seasonNumber: 2 }),
        ],
      }),
      "s1",
      academyPlayer(),
      "03/08/2024",
    );
    expect(batchSet.mock.calls[1][0]).toEqual({
      path: "users/test-user/careers/c1/seasons/s1/players/historical-id",
    });
  });

  it("duplo submit usa o mesmo path e o mesmo evento de histórico", async () => {
    const input = deepFreeze(academyPlayer());
    await Promise.all([
      AcademyService.promotePlayerToProfessional(
        career({ clubData: [season()] }),
        "s1",
        input,
        "03/08/2024",
      ),
      AcademyService.promotePlayerToProfessional(
        career({ clubData: [season()] }),
        "s1",
        input,
        "03/08/2024",
      ),
    ]);
    expect(batchSet.mock.calls[0]).toEqual(batchSet.mock.calls[2]);
    expect(batchSet.mock.calls[1]).toEqual(batchSet.mock.calls[3]);
    expect(commit).toHaveBeenCalledTimes(2);
  });

  it("falha do batch não muda o snapshot local e permite retry", async () => {
    const input = deepFreeze(academyPlayer());
    const before = structuredClone(input);
    commit.mockRejectedValueOnce(new Error("write-failed"));
    await expect(
      AcademyService.promotePlayerToProfessional(
        career({ clubData: [season()] }),
        "s1",
        input,
        "03/08/2024",
      ),
    ).rejects.toThrow("write-failed");
    expect(input).toEqual(before);
    await expect(
      AcademyService.promotePlayerToProfessional(
        career({ clubData: [season()] }),
        "s1",
        input,
        "03/08/2024",
      ),
    ).resolves.toMatchObject({
      academyPlayer: { status: "promoted" },
      professional: { id: "academy-a1" },
    });
  });

  it("rejeita origem liberada, temporada ausente e IDs vinculados conflitantes", async () => {
    await expect(
      AcademyService.promotePlayerToProfessional(
        career({ clubData: [season()] }),
        "s1",
        academyPlayer({ status: "released" }),
      ),
    ).rejects.toThrow("Origem de promoção inválida");
    await expect(
      AcademyService.promotePlayerToProfessional(career(), "s1", academyPlayer()),
    ).rejects.toThrow("Temporada não encontrada");
    await expect(
      AcademyService.promotePlayerToProfessional(
        career({
          clubData: [
            season({
              players: [
                player({
                  id: "one",
                  isAcademy: true,
                  academyData: academyPlayer(),
                }),
                player({
                  id: "two",
                  isAcademy: true,
                  academyData: academyPlayer(),
                }),
              ],
            }),
          ],
        }),
        "s1",
        academyPlayer(),
      ),
    ).rejects.toThrow("Mais de um profissional");
    expect(writeBatch).not.toHaveBeenCalled();
  });
});
