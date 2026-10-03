import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  shouldConnectEmulator,
  resetEmulatorGuardState,
} from "../common/services/Firebase/emulatorGuard";
import {
  getPlayerIdentityKey,
  isSamePlayerId,
  matchPlayerStatToPlayer,
} from "../common/utils/playerIdentity";
import { ServiceSeasons } from "../common/services/ServiceSeasons";
import { ServiceCareer } from "../common/services/ServiceCareer";
import {
  updateCareerFirestore,
  updateCareerTrophies,
} from "../common/helpers/Setters";
import { getCareerById } from "../common/helpers/Getters";
import { auth } from "./mocks/firebaseClient";
import { getDoc } from "./mocks/firestore";
import { career, season, player, leagueStats } from "./factories/domain";
import { getAggregatedPlayersForCareer } from "../layout/SectionView/helpers/mergeMatchStats";
import { aggregatePlayerStats } from "../common/services/ServicePlayers/helpers/statsHelpers";
import type { Career } from "../common/interfaces/Career";
import type { Players } from "../common/interfaces/playersInfo/players";

vi.mock("../common/helpers/Getters", () => ({
  getCareerById: vi.fn(),
  getAllCareers: vi.fn(),
}));

vi.mock("../common/helpers/Setters", () => ({
  updateCareerFirestore: vi.fn().mockResolvedValue(undefined),
  updateCareerTrophies: vi.fn().mockResolvedValue(undefined),
}));

describe("1. Emulator Guard — Aviso único em domínios remotos", () => {
  beforeEach(() => {
    resetEmulatorGuardState();
    vi.restoreAllMocks();
  });

  it("emite o aviso de bloqueio no console apenas uma vez mesmo em múltiplas checagens", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // 1ª chamada em domínio remoto com flag ativada
    const res1 = shouldConnectEmulator(
      "true",
      "carrer-mode-tracker.vercel.app",
    );
    expect(res1).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("carrer-mode-tracker.vercel.app"),
    );

    // 2ª e 3ª chamadas não devem emitir novo warning
    const res2 = shouldConnectEmulator(
      "true",
      "carrer-mode-tracker.vercel.app",
    );
    const res3 = shouldConnectEmulator(
      "true",
      "carrer-mode-tracker.vercel.app",
    );
    expect(res2).toBe(false);
    expect(res3).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Após reset de estado, emite novamente
    resetEmulatorGuardState();
    shouldConnectEmulator("true", "carrer-mode-tracker.vercel.app");
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});

describe("2. Identidade Canônica de Jogadores (playerIdentity)", () => {
  it("unifica jogador da base promovido pelo nome + nacionalidade", () => {
    const rawAcademyPlayer = player({
      id: "a1",
      name: "Gabriel Menino",
      nation: "Brasil",
      isAcademy: true,
    });
    const promotedPlayer = player({
      id: "academy-a1",
      name: "Gabriel Menino",
      nation: "Brasil",
    });

    expect(getPlayerIdentityKey(rawAcademyPlayer)).toBe(
      "gabriel menino-brasil",
    );
    expect(getPlayerIdentityKey(promotedPlayer)).toBe("gabriel menino-brasil");

    expect(isSamePlayerId("a1", "academy-a1")).toBe(true);
    expect(isSamePlayerId("academy-a1", "a1")).toBe(true);
    expect(isSamePlayerId("a1", "a1")).toBe(true);
    expect(isSamePlayerId("academy-a1", "academy-a1")).toBe(true);
    expect(isSamePlayerId(rawAcademyPlayer, promotedPlayer)).toBe(true);
  });

  it("garante que para a carreira 'save-1786982104992' a chave seja estritamente nome + nacionalidade", () => {
    const palomino = player({
      id: "p-palomino-1",
      name: "Palomino",
      nation: "Argentina",
      playedWithUs: "some-custom-token",
    });

    const key = getPlayerIdentityKey(palomino, "save-1786982104992");
    expect(key).toBe("palomino-argentina");
  });

  it("diferencia jogadores com mesmo nome mas nacionalidades distintas", () => {
    const playerA = player({
      id: "silva-1",
      name: "Lucas Silva",
      nation: "Brasil",
    });
    const playerB = player({
      id: "silva-2",
      name: "Lucas Silva",
      nation: "Portugal",
    });

    expect(getPlayerIdentityKey(playerA)).toBe("lucas silva-brasil");
    expect(getPlayerIdentityKey(playerB)).toBe("lucas silva-portugal");
    expect(getPlayerIdentityKey(playerA)).not.toBe(
      getPlayerIdentityKey(playerB),
    );

    expect(isSamePlayerId(playerA.id, playerB.id)).toBe(false);
    expect(isSamePlayerId(playerA, playerB)).toBe(false);
  });

  it("matchPlayerStatToPlayer correlaciona estatísticas de partida e ficha mesmo com 'academy-'", () => {
    const promoted = player({ id: "academy-a5", name: "Endrick" });
    const playersList = [promoted];

    expect(matchPlayerStatToPlayer("a5", playersList)).toBe(promoted);
    expect(matchPlayerStatToPlayer("academy-a5", playersList)).toBe(promoted);
    expect(matchPlayerStatToPlayer("a6", playersList)).toBeUndefined();
  });
});

describe("3. SeasonConfig — Persistência Rápida e Atômica", () => {
  beforeEach(() => {
    auth.currentUser = { uid: "test-user" };
    vi.mocked(getCareerById).mockReset();
    vi.mocked(updateCareerFirestore).mockReset().mockResolvedValue(undefined);
    vi.mocked(updateCareerTrophies).mockReset().mockResolvedValue(undefined);
    getDoc.mockReset();
  });

  it("updateSeasonLeagues lê diretamente o documento e NÃO chama getCareerById (evita N+1)", async () => {
    const mockLeague = {
      name: "Premier League",
      trophy: "pl.png",
      logo: "pl.png",
    };
    const newLeagues = [
      { name: "La Liga", trophy: "laliga.png", logo: "laliga.png" },
      { name: "Copa del Rey", trophy: "copa.png", logo: "copa.png" },
    ];
    const mockSeason = season({ id: "s1", leagues: [mockLeague] });
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        clubData: [mockSeason],
        updatedAt: 1000,
      }),
    });

    await ServiceSeasons.updateSeasonLeagues("c1", "s1", newLeagues);

    // Garante que não usou getCareerById que hidrataria todas as partidas/jogadores
    expect(getCareerById).not.toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalledTimes(1);

    // Garante que salvou com as ligas atualizadas
    expect(updateCareerFirestore).toHaveBeenCalledTimes(1);
    expect(updateCareerFirestore).toHaveBeenCalledWith(
      "test-user",
      "c1",
      expect.objectContaining({
        clubData: [
          expect.objectContaining({
            id: "s1",
            leagues: newLeagues,
          }),
        ],
      }),
    );
  });

  it("saveClubTrophies salva múltiplos troféus em operação única atômica", async () => {
    const seasonsList = [season({ id: "s1" }), season({ id: "s2" })];
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        clubData: seasonsList,
        trophies: [],
      }),
    });

    await ServiceCareer.saveClubTrophies(
      "c1",
      ["Champions League", "Premier League"],
      ["s1", "s2"],
    );

    // Garante que não fez N leituras com getCareerById
    expect(getCareerById).not.toHaveBeenCalled();
    // Garante que chamou updateCareerTrophies uma única vez para todos os troféus
    expect(updateCareerTrophies).toHaveBeenCalledTimes(1);
    expect(updateCareerTrophies).toHaveBeenCalledWith(
      "test-user",
      "c1",
      expect.arrayContaining([
        expect.objectContaining({ leagueName: "Champions League" }),
        expect.objectContaining({ leagueName: "Premier League" }),
      ]),
    );
  });

  it("alterar ligas da T1 afeta exclusivamente a T1 e não altera a T2", async () => {
    const leagueX = { name: "Liga X", trophy: "x.png", logo: "x.png" };
    const leagueY = { name: "Liga Y", trophy: "y.png", logo: "y.png" };
    const leagueZ = { name: "Liga Z", trophy: "z.png", logo: "z.png" };

    const season1 = season({
      id: "s1",
      seasonNumber: 1,
      leagues: [leagueX, leagueY],
    });
    const season2 = season({
      id: "s2",
      seasonNumber: 2,
      leagues: [leagueX, leagueY],
    });

    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        clubData: [season1, season2],
        updatedAt: 1000,
      }),
    });

    // Usuário altera ligas da T2 removendo ligaY e adicionando ligaZ
    await ServiceSeasons.updateSeasonLeagues("c1", "s2", [leagueX, leagueZ]);

    expect(updateCareerFirestore).toHaveBeenCalledWith(
      "test-user",
      "c1",
      expect.objectContaining({
        clubData: [
          // T1 deve permanecer com [leagueX, leagueY] intactas!
          expect.objectContaining({ id: "s1", leagues: [leagueX, leagueY] }),
          // T2 foi atualizada para [leagueX, leagueZ]
          expect.objectContaining({ id: "s2", leagues: [leagueX, leagueZ] }),
        ],
      }),
    );
  });
});

describe("4. GroupCareer e Estatísticas de Jogadores (Resolução da Multiplicação de Stats)", () => {
  it("deduplica temporadas clonadas consecutivas mantendo stats reais corretas (Palomino 35 jogos e não 140)", () => {
    // Cenário idêntico ao da carreira save-1786982104992:
    // Palomino possui 4 temporadas. As temporadas 2, 3 e 4 foram criadas clonando a temporada anterior.
    const palominoStats = [
      leagueStats(
        { games: 35, goals: 30, assists: 10, rating: 8.5 },
        "Champions League",
      ),
      leagueStats(
        { games: 1, goals: 1, assists: 0, rating: 7.0 },
        "Liga Portugal",
      ),
    ];

    const s1 = season({
      id: "s1",
      seasonNumber: 1,
      players: [
        player({
          name: "Palomino",
          nation: "Argentina",
          statsLeagues: palominoStats,
        }),
      ],
    });
    const s2 = season({
      id: "s2",
      seasonNumber: 2,
      players: [
        player({
          name: "Palomino",
          nation: "Argentina",
          statsLeagues: palominoStats,
        }),
      ],
    });
    const s3 = season({
      id: "s3",
      seasonNumber: 3,
      players: [
        player({
          name: "Palomino",
          nation: "Argentina",
          statsLeagues: palominoStats,
        }),
      ],
    });
    const s4 = season({
      id: "s4",
      seasonNumber: 4,
      players: [
        player({
          name: "Palomino",
          nation: "Argentina",
          statsLeagues: palominoStats,
        }),
      ],
    });

    const c: Career = career({
      id: "save-1786982104992",
      clubData: [s1, s2, s3, s4],
    });

    const aggregated = getAggregatedPlayersForCareer(c);
    expect(aggregated).toHaveLength(1);
    const palomino = aggregated[0];

    const clStats = palomino.statsLeagues.find(
      (l) => l.leagueName === "Champions League",
    );
    const lpStats = palomino.statsLeagues.find(
      (l) => l.leagueName === "Liga Portugal",
    );

    // Deve resultar em exatamente 35 jogos e 30 gols (Imagem 2), NÃO 140 jogos e 120 gols (Imagem 1 com erro)
    expect(clStats?.stats.games).toBe(35);
    expect(clStats?.stats.goals).toBe(30);
    expect(lpStats?.stats.games).toBe(1);
    expect(lpStats?.stats.goals).toBe(1);
  });

  it("soma corretamente estatísticas distintas quando o jogador realmente jogou em múltiplas temporadas", () => {
    const s1 = season({
      id: "s1",
      seasonNumber: 1,
      players: [
        player({
          name: "Gabriel",
          nation: "Brasil",
          statsLeagues: [leagueStats({ games: 10, goals: 5 }, "Brasileirão")],
        }),
      ],
    });
    const s2 = season({
      id: "s2",
      seasonNumber: 2,
      players: [
        player({
          name: "Gabriel",
          nation: "Brasil",
          statsLeagues: [leagueStats({ games: 15, goals: 8 }, "Brasileirão")],
        }),
      ],
    });

    const c: Career = career({
      id: "c1",
      clubData: [s1, s2],
    });

    const aggregated = getAggregatedPlayersForCareer(c);
    expect(aggregated).toHaveLength(1);
    const gabriel = aggregated[0];

    // Estatísticas legítimas de temporadas distintas se somam normalmente: 10 + 15 = 25
    expect(gabriel.statsLeagues[0].stats.games).toBe(25);
    expect(gabriel.statsLeagues[0].stats.goals).toBe(13);
  });

  it("agrega histórico de jogador promovido da base da temporada 1 para temporada 2 sem duplicá-lo", () => {
    const season1Player = player({
      id: "a1",
      name: "Estêvão",
      nation: "Brasil",
      isAcademy: true,
      overall: 70,
      statsLeagues: [leagueStats({ games: 5, goals: 3, rating: 7.5 })],
    });
    const season2Player = player({
      id: "academy-a1",
      name: "Estêvão",
      nation: "Brasil",
      overall: 78,
      statsLeagues: [leagueStats({ games: 10, goals: 8, rating: 8.0 })],
    });

    const c: Career = career({
      clubData: [
        season({ id: "s1", seasonNumber: 1, players: [season1Player] }),
        season({ id: "s2", seasonNumber: 2, players: [season2Player] }),
      ],
    });

    const aggregated = getAggregatedPlayersForCareer(c);
    expect(aggregated).toHaveLength(1);
    expect(aggregated[0].name).toBe("Estêvão");
    expect(aggregated[0].overall).toBe(78); // Última temporada
    expect(aggregated[0].statsLeagues[0].stats.games).toBe(15);
    expect(aggregated[0].statsLeagues[0].stats.goals).toBe(11);
  });

  it("não funde jogadores de nacionalidades distintas mesmo que tenham o mesmo nome", () => {
    const p1 = player({
      id: "p1",
      name: "Gabriel",
      nation: "Brasil",
      statsLeagues: [leagueStats({ goals: 2 })],
    });
    const p2 = player({
      id: "p2",
      name: "Gabriel",
      nation: "Argentina",
      statsLeagues: [leagueStats({ goals: 5 })],
    });

    const c: Career = career({
      clubData: [season({ players: [p1, p2] })],
    });

    const aggregated = getAggregatedPlayersForCareer(c);
    expect(aggregated).toHaveLength(2);
    expect(
      aggregated.find((p) => p.nation === "Brasil")?.statsLeagues[0].stats
        .goals,
    ).toBe(2);
    expect(
      aggregated.find((p) => p.nation === "Argentina")?.statsLeagues[0].stats
        .goals,
    ).toBe(5);
  });

  it("aggregatePlayerStats unifica histórico com chaves canônicas de jogador da base promovido", () => {
    const s1Player = player({
      id: "a10",
      name: "Endrick",
      nation: "Brasil",
      isAcademy: true,
      overall: 70,
      statsLeagues: [
        leagueStats({ games: 10, goals: 6, assists: 2, rating: 7.0 }),
      ],
    });
    const s2Player = player({
      id: "academy-a10",
      name: "Endrick",
      nation: "Brasil",
      overall: 80,
      statsLeagues: [
        leagueStats({ games: 15, goals: 12, assists: 4, rating: 8.0 }),
      ],
    });

    const key1 = getPlayerIdentityKey(s1Player);
    const key2 = getPlayerIdentityKey(s2Player);
    expect(key1).toBe("endrick-brasil");
    expect(key2).toBe("endrick-brasil");

    const historyMap = new Map<string, Players[]>();
    historyMap.set(key1, [s1Player, s2Player]);

    const groupStats = aggregatePlayerStats(historyMap);
    expect(groupStats).toHaveLength(1);
    expect(groupStats[0].name).toBe("Endrick");
    expect(groupStats[0].overall).toBe(80); // Preserva o maior overall
    expect(groupStats[0].statsLeagues[0].stats.games).toBe(25);
    expect(groupStats[0].statsLeagues[0].stats.goals).toBe(18);
    expect(groupStats[0].statsLeagues[0].stats.assists).toBe(6);
  });

  it("unifica jogador de base com 'nationality' e jogador promovido com 'nation' (resolvendo caso Libertadores + DFB-Pokal + CL)", () => {
    // Caso real do usuário: Jogador 'Base' (overall 89)
    // Clube 1 (onde jogou Libertadores): objeto tem nationality: 'Brasil'
    // Clube 2 (onde jogou DFB-Pokal e CL): objeto tem nation: 'Brasil'
    const playerClub1 = {
      id: "a1",
      name: "Base",
      nationality: "Brasil",
      overall: 75,
      isAcademy: true,
      statsLeagues: [
        leagueStats(
          { games: 30, goals: 52, assists: 50, rating: 10 },
          "Libertadores",
        ),
      ],
    } as unknown as Players;

    const playerClub2 = player({
      id: "academy-a1",
      name: "Base",
      nation: "Brasil",
      overall: 89,
      statsLeagues: [
        leagueStats(
          { games: 30, goals: 20, assists: 20, rating: 10 },
          "DFB-Pokal",
        ),
        leagueStats(
          { games: 8, goals: 8, assists: 10, rating: 10 },
          "Champions League",
        ),
      ],
    });

    const key1 = getPlayerIdentityKey(playerClub1);
    const key2 = getPlayerIdentityKey(playerClub2);

    expect(key1).toBe("base-brasil");
    expect(key2).toBe("base-brasil");
    expect(key1).toBe(key2);

    const historyMap = new Map<string, Players[]>();
    historyMap.set(key1, [playerClub1, playerClub2]);

    const aggregated = aggregatePlayerStats(historyMap);
    expect(aggregated).toHaveLength(1);
    const resultPlayer = aggregated[0];

    expect(resultPlayer.name).toBe("Base");
    expect(resultPlayer.overall).toBe(89); // Preserva o overall máximo (89)

    // Confere se as 3 ligas estão presentes (Libertadores, DFB-Pokal, Champions League)
    const libertadores = resultPlayer.statsLeagues.find(
      (l) => l.leagueName === "Libertadores",
    );
    const dfbPokal = resultPlayer.statsLeagues.find(
      (l) => l.leagueName === "DFB-Pokal",
    );
    const cl = resultPlayer.statsLeagues.find(
      (l) => l.leagueName === "Champions League",
    );

    expect(libertadores).toBeDefined();
    expect(libertadores?.stats.games).toBe(30);

    expect(dfbPokal).toBeDefined();
    expect(dfbPokal?.stats.games).toBe(30);

    expect(cl).toBeDefined();
    expect(cl?.stats.games).toBe(8);

    // Total de jogos profissionais: 30 + 30 + 8 = 68 jogos (Imagem 1)
    const totalGames = resultPlayer.statsLeagues.reduce(
      (acc, l) => acc + (l.stats.games || 0),
      0,
    );
    expect(totalGames).toBe(68);
  });

  it("agrega todos os jogadores de todas as carreiras do grupo, inclusive os que jogaram em apenas um clube", () => {
    // Jogador A jogou apenas no Clube 1
    const playerA = player({
      id: "pA",
      name: "Jogador Único Clube 1",
      nation: "Brasil",
      statsLeagues: [leagueStats({ games: 10, goals: 5 }, "Brasileirão")],
    });

    // Jogador B jogou apenas no Clube 2
    const playerB = player({
      id: "pB",
      name: "Jogador Único Clube 2",
      nation: "Alemanha",
      statsLeagues: [leagueStats({ games: 20, goals: 12 }, "Bundesliga")],
    });

    // Jogador C jogou em ambos os clubes
    const playerC1 = player({
      id: "pC1",
      name: "Jogador Comum",
      nation: "França",
      statsLeagues: [leagueStats({ games: 5, goals: 1 }, "Ligue 1")],
    });
    const playerC2 = player({
      id: "pC2",
      name: "Jogador Comum",
      nation: "França",
      statsLeagues: [leagueStats({ games: 15, goals: 4 }, "Premier League")],
    });

    const historyMap = new Map<string, Players[]>();
    historyMap.set(getPlayerIdentityKey(playerA), [playerA]);
    historyMap.set(getPlayerIdentityKey(playerB), [playerB]);
    historyMap.set(getPlayerIdentityKey(playerC1), [playerC1, playerC2]);

    const result = aggregatePlayerStats(historyMap);

    // Deve conter TODOS os 3 jogadores, e não apenas o Jogador C que jogou em múltiplos clubes
    expect(result).toHaveLength(3);
    expect(result.some((p) => p.name === "Jogador Único Clube 1")).toBe(true);
    expect(result.some((p) => p.name === "Jogador Único Clube 2")).toBe(true);
    expect(result.some((p) => p.name === "Jogador Comum")).toBe(true);
  });
});
