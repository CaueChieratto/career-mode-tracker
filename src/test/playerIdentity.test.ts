import { describe, expect, it } from "vitest";
import {
  getPlayerIdentityKey,
  isSamePlayerId,
} from "../common/utils/playerIdentity";
import { matchesPlayerIdentity } from "../pages/Players/helpers/matchesPlayerIdentity";
import { createSpoofedCareer } from "../pages/Players/helpers/createSpoofedCareer";
import { mapFormDataToPlayerData } from "../common/helpers/Mappers";
import { Career } from "../common/interfaces/Career";
import { ClubData } from "../common/interfaces/club/clubData";
import { Players } from "../common/interfaces/playersInfo/players";
import { Match } from "../common/interfaces/Match";
import { processMatches } from "../layout/SectionView/features/ClubTabs/AllMatchesTab/helpers/processMatches";
import {
  getAggregatedPlayersForCareer,
  augmentSeasonWithMatchStats,
} from "../layout/SectionView/helpers/mergeMatchStats";

describe("Identidade Unificada de Jogadores (playedWithUs)", () => {
  const userCasePlayerSeason1: Players = {
    id: "3dcc9f9a-2d2d-4b81-a4b5-183160864c49",
    name: "Emprestimo",
    nation: "AFG",
    position: "ATA",
    sector: "Ataque",
    age: 25,
    overall: 83,
    salary: 100000,
    playerValue: 33000000,
    shirtNumber: "99",
    sell: true,
    loan: false,
    buy: false,
    incomingLoan: false,
    captain: false,
    contractTime: 2,
    ballonDor: 0,
    statsLeagues: [
      {
        leagueName: "Bundesliga",
        leagueImage: "/images/leagues/germany/bundesliga.png",
        stats: {
          games: 20,
          goals: 20,
          assists: 10,
          rating: 10,
          cleanSheets: 0,
          minutesPlayed: 0,
          defenses: 0,
        },
      },
    ],
    contract: [
      {
        isLoan: true,
        fromClub: "Barracas Central",
        leftClub: "Barracas Central",
        buyValue: 0,
        sellValue: 0,
        dataArrival: new Date("2028-01-01T03:00:00.000Z"),
        dataExit: new Date("2027-07-01T03:00:00.000Z"),
        fullSalary: 200000,
        loanDuration: 2,
        wagePercentage: 50,
      },
    ],
  };

  const userCasePlayerSeason2: Players = {
    id: "c5c1a4bb-b71a-4a50-8918-690d755a2949",
    name: "Emprestimo",
    nation: "AFG",
    position: "ATA",
    sector: "Ataque",
    age: 46,
    overall: 85,
    salary: 400000,
    playerValue: 100000000,
    shirtNumber: "46",
    sell: false,
    loan: false,
    buy: true,
    incomingLoan: false,
    captain: false,
    contractTime: 7,
    ballonDor: 0,
    statsLeagues: [],
    playedWithUs: "3dcc9f9a-2d2d-4b81-a4b5-183160864c49",
    contract: [
      {
        fromClub: "Barracas Central",
        leftClub: "",
        buyValue: 130000000,
        sellValue: 0,
        dataArrival: new Date("2027-08-01T03:00:00.000Z"),
        dataExit: null,
      },
    ],
  };

  it("getPlayerIdentityKey retorna nome e nacionalidade para unificação e playedWithUs como fallback", () => {
    expect(getPlayerIdentityKey(userCasePlayerSeason2)).toBe(
      "emprestimo-afg",
    );
    expect(
      getPlayerIdentityKey({
        id: "custom-id",
        playedWithUs: "3dcc9f9a-2d2d-4b81-a4b5-183160864c49",
      }),
    ).toBe("3dcc9f9a-2d2d-4b81-a4b5-183160864c49");
  });

  it("isSamePlayerId reconhece os dois registros como o mesmo jogador através de playedWithUs", () => {
    expect(isSamePlayerId(userCasePlayerSeason1, userCasePlayerSeason2)).toBe(
      true,
    );
    expect(isSamePlayerId(userCasePlayerSeason2, userCasePlayerSeason1)).toBe(
      true,
    );
    expect(
      isSamePlayerId(
        userCasePlayerSeason2,
        "3dcc9f9a-2d2d-4b81-a4b5-183160864c49",
      ),
    ).toBe(true);
    expect(
      isSamePlayerId(
        "3dcc9f9a-2d2d-4b81-a4b5-183160864c49",
        userCasePlayerSeason2,
      ),
    ).toBe(true);
  });

  it("isSamePlayerId unifica dois jogadores que apontam para o mesmo playedWithUs", () => {
    const playerA = {
      id: "diff-id-1",
      playedWithUs: "canonical-root-id",
    };
    const playerB = {
      id: "diff-id-2",
      playedWithUs: "canonical-root-id",
    };
    expect(isSamePlayerId(playerA, playerB)).toBe(true);
    expect(isSamePlayerId(playerB, playerA)).toBe(true);
  });

  it("matchesPlayerIdentity reconhece vínculo por playedWithUs", () => {
    expect(
      matchesPlayerIdentity(userCasePlayerSeason1, {
        id: userCasePlayerSeason2.id,
        playedWithUs: userCasePlayerSeason2.playedWithUs,
        name: "Different Name",
        nation: "XYZ",
      }),
    ).toBe(true);

    expect(
      matchesPlayerIdentity(userCasePlayerSeason2, {
        id: userCasePlayerSeason1.id,
        name: "Different Name",
        nation: "XYZ",
      }),
    ).toBe(true);
  });

  it("createSpoofedCareer atualiza jogador de temporada unificado por playedWithUs", () => {
    const mockSeason1: ClubData = {
      id: "season-1",
      seasonNumber: 1,
      players: [userCasePlayerSeason1],
    };
    const mockCareer: Career = {
      id: "career-1",
      clubName: "Meu Clube",
      nation: "Alemanha",
      createdAt: new Date(),
      clubData: [mockSeason1],
      trophies: [],
    } as unknown as Career;

    const spoofed = createSpoofedCareer({
      career: mockCareer,
      player: { ...userCasePlayerSeason2, shirtNumber: "99", overall: 85 },
      playerId: userCasePlayerSeason2.id,
      isFromGroup: false,
      isNotSeason: false,
    });

    const updatedSeasonPlayer = spoofed?.clubData[0].players[0];
    expect(updatedSeasonPlayer?.overall).toBe(85);
    expect(updatedSeasonPlayer?.shirtNumber).toBe("99");
  });

  it("mapFormDataToPlayerData extrai playedWithUs do FormData", () => {
    const formData = new FormData();
    formData.append("playerName", "Emprestimo");
    formData.append("overall", "85");
    formData.append("sector", "Ataque");
    formData.append("position", "ATA");
    formData.append("age", "46");
    formData.append("nation", "AFG");
    formData.append("playedWithUs", "3dcc9f9a-2d2d-4b81-a4b5-183160864c49");

    const mockCareer = { createdAt: new Date(), nation: "Alemanha" } as Career;
    const mockSeason = { seasonNumber: 2 } as ClubData;

    const playerData = mapFormDataToPlayerData(
      formData,
      mockCareer,
      mockSeason,
    );
    expect(playerData.playedWithUs).toBe(
      "3dcc9f9a-2d2d-4b81-a4b5-183160864c49",
    );
  });

  it("mapFormDataToPlayerData preserva playedWithUs original do jogador caso formData não passe campo", () => {
    const formData = new FormData();
    formData.append("playerName", "Emprestimo");
    formData.append("overall", "85");

    const mockCareer = { createdAt: new Date(), nation: "Alemanha" } as Career;
    const mockSeason = { seasonNumber: 2 } as ClubData;

    const playerData = mapFormDataToPlayerData(
      formData,
      mockCareer,
      mockSeason,
      userCasePlayerSeason2,
    );
    expect(playerData.playedWithUs).toBe(
      "3dcc9f9a-2d2d-4b81-a4b5-183160864c49",
    );
  });

  it("processMatches agrega partidas de ambas as versões do jogador quando matchingPlayerIds é fornecido", () => {
    const matchSeason1: Match = {
      matchesId: "m1",
      date: "01/08/25",
      homeTeam: "Barracas Central",
      awayTeam: "Boca Juniors",
      status: "FINISHED",
      playerStats: [
        {
          playerId: userCasePlayerSeason1.id,
          name: "Emprestimo",
          minutesPlayed: 90,
          goals: 1,
        },
      ],
    } as unknown as Match;

    const matchSeason2: Match = {
      matchesId: "m2",
      date: "01/09/26",
      homeTeam: "Barracas Central",
      awayTeam: "River Plate",
      status: "FINISHED",
      playerStats: [
        {
          playerId: userCasePlayerSeason2.id,
          name: "Emprestimo",
          minutesPlayed: 90,
          goals: 2,
        },
      ],
    } as unknown as Match;

    const mockCareer: Career = {
      id: "career-1",
      clubName: "Barracas Central",
      nation: "Argentina",
      createdAt: new Date(),
      clubData: [
        { id: "s1", seasonNumber: 1, matches: [matchSeason1] },
        { id: "s2", seasonNumber: 2, matches: [matchSeason2] },
      ],
    } as unknown as Career;

    const matchingPlayerIds = new Set<string>([
      userCasePlayerSeason2.id,
      userCasePlayerSeason2.playedWithUs!,
    ]);

    const result = processMatches({
      season: mockCareer.clubData[1],
      career: mockCareer,
      isGeralPage: true,
      activeTab: "FINISHED",
      selectedMonth: "Tudo",
      playerId: userCasePlayerSeason2.id,
      matchingPlayerIds,
    });

    expect(result.length).toBe(2);
    expect(result.map((m) => m.matchesId)).toContain("m1");
    expect(result.map((m) => m.matchesId)).toContain("m2");
  });

  it("caso Martín Luciano: agrega corretamente as estatísticas das duas passagens", () => {
    const lucianoS1: Players = {
      id: "cb46f525-e84c-44d7-b604-89ee8c28f860",
      name: "Martín Luciano",
      nation: "ARG",
      position: "LE",
      sector: "Defesa",
      age: 22,
      overall: 66,
      salary: 4100,
      playerValue: 1400000,
      shirtNumber: "3",
      sell: true,
      loan: false,
      buy: false,
      incomingLoan: false,
      captain: false,
      contractTime: 2,
      ballonDor: 0,
      statsLeagues: [
        {
          leagueName: "Torneo Apertura",
          leagueImage: "/images/leagues/argentina/ligaArgentina.png",
          stats: {
            games: 17,
            goals: 1,
            assists: 1,
            cleanSheets: 12,
            rating: 7.06,
            minutesPlayed: 1315,
            defenses: 0,
          },
          ratingSum: 120,
        },
      ],
      contract: [],
      manualStatsLeagues: [],
      _isAugmented: true,
    } as unknown as Players & { _isAugmented?: boolean };

    const lucianoS2: Players = {
      id: "a10c429c-2a32-481c-962e-2ee4e15873f1",
      name: "Martín Luciano",
      nation: "ARG",
      position: "LE",
      sector: "Defesa",
      age: 22,
      overall: 68,
      salary: 4100,
      playerValue: 1200000,
      shirtNumber: "3",
      sell: false,
      loan: false,
      buy: false,
      incomingLoan: true,
      captain: false,
      contractTime: 1,
      ballonDor: 0,
      contract: [],
      playedWithUs: "cb46f525-e84c-44d7-b604-89ee8c28f860",
      statsLeagues: [
        {
          leagueName: "Torneo Clausura",
          leagueImage: "/images/leagues/argentina/ligaArgentina.png",
          stats: {
            games: 15,
            goals: 0,
            assists: 1,
            cleanSheets: 7,
            rating: 6.5,
            minutesPlayed: 768,
            defenses: 0,
          },
          ratingSum: 97.5,
        },
      ],
      manualStatsLeagues: [],
      _isAugmented: true,
    } as unknown as Players & { _isAugmented?: boolean };

    expect(getPlayerIdentityKey(lucianoS1)).toBe("martín luciano-arg");
    expect(getPlayerIdentityKey(lucianoS2)).toBe("martín luciano-arg");
    expect(isSamePlayerId(lucianoS1, lucianoS2)).toBe(true);
    expect(isSamePlayerId("cb46f525-e84c-44d7-b604-89ee8c28f860", lucianoS2)).toBe(true);

    const mockCareer: Career = {
      id: "career-arg",
      clubName: "Barracas Central",
      nation: "Argentina",
      createdAt: new Date(),
      clubData: [
        { id: "s1", seasonNumber: 1, players: [lucianoS1], matches: [] },
        { id: "s2", seasonNumber: 2, players: [lucianoS2], matches: [] },
      ],
    } as unknown as Career;

    const aggregated = getAggregatedPlayersForCareer(mockCareer);
    expect(aggregated.length).toBe(1);
    expect(aggregated[0].name).toBe("Martín Luciano");
    expect(aggregated[0].overall).toBe(68);

    const totalGames = aggregated[0].statsLeagues.reduce(
      (sum, l) => sum + (l.stats.games || 0),
      0,
    );
    const totalMinutes = aggregated[0].statsLeagues.reduce(
      (sum, l) => sum + (l.stats.minutesPlayed || 0),
      0,
    );
    expect(totalGames).toBe(32); // 17 + 15
    expect(totalMinutes).toBe(2083); // 1315 + 768

    // Preservação de dados ao mapear formData em edição
    const formData = new FormData();
    formData.append("playerName", "Martín Luciano");
    formData.append("overall", "68");
    const mapped = mapFormDataToPlayerData(
      formData,
      mockCareer,
      mockCareer.clubData[1],
      lucianoS2,
    );
    expect(mapped.statsLeagues).toEqual(lucianoS2.statsLeagues);
    expect(mapped.playedWithUs).toBe(lucianoS2.playedWithUs);

    // Quando ambos estão na mesma temporada, a versão antiga vendida é omitida e apenas a versão ativa (com 32 jogos) aparece
    const sameSeason: ClubData = {
      id: "s-same",
      seasonNumber: 1,
      players: [lucianoS1, lucianoS2],
      matches: [],
    } as unknown as ClubData;

    const augmentedSameSeason = augmentSeasonWithMatchStats(
      sameSeason,
      "Barracas Central",
    );
    expect(augmentedSameSeason.players.length).toBe(1);
    expect(augmentedSameSeason.players[0].id).toBe(lucianoS2.id);
    expect(augmentedSameSeason.players[0].overall).toBe(68);
  });
});
