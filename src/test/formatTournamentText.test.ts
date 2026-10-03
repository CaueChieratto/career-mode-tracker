// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatTournamentText,
  formatTournamentHeaderName,
  formatPlayerLine,
  copyToClipboard,
} from "../pages/Academy/layouts/AcademyContent/components/Tournament/views/TournamentWorkspace/helpers/formatTournamentText";
import { AcademyTournaments } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyTournaments/AcademyTournaments";
import { Career } from "../common/interfaces/Career";
import { AcademyPlayers } from "../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayers";

const createMockCareer = (clubName = "Newell’s Old Boys"): Career =>
  ({
    id: "c1",
    clubName,
    nation: "Argentina",
    createdAt: new Date("2024-01-01"),
    clubData: [],
    academy: {
      tournament: "Copa Jorge Griffa",
      nickname: "La Lepra",
    },
  }) as unknown as Career;

const createMockPlayer = (
  id: string,
  name: string,
  position = "ATA",
): AcademyPlayers =>
  ({
    id,
    name,
    position,
    age: 17,
    overall: 65,
    potential: 80,
    status: "academy",
    evolutionHistory: [],
    shirtNumber: 10,
  }) as AcademyPlayers;

describe("formatTournamentHeaderName", () => {
  it("converte padrão 'Copa ... - Nª Edição' para 'Nª edição da Copa ...'", () => {
    expect(
      formatTournamentHeaderName("Copa Jorge Griffa - 4ª Edição"),
    ).toBe("4ª edição da Copa Jorge Griffa");
  });

  it("converte padrão com Torneio ou Campeonato usando preposição 'do'", () => {
    expect(
      formatTournamentHeaderName("Torneio de Verão - 2ª Edição"),
    ).toBe("2ª edição do Torneio de Verão");
    expect(
      formatTournamentHeaderName("Campeonato Juvenil - 1ª Edição"),
    ).toBe("1ª edição do Campeonato Juvenil");
  });

  it("mantém nomes personalizados que não seguem o sufixo padrão de edição", () => {
    expect(formatTournamentHeaderName("Copa Zico")).toBe("Copa Zico");
    expect(
      formatTournamentHeaderName("4ª edição da Copa Jorge Griffa"),
    ).toBe("4ª edição da Copa Jorge Griffa");
  });
});

describe("formatPlayerLine", () => {
  const players: AcademyPlayers[] = [
    createMockPlayer("p1", "Lucas Blanco", "ATA"),
    createMockPlayer("p2", "Christian Arce", "MEI"),
    createMockPlayer("p3", "Christian Nelson", "GOL"),
    createMockPlayer("p4", "Cristian Bello", "ZAG"),
    createMockPlayer("p5", "Simón Ruiz", "VOL"),
  ];

  it("formata jogador de linha com 2 gols e sem assistências", () => {
    const line = formatPlayerLine(
      {
        playerId: "p1",
        playerName: "Lucas Blanco",
        rating: 8.6,
        goals: 2,
        assists: 0,
        defesas: null,
        cleanSheets: null,
      },
      players,
    );
    expect(line).toBe("• Lucas Blanco — nota 8,6; 2 gols.");
  });

  it("formata jogador de linha sem gols ou assistências", () => {
    const line = formatPlayerLine(
      {
        playerId: "p2",
        playerName: "Christian Arce",
        rating: 6.7,
        goals: 0,
        assists: 0,
        defesas: null,
        cleanSheets: null,
      },
      players,
    );
    expect(line).toBe("• Christian Arce — nota 6,7; sem gols ou assistências.");
  });

  it("formata goleiro com defesas e sem assistências", () => {
    const line3Def = formatPlayerLine(
      {
        playerId: "p3",
        playerName: "Christian Nelson",
        rating: 7.4,
        goals: 0,
        assists: 0,
        defesas: 3,
        cleanSheets: 1,
      },
      players,
    );
    expect(line3Def).toBe(
      "• Christian Nelson — nota 7,4; 3 defesas, sem assistências.",
    );

    const line1Def = formatPlayerLine(
      {
        playerId: "p3",
        playerName: "Christian Nelson",
        rating: 7.2,
        goals: 0,
        assists: 0,
        defesas: 1,
        cleanSheets: 1,
      },
      players,
    );
    expect(line1Def).toBe(
      "• Christian Nelson — nota 7,2; 1 defesa, sem assistências.",
    );
  });

  it("formata goleiro sem defesas ou assistências", () => {
    const line = formatPlayerLine(
      {
        playerId: "p3",
        playerName: "Christian Nelson",
        rating: 6.1,
        goals: 0,
        assists: 0,
        defesas: 0,
        cleanSheets: 0,
      },
      players,
    );
    expect(line).toBe(
      "• Christian Nelson — nota 6,1; sem defesas ou assistências.",
    );
  });

  it("formata jogador de linha com 1 assistência", () => {
    const line = formatPlayerLine(
      {
        playerId: "p5",
        playerName: "Simón Ruiz",
        rating: 8.3,
        goals: 0,
        assists: 1,
        defesas: null,
        cleanSheets: null,
      },
      players,
    );
    expect(line).toBe("• Simón Ruiz — nota 8,3; 1 assistência.");
  });

  it("formata jogador de linha com 1 gol e 1 assistência", () => {
    const line = formatPlayerLine(
      {
        playerId: "p1",
        playerName: "Lucas Blanco",
        rating: 7.9,
        goals: 1,
        assists: 1,
        defesas: null,
        cleanSheets: null,
      },
      players,
    );
    expect(line).toBe("• Lucas Blanco — nota 7,9; 1 gol e 1 assistência.");
  });
});

describe("formatTournamentText — reprodução exata do exemplo do usuário", () => {
  it("gera o texto completo exatamente no formato especificado pelo usuário", () => {
    const career = createMockCareer("Newell’s Old Boys");
    const allPlayers: AcademyPlayers[] = [
      createMockPlayer("p1", "Lucas Blanco", "ATA"),
      createMockPlayer("p2", "Christian Arce", "MEI"),
      createMockPlayer("p3", "Christian Nelson", "GOL"),
      createMockPlayer("p4", "Cristian Bello", "ZAG"),
      createMockPlayer("p5", "Simón Ruiz", "VOL"),
    ];

    const tournament: AcademyTournaments = {
      id: "t1",
      name: "Copa Jorge Griffa - 4ª Edição",
      date: "01/08/2024",
      totalMatches: 3,
      isChampion: true,
      tournamentResult: "Campeão",
      matches: [
        {
          id: "m1",
          date: "01/08/2024",
          opponentTeam: "Talleres",
          userGoals: 2,
          opponentGoals: 0,
          status: "Quartas de Final",
          result: "FINISHED",
          lineup: [
            {
              playerId: "p1",
              playerName: "Lucas Blanco",
              rating: 8.6,
              goals: 2,
              assists: 0,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p2",
              playerName: "Christian Arce",
              rating: 6.7,
              goals: 0,
              assists: 0,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p3",
              playerName: "Christian Nelson",
              rating: 7.4,
              goals: 0,
              assists: 0,
              defesas: 3,
              cleanSheets: 1,
            },
            {
              playerId: "p4",
              playerName: "Cristian Bello",
              rating: 6.0,
              goals: 0,
              assists: 0,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p5",
              playerName: "Simón Ruiz",
              rating: 8.3,
              goals: 0,
              assists: 1,
              defesas: null,
              cleanSheets: null,
            },
          ],
        },
        {
          id: "m2",
          date: "05/08/2024",
          opponentTeam: "Aldosivi",
          userGoals: 1,
          opponentGoals: 0,
          status: "Semifinal",
          result: "FINISHED",
          lineup: [
            {
              playerId: "p1",
              playerName: "Lucas Blanco",
              rating: 6.8,
              goals: 0,
              assists: 0,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p2",
              playerName: "Christian Arce",
              rating: 6.7,
              goals: 0,
              assists: 0,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p3",
              playerName: "Christian Nelson",
              rating: 6.1,
              goals: 0,
              assists: 0,
              defesas: 0,
              cleanSheets: 1,
            },
            {
              playerId: "p4",
              playerName: "Cristian Bello",
              rating: 7.8,
              goals: 0,
              assists: 1,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p5",
              playerName: "Simón Ruiz",
              rating: 7.6,
              goals: 1,
              assists: 0,
              defesas: null,
              cleanSheets: null,
            },
          ],
        },
        {
          id: "m3",
          date: "10/08/2024",
          opponentTeam: "Gimnasia y Esgrima",
          userGoals: 2,
          opponentGoals: 0,
          status: "Final",
          result: "FINISHED",
          lineup: [
            {
              playerId: "p1",
              playerName: "Lucas Blanco",
              rating: 7.9,
              goals: 1,
              assists: 1,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p2",
              playerName: "Christian Arce",
              rating: 7.2,
              goals: 0,
              assists: 0,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p3",
              playerName: "Christian Nelson",
              rating: 7.2,
              goals: 0,
              assists: 0,
              defesas: 1,
              cleanSheets: 1,
            },
            {
              playerId: "p4",
              playerName: "Cristian Bello",
              rating: 7.4,
              goals: 1,
              assists: 0,
              defesas: null,
              cleanSheets: null,
            },
            {
              playerId: "p5",
              playerName: "Simón Ruiz",
              rating: 7.8,
              goals: 0,
              assists: 1,
              defesas: null,
              cleanSheets: null,
            },
          ],
        },
      ],
    };

    const expectedText = `4ª edição da Copa Jorge Griffa {

QUARTAS DE FINAL {
Newell’s Old Boys 2 x 0 Talleres

• Lucas Blanco — nota 8,6; 2 gols.
• Christian Arce — nota 6,7; sem gols ou assistências.
• Christian Nelson — nota 7,4; 3 defesas, sem assistências.
• Cristian Bello — nota 6,0; sem gols ou assistências.
• Simón Ruiz — nota 8,3; 1 assistência.
}

SEMIFINAL {
Newell’s Old Boys 1 x 0 Aldosivi

• Lucas Blanco — nota 6,8; sem gols ou assistências.
• Christian Arce — nota 6,7; sem gols ou assistências.
• Christian Nelson — nota 6,1; sem defesas ou assistências.
• Cristian Bello — nota 7,8; 1 assistência.
• Simón Ruiz — nota 7,6; 1 gol.
}

FINAL {
Newell’s Old Boys 2 x 0 Gimnasia y Esgrima

• Lucas Blanco — nota 7,9; 1 gol e 1 assistência.
• Christian Arce — nota 7,2; sem gols ou assistências.
• Christian Nelson — nota 7,2; 1 defesa, sem assistências.
• Cristian Bello — nota 7,4; 1 gol.
• Simón Ruiz — nota 7,8; 1 assistência.
}
}`;

    const result = formatTournamentText(tournament, career, allPlayers);
    expect(result).toBe(expectedText);
  });
});

