import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPromotedPlayer } from "../pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPromotedPlayer";
import { buildPlayerAcademyTournaments } from "../pages/Academy/layouts/AcademyContent/services/AcademyService/helpers/buildPlayerAcademyTournaments";
import { AcademyService } from "../pages/Academy/layouts/AcademyContent/services/AcademyService";
import type { AcademyTournaments } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";
import { academyPlayer, career, deepFreeze, player, season } from "./factories/domain";
import { getSuggestedLineup } from "../pages/Academy/layouts/AcademyContent/components/Tournament/features/Match/components/ManageMatchView/helpers/getSuggestedLineup";
import { calculatePlayerStats } from "../pages/Academy/layouts/AcademyContent/components/Player/components/PlayerPerformance/helpers/calculatePlayerStats";
import type { AcademyMatches } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyMatches/AcademyMatches";
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

describe("getSuggestedLineup", () => {
  const p1 = academyPlayer({ id: "p1", name: "Jogador 1" });
  const p2 = academyPlayer({ id: "p2", name: "Jogador 2" });
  const p3 = academyPlayer({ id: "p3", name: "Jogador 3" });

  it("primeira partida do torneio retorna lineup vazia", () => {
    const destination: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const matches: AcademyMatches[] = [destination];
    const result = getSuggestedLineup(matches, destination, [p1, p2]);
    expect(result).toEqual([]);
  });

  it("origem correta: reutiliza jogadores da partida cronologicamente anterior mais próxima com lineup não vazia", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
      ],
    };
    const m2: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 2,
      opponentGoals: 1,
      result: "FINISHED",
      lineup: [
        { playerId: "p2", playerName: "Jogador 2", goals: 2, assists: 1, rating: 9, defesas: 0, cleanSheets: 0 },
        { playerId: "p1", playerName: "Jogador 1", goals: 0, assists: 1, rating: 7, defesas: 0, cleanSheets: 0 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m3",
      date: "10/08/2024",
      opponentTeam: "Rival 3",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const matches: AcademyMatches[] = [m1, m2, destination];
    const result = getSuggestedLineup(matches, destination, [p1, p2]);

    expect(result).toEqual([
      { playerId: "p2", playerName: "Jogador 2", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
      { playerId: "p1", playerName: "Jogador 1", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);
  });

  it("partida futura ignorada mesmo se aparecer antes ou depois no array", () => {
    const futureMatch: AcademyMatches = {
      id: "m_future",
      date: "20/08/2024",
      opponentTeam: "Rival Futuro",
      userGoals: 0,
      opponentGoals: 0,
      result: "SCHEDULED",
      lineup: [
        { playerId: "p3", playerName: "Jogador 3", goals: 0, assists: 0, rating: 6, defesas: 0, cleanSheets: 0 },
      ],
    };
    const pastMatch: AcademyMatches = {
      id: "m_past",
      date: "05/08/2024",
      opponentTeam: "Rival Passado",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m_target",
      date: "10/08/2024",
      opponentTeam: "Rival Atual",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const matches: AcademyMatches[] = [futureMatch, pastMatch, destination];
    const result = getSuggestedLineup(matches, destination, [p1, p2, p3]);

    expect(result).toEqual([
      { playerId: "p1", playerName: "Jogador 1", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);
  });

  it("origem vazia intermediária é ignorada buscando a anterior com lineup não vazia", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
      ],
    };
    const m2Empty: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [],
    };
    const destination: AcademyMatches = {
      id: "m3",
      date: "10/08/2024",
      opponentTeam: "Rival 3",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const matches: AcademyMatches[] = [m1, m2Empty, destination];
    const result = getSuggestedLineup(matches, destination, [p1, p2]);

    expect(result).toEqual([
      { playerId: "p1", playerName: "Jogador 1", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);
  });

  it("identidade allowlist e todas as estatísticas são null (sem herdar campos de jogo ou stats)", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 3,
      opponentGoals: 2,
      userPenalties: 5,
      opponentPenalties: 4,
      status: "Final",
      result: "FINISHED",
      lineup: [
        {
          playerId: "p1",
          playerName: "Nome Antigo",
          goals: 3,
          assists: 2,
          rating: 10,
          defesas: 5,
          cleanSheets: 0,
        },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const currentP1 = academyPlayer({ id: "p1", name: "Nome Atualizado" });
    const result = getSuggestedLineup([m1, destination], destination, [currentP1]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      playerId: "p1",
      playerName: "Nome Atualizado",
      goals: null,
      assists: null,
      rating: null,
      defesas: null,
      cleanSheets: null,
    });
    expect(Object.keys(result[0]).sort()).toEqual([
      "assists",
      "cleanSheets",
      "defesas",
      "goals",
      "playerId",
      "playerName",
      "rating",
    ].sort());
  });

  it("não muta a partida de origem nem os jogadores", () => {
    const m1: AcademyMatches = deepFreeze({
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
      ],
    });
    const destination: AcademyMatches = deepFreeze({
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    });
    const playersList = deepFreeze([p1]);
    const result = getSuggestedLineup([m1, destination], destination, playersList);
    expect(result).toHaveLength(1);
  });

  it("empate de datas usa critério determinístico de índice anterior no array", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "05/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
      ],
    };
    const m2: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p2", playerName: "Jogador 2", goals: 0, assists: 0, rating: 7, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m3",
      date: "05/08/2024",
      opponentTeam: "Rival 3",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const matches: AcademyMatches[] = [m1, m2, destination];
    const result = getSuggestedLineup(matches, destination, [p1, p2]);

    expect(result).toEqual([
      { playerId: "p2", playerName: "Jogador 2", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);
  });

  it("destino com lineup já existente não é sobrescrito", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [
        { playerId: "p2", playerName: "Jogador 2", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
      ],
      result: "SCHEDULED",
    };
    const result = getSuggestedLineup([m1, destination], destination, [p1, p2]);
    expect(result).toEqual([]);
  });

  it("destino FINISHED retorna vazio e não é reinicializado", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 1,
      opponentGoals: 0,
      lineup: [],
      result: "FINISHED",
    };
    const result = getSuggestedLineup([m1, destination], destination, [p1, p2]);
    expect(result).toEqual([]);
  });

  it("filtra atletas com exitDate anterior à partida destino, mas mantém elegíveis na data ou antes da saída", () => {
    const pExited = academyPlayer({
      id: "p_exit",
      name: "Saiu",
      status: "promoted",
      exitDate: "03/08/2024",
    });
    const pStayed = academyPlayer({
      id: "p_stay",
      name: "Ficou",
      status: "academy",
    });
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p_exit", playerName: "Saiu", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
        { playerId: "p_stay", playerName: "Ficou", goals: 0, assists: 1, rating: 7, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destinationAfterExit: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const resultAfter = getSuggestedLineup([m1, destinationAfterExit], destinationAfterExit, [pExited, pStayed]);
    expect(resultAfter).toEqual([
      { playerId: "p_stay", playerName: "Ficou", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);

    const destinationBeforeExit: AcademyMatches = {
      id: "m2_early",
      date: "02/08/2024",
      opponentTeam: "Rival 2 Early",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const resultBefore = getSuggestedLineup([m1, destinationBeforeExit], destinationBeforeExit, [pExited, pStayed]);
    expect(resultBefore).toEqual([
      { playerId: "p_exit", playerName: "Saiu", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
      { playerId: "p_stay", playerName: "Ficou", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);
  });

  it("não semeia atletas não encontrados na lista de jogadores (órfãos)", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "orphan_id", playerName: "Órfão", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
        { playerId: "p1", playerName: "Jogador 1", goals: 0, assists: 0, rating: 7, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const result = getSuggestedLineup([m1, destination], destination, [p1]);
    expect(result).toEqual([
      { playerId: "p1", playerName: "Jogador 1", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);
  });

  it("apenas obter rascunho de lineup não altera a partida destino nem infla agregados em calculatePlayerStats", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 2,
      opponentGoals: 1,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 2, assists: 0, rating: 8, defesas: 0, cleanSheets: 0 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const tournamentData: AcademyTournaments = {
      id: "t1",
      name: "Torneio",
      date: "01/08/2024",
      totalMatches: 2,
      isChampion: false,
      tournamentResult: "Em andamento",
      matches: [m1, destination],
    };

    const suggested = getSuggestedLineup(tournamentData.matches, destination, [p1]);
    expect(suggested).toHaveLength(1);

    // Destination match inside tournamentData remains intact (lineup: [])
    expect(destination.lineup).toEqual([]);

    // Aggregates for p1 must NOT include destination match
    const statsBefore = calculatePlayerStats(p1, [tournamentData]);
    expect(statsBefore.totalStats.matchesPlayed).toBe(1);
    expect(statsBefore.totalStats.totalGoals).toBe(2);
  });

  it("mantém atletas ativos (status academy) mesmo se houver exitDate residual", () => {
    const pActiveWithResidualExit = academyPlayer({
      id: "p_active",
      name: "Ativo Residual",
      status: "academy",
      exitDate: "01/08/2024",
    });
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p_active", playerName: "Ativo Residual", goals: 1, assists: 0, rating: 8, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const result = getSuggestedLineup([m1, destination], destination, [pActiveWithResidualExit]);
    expect(result).toHaveLength(1);
    expect(result[0].playerId).toBe("p_active");
  });

  it("suporta datas com ano de 2 dígitos e espaços ao verificar exitDate e partidas", () => {
    const pPromoted2DigitStay = academyPlayer({
      id: "p_prom_stay",
      name: "Promovido Depois",
      status: "promoted",
      exitDate: "10/08/24",
    });
    const pPromoted2DigitExit = academyPlayer({
      id: "p_prom_exit",
      name: "Promovido Antes",
      status: "promoted",
      exitDate: "03/08/24",
    });
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/24 - 15h",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p_prom_stay", playerName: "Promovido Depois", goals: 0, assists: 0, rating: 7, defesas: 0, cleanSheets: 1 },
        { playerId: "p_prom_exit", playerName: "Promovido Antes", goals: 0, assists: 0, rating: 7, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const result = getSuggestedLineup([m1, destination], destination, [pPromoted2DigitStay, pPromoted2DigitExit]);
    expect(result).toEqual([
      { playerId: "p_prom_stay", playerName: "Promovido Depois", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);
  });

  it("recupera jogador por coerção de ID string/número ou nome quando formato difere", () => {
    const pWithNumberId = academyPlayer({
      id: "101",
      name: "Jogador Número",
      status: "academy",
    });
    const pWithNameMatch = academyPlayer({
      id: "p_new_id",
      name: "Jogador Nome",
      status: "academy",
    });
    const m1: AcademyMatches = {
      id: "m1",
      date: "01/08/2024",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: 101 as unknown as string, playerName: "Jogador Número", goals: 0, assists: 0, rating: 7, defesas: 0, cleanSheets: 1 },
        { playerId: "p_old_id", playerName: "Jogador Nome", goals: 0, assists: 0, rating: 7, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "05/08/2024",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const result = getSuggestedLineup([m1, destination], destination, [pWithNumberId, pWithNameMatch]);
    expect(result).toEqual([
      { playerId: "101", playerName: "Jogador Número", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
      { playerId: "p_new_id", playerName: "Jogador Nome", goals: null, assists: null, rating: null, defesas: null, cleanSheets: null },
    ]);
  });

  it("faz fallback para ordem no array caso datas de partidas sejam inválidas ou sem ano", () => {
    const m1: AcademyMatches = {
      id: "m1",
      date: "data-invalida",
      opponentTeam: "Rival 1",
      userGoals: 1,
      opponentGoals: 0,
      result: "FINISHED",
      lineup: [
        { playerId: "p1", playerName: "Jogador 1", goals: 0, assists: 0, rating: 7, defesas: 0, cleanSheets: 1 },
      ],
    };
    const destination: AcademyMatches = {
      id: "m2",
      date: "outra-data-invalida",
      opponentTeam: "Rival 2",
      userGoals: 0,
      opponentGoals: 0,
      lineup: [],
      result: "SCHEDULED",
    };
    const result = getSuggestedLineup([m1, destination], destination, [p1]);
    expect(result).toHaveLength(1);
    expect(result[0].playerId).toBe("p1");
  });
});

