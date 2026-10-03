import { describe, it, expect } from "vitest";
import { buildPlayerCopyText } from "../pages/Academy/layouts/AcademyContent/components/Player/views/PlayerWorkspace/helpers/buildPlayerCopyText";
import { AcademyPlayers } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyTournaments } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";
import { Career } from "../common/interfaces/Career";

describe("buildPlayerCopyText", () => {
  const mockPlayer: AcademyPlayers = {
    id: "p1",
    name: "Jamie Ibarra",
    position: "PD",
    age: 17,
    nationality: "URU",
    height: 173,
    weight: 69,
    overall: 67,
    potential: 85,
    status: "academy",
    evolutionHistory: [],
    shirtNumber: 7,
  };

  const mockCareer: Career = {
    id: "c1",
    clubName: "Newell’s Old Boys",
    managerName: "Manager",
    createdAt: new Date("2024-01-01"),
    teamBadge: "",
    nation: "Argentina",
    colorsTeams: [],
    trophies: [],
    clubData: [],
    academy: {
      name: "Academia Newell's",
      tournament: "Copa Jorge Griffa",
      nickname: "La Lepra",
    },
  };

  it("formata exatamente o exemplo solicitado pelo usuário", () => {
    // 20 Jogos, 23 G/A, 14 Gols, 9 Assistências, 6.97, Campeão 3 vezes de Copa Jorge Griffa.
    const tournaments: AcademyTournaments[] = [];

    // Create 3 champion tournaments with matches summing to 20 matches, 14 goals, 9 assists, rating ~6.97
    // Total rating needed: 20 * 6.97 = 139.4. e.g. 14 matches with 7.0 and 6 matches with 6.9 => 14*7 + 6*6.9 = 98 + 41.4 = 139.4 / 20 = 6.97
    let matchCount = 0;
    for (let t = 1; t <= 3; t++) {
      const matches = [];
      const matchesInTournament = t === 1 ? 7 : t === 2 ? 7 : 6;
      for (let m = 0; m < matchesInTournament; m++) {
        matchCount++;
        const rating = matchCount <= 14 ? 7.0 : 6.9;
        const goals = matchCount <= 14 ? 1 : 0;
        const assists = matchCount <= 9 ? 1 : 0;
        matches.push({
          id: `m_${t}_${m}`,
          date: "01/08/2024",
          opponentTeam: "Rival",
          userGoals: 2,
          opponentGoals: 0,
          status: "Fase",
          result: "FINISHED",
          lineup: [
            {
              playerId: "p1",
              playerName: "Jamie Ibarra",
              rating,
              goals,
              assists,
              defesas: null,
              cleanSheets: null,
            },
          ],
        });
      }
      tournaments.push({
        id: `t_${t}`,
        name: `Copa Jorge Griffa - ${t}ª Edição`,
        date: "01/08/2024",
        totalMatches: matches.length,
        isChampion: true,
        tournamentResult: "Campeão",
        matches,
      });
    }

    const result = buildPlayerCopyText(mockPlayer, tournaments, mockCareer);
    expect(result).toBe(
      "Jamie Ibarra, PD, 17 anos, URU, 173cm e 69kg, 20 Jogos, 23 G/A, 14 Gols, 9 Assistências, 6.97, Campeão 3 vezes de Copa Jorge Griffa.",
    );
  });

  it("formata corretamente para goleiro (defesas e assistências sem G/A)", () => {
    const gkPlayer: AcademyPlayers = {
      id: "gk1",
      name: "Christian Nelson",
      position: "GOL",
      age: 16,
      nationality: "arg",
      height: 188,
      weight: 80,
      overall: 65,
      potential: 82,
      status: "academy",
      evolutionHistory: [],
      shirtNumber: 1,
    };

    const tournaments: AcademyTournaments[] = [
      {
        id: "t1",
        name: "Copa Jorge Griffa - 1ª Edição",
        date: "01/08/2024",
        totalMatches: 2,
        isChampion: true,
        tournamentResult: "Campeão",
        matches: [
          {
            id: "m1",
            date: "01/08/2024",
            opponentTeam: "Talleres",
            userGoals: 2,
            opponentGoals: 0,
            status: "Final",
            result: "FINISHED",
            lineup: [
              {
                playerId: "gk1",
                playerName: "Christian Nelson",
                rating: 7.2,
                goals: 0,
                assists: 1,
                defesas: 4,
                cleanSheets: 1,
              },
            ],
          },
        ],
      },
    ];

    const result = buildPlayerCopyText(gkPlayer, tournaments, mockCareer);
    expect(result).toBe(
      "Christian Nelson, GOL, 16 anos, ARG, 188cm e 80kg, 1 Jogo, 4 Defesas, 1 Assistência, 7.20, Campeão 1 vez de Copa Jorge Griffa.",
    );
  });

  it("lida corretamente com singular e plural de jogos, gols, assistências e títulos", () => {
    const singlePlayer: AcademyPlayers = {
      id: "p2",
      name: "Lucas Blanco",
      position: "ATA",
      age: 18,
      nationality: "ARG",
      height: 180,
      weight: 75,
      overall: 70,
      potential: 85,
      status: "academy",
      evolutionHistory: [],
      shirtNumber: 9,
    };

    const tournaments: AcademyTournaments[] = [
      {
        id: "t1",
        name: "Copa Jorge Griffa - 1ª Edição",
        date: "01/08/2024",
        totalMatches: 1,
        isChampion: true,
        tournamentResult: "Campeão",
        matches: [
          {
            id: "m1",
            date: "01/08/2024",
            opponentTeam: "Talleres",
            userGoals: 1,
            opponentGoals: 0,
            status: "Final",
            result: "FINISHED",
            lineup: [
              {
                playerId: "p2",
                playerName: "Lucas Blanco",
                rating: 8.5,
                goals: 1,
                assists: 1,
                defesas: null,
                cleanSheets: null,
              },
            ],
          },
        ],
      },
    ];

    const result = buildPlayerCopyText(singlePlayer, tournaments, mockCareer);
    expect(result).toBe(
      "Lucas Blanco, ATA, 18 anos, ARG, 180cm e 75kg, 1 Jogo, 2 G/A, 1 Gol, 1 Assistência, 8.50, Campeão 1 vez de Copa Jorge Griffa.",
    );
  });

  it("lida com jogador sem partidas disputadas", () => {
    const unusedPlayer: AcademyPlayers = {
      id: "p3",
      name: "Novo Jogador",
      position: "MC",
      age: 15,
      nationality: "BRA",
      height: 170,
      weight: 65,
      overall: 60,
      potential: 80,
      status: "academy",
      evolutionHistory: [],
      shirtNumber: 8,
    };

    const result = buildPlayerCopyText(unusedPlayer, [], mockCareer);
    expect(result).toBe(
      "Novo Jogador, MC, 15 anos, BRA, 170cm e 65kg, 0 Jogos, 0 G/A, 0 Gols, 0 Assistências, 0.00, Campeão 0 vezes de Copa Jorge Griffa.",
    );
  });

  it("identifica jogador pelo nome como fallback caso playerId tenha tipagem divergente", () => {
    const playerWithNumberId = {
      ...mockPlayer,
      id: 999 as unknown as string,
      name: "Simón Ruiz",
      position: "MD",
    };

    const tournaments: AcademyTournaments[] = [
      {
        id: "t1",
        name: "Copa Jorge Griffa - 1ª Edição",
        date: "01/08/2024",
        totalMatches: 1,
        isChampion: false,
        tournamentResult: "Eliminado",
        matches: [
          {
            id: "m1",
            date: "01/08/2024",
            opponentTeam: "Talleres",
            userGoals: 1,
            opponentGoals: 0,
            status: "Quartas",
            result: "FINISHED",
            lineup: [
              {
                playerId: "outro-id",
                playerName: "simón ruiz",
                rating: 7.8,
                goals: 0,
                assists: 2,
                defesas: null,
                cleanSheets: null,
              },
            ],
          },
        ],
      },
    ];

    const result = buildPlayerCopyText(
      playerWithNumberId,
      tournaments,
      mockCareer,
    );
    expect(result).toContain("Simón Ruiz, MD");
    expect(result).toContain(
      "1 Jogo, 2 G/A, 0 Gols, 2 Assistências, 7.80, Campeão 0 vezes de Copa Jorge Griffa.",
    );
  });
});
