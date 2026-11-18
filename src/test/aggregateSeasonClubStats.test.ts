import { describe, it, expect } from "vitest";
import { aggregateSeasonClubStats } from "../layout/SectionView/features/ClubTabs/StatsTab_Club/helpers/aggregateSeasonClubStats";
import { Match } from "../common/interfaces/Match";
import { Players } from "../common/interfaces/playersInfo/players";
import { SavedLineup } from "../common/interfaces/Lineup";
import { player, stat } from "./factories/domain";

describe("aggregateSeasonClubStats - SavedLineup & Resiliência", () => {
  const clubName = "FC Barcelona";

  it("não lança TypeError quando match.lineup é um objeto SavedLineup e o atleta não está mais no elenco", () => {
    const savedLineup: SavedLineup = {
      formation: "4-3-3",
      goalkeeper: {
        slotId: "gk",
        playerId: "ter-stegen",
        playerName: "Marc-André ter Stegen",
      },
      lines: [
        {
          slotId: "rw",
          playerId: "lamine-yamal",
          playerName: "Lamine Yamal",
        },
        {
          slotId: "st",
          playerId: "deleted-player-id",
          playerName: "Ex Atleta do Barça",
        },
      ],
      bench: [
        {
          slotId: "b1",
          playerId: "pedri",
          playerName: "Pedri",
        },
      ],
    };

    const mockMatch: Match = {
      matchesId: "match-barca-1",
      date: "15/09/2024",
      league: "La Liga",
      homeTeam: "FC Barcelona",
      awayTeam: "Sevilla",
      homeScore: 3,
      awayScore: 0,
      result: "V",
      status: "FINISHED",
      lineup: savedLineup,
      playerStats: [
        stat({
          playerId: "deleted-player-id", // Atleta excluído/não mais em players
          goals: 1,
          assists: 0,
          rating: 8.5,
          minutesPlayed: 70,
        }),
        stat({
          playerId: "lamine-yamal",
          goals: 2,
          assists: 1,
          rating: 9.5,
          minutesPlayed: 90,
        }),
      ],
    };

    const activePlayers: Players[] = [
      player({
        id: "lamine-yamal",
        name: "Lamine Yamal",
        age: 17,
        overall: 84,
        position: "RW",
        sector: "Ataque",
        nation: "ESP",
      }),
    ];

    // Não deve lançar: TypeError: match.lineup.find is not a function
    expect(() => {
      const result = aggregateSeasonClubStats({
        players: activePlayers,
        matches: [mockMatch],
        clubName,
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("lamine-yamal");
      expect(result[0].aggregatedLeagues[0].stats.goals).toBe(2);
      expect(result[0].aggregatedLeagues[0].stats.assists).toBe(1);
    }).not.toThrow();
  });

  it("vincula atleta pelo nome a partir do SavedLineup quando o ID difere mas o nome coincide", () => {
    const savedLineup: SavedLineup = {
      formation: "4-3-3",
      goalkeeper: {
        slotId: "gk",
        playerId: "gk-1",
        playerName: "Marc-André ter Stegen",
      },
      lines: [
        {
          slotId: "cm",
          playerId: "temp-pedri-slot-id",
          playerName: "Pedri",
        },
      ],
    };

    const mockMatch: Match = {
      matchesId: "match-barca-2",
      date: "20/09/2024",
      league: "La Liga",
      homeTeam: "FC Barcelona",
      awayTeam: "Valencia",
      homeScore: 2,
      awayScore: 1,
      result: "V",
      status: "FINISHED",
      lineup: savedLineup,
      playerStats: [
        stat({
          playerId: "temp-pedri-slot-id",
          goals: 1,
          assists: 1,
          rating: 9.0,
          minutesPlayed: 90,
        }),
      ],
    };

    const players: Players[] = [
      player({
        id: "pedri-canonical-id",
        name: "Pedri",
        age: 21,
        overall: 87,
        position: "CM",
        sector: "Meia",
        nation: "ESP",
      }),
    ];

    const result = aggregateSeasonClubStats({
      players,
      matches: [mockMatch],
      clubName,
    });

    expect(result.length).toBe(1);
    expect(result[0].id).toBe("pedri-canonical-id");
    expect(result[0].aggregatedLeagues[0].stats.goals).toBe(1);
    expect(result[0].aggregatedLeagues[0].stats.assists).toBe(1);
  });

  it("suporta lineup como array em formatos legado de fixtures", () => {
    const legacyMatch = {
      matchesId: "match-barca-3",
      date: "25/09/2024",
      league: "La Liga",
      homeTeam: "FC Barcelona",
      awayTeam: "Girona",
      homeScore: 1,
      awayScore: 0,
      result: "V",
      status: "FINISHED",
      lineup: [
        {
          id: "gavi-legacy",
          name: "Gavi",
        },
      ],
      playerStats: [
        stat({
          playerId: "gavi-legacy",
          goals: 1,
          assists: 0,
          rating: 8.8,
          minutesPlayed: 90,
        }),
      ],
    } as unknown as Match;

    const players: Players[] = [
      player({
        id: "gavi-canonical",
        name: "Gavi",
        age: 20,
        overall: 83,
        position: "CM",
        sector: "Meia",
        nation: "ESP",
      }),
    ];

    const result = aggregateSeasonClubStats({
      players,
      matches: [legacyMatch],
      clubName,
    });

    expect(result.length).toBe(1);
    expect(result[0].id).toBe("gavi-canonical");
    expect(result[0].aggregatedLeagues[0].stats.goals).toBe(1);
  });
});
