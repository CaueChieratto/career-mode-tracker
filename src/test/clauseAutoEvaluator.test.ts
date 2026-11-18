import { describe, it, expect } from "vitest";
import { Match } from "../common/interfaces/Match";
import { TableRowData } from "../common/interfaces/Table";
import { Players } from "../common/interfaces/playersInfo/players";
import { TransferBonus } from "../common/interfaces/playersInfo/transferTerms";
import {
  calculatePlayerSeasonStats,
  checkCupTitleWon,
  checkCupStageReached,
  checkLeagueTableObjective,
  evaluateBonus,
  evaluateWageAdjustment,
  calculateSeasonLeaders,
} from "../common/services/ServiceFinance/clauseAutoEvaluator";

describe("Motor Reativo de Auto-Alimentação de Cláusulas (clauseAutoEvaluator)", () => {
  const dummyMatches: Match[] = [
    {
      matchesId: "m1",
      date: "2026-08-15",
      league: "Premier League",
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      homeScore: 2,
      awayScore: 0,
      result: "V",
      status: "FINISHED",
      playerStats: [
        {
          playerId: "p1", // Zagueiro titular
          minutesPlayed: 90,
          goals: 1,
          assists: 0,
          defenses: 0,
          distanceKm: 10,
          rating: 8.5,
          yellowCard: false,
          redCard: false,
          cleanSheet: true,
        },
        {
          playerId: "p2", // Atacante titular
          minutesPlayed: 75,
          goals: 1,
          assists: 1,
          defenses: 0,
          distanceKm: 9,
          rating: 8.0,
          yellowCard: false,
          redCard: false,
          cleanSheet: false, // Mesmo com stat cleanSheet false, time sofreu 0 gols!
        },
        {
          playerId: "p3", // Reserva sem entrar
          minutesPlayed: 0,
          goals: 0,
          assists: 0,
          defenses: 0,
          distanceKm: 0,
          rating: 0,
          yellowCard: false,
          redCard: false,
        },
      ],
    },
    {
      matchesId: "m2",
      date: "2026-08-22",
      league: "Premier League",
      homeTeam: "Liverpool",
      awayTeam: "Arsenal",
      homeScore: 1,
      awayScore: 3,
      result: "V",
      status: "FINISHED",
      playerStats: [
        {
          playerId: "p1",
          minutesPlayed: 90,
          goals: 0,
          assists: 1,
          defenses: 0,
          distanceKm: 10,
          rating: 7.5,
          yellowCard: false,
          redCard: false,
          cleanSheet: false, // sofreu 1 gol
        },
        {
          playerId: "p2",
          minutesPlayed: 90,
          goals: 2,
          assists: 0,
          defenses: 0,
          distanceKm: 10,
          rating: 9.0,
          yellowCard: false,
          redCard: false,
          cleanSheet: false,
        },
      ],
    },
    {
      matchesId: "m3", // Partida agendada / não finalizada
      date: "2026-08-30",
      league: "Premier League",
      homeTeam: "Arsenal",
      awayTeam: "Tottenham",
      result: "E",
      status: "SCHEDULED",
      playerStats: [
        {
          playerId: "p1",
          minutesPlayed: 90,
          goals: 5,
          assists: 5,
          defenses: 0,
          distanceKm: 10,
          rating: 10,
          yellowCard: false,
          redCard: false,
        },
      ],
    },
  ];

  it("calcula precisamente partidas disputadas (apenas minutos > 0 em partidas finalizadas)", () => {
    const statsP1 = calculatePlayerSeasonStats("p1", dummyMatches, "Arsenal");
    expect(statsP1.games).toBe(2);

    const statsP3 = calculatePlayerSeasonStats("p3", dummyMatches, "Arsenal");
    expect(statsP3.games).toBe(0); // Esteve no banco com 0 minutos
  });

  it("calcula soma de gols e assistências a partir de partidas finalizadas", () => {
    const statsP1 = calculatePlayerSeasonStats("p1", dummyMatches, "Arsenal");
    expect(statsP1.goals).toBe(1);
    expect(statsP1.assists).toBe(1);

    const statsP2 = calculatePlayerSeasonStats("p2", dummyMatches, "Arsenal");
    expect(statsP2.goals).toBe(3);
    expect(statsP2.assists).toBe(1);
  });

  it("regra universal de Clean Sheet: pontua qualquer atleta (incluindo atacantes) em jogos sem sofrer gols", () => {
    // Na partida m1, Arsenal venceu por 2 a 0. P2 (atacante) jogou 75 minutos.
    const statsP2 = calculatePlayerSeasonStats("p2", dummyMatches, "Arsenal");
    expect(statsP2.cleanSheets).toBe(1);

    const statsP1 = calculatePlayerSeasonStats("p1", dummyMatches, "Arsenal");
    expect(statsP1.cleanSheets).toBe(1);
  });

  it("avalia títulos de Copa em partidas com stage Final e result WIN", () => {
    const cupFinalMatch: Match = {
      matchesId: "final1",
      date: "2026-05-20",
      league: "FA Cup",
      stage: "Grande Final",
      homeTeam: "Arsenal",
      awayTeam: "Man City",
      homeScore: 2,
      awayScore: 1,
      result: "V",
      status: "FINISHED",
    };

    expect(checkCupTitleWon([cupFinalMatch])).toBe(true);

    const cupFinalLoss: Match = {
      ...cupFinalMatch,
      result: "D",
    };
    expect(checkCupTitleWon([cupFinalLoss])).toBe(false);

    const cupSemiMatch: Match = {
      ...cupFinalMatch,
      stage: "Semifinal",
      result: "V",
    };
    expect(checkCupTitleWon([cupSemiMatch])).toBe(false);
  });

  it("avalia progressão de etapas em copas e playoffs", () => {
    const matches: Match[] = [
      {
        matchesId: "qf1",
        date: "2026-04-10",
        league: "Champions League",
        stage: "Quartas de Final",
        homeTeam: "Arsenal",
        awayTeam: "Bayern",
        result: "V",
        status: "FINISHED",
      },
    ];

    expect(checkCupStageReached("Oitavas", matches)).toBe(true);
    expect(checkCupStageReached("Quartas de Final", matches)).toBe(true);
    expect(checkCupStageReached("Semifinal", matches)).toBe(false);
    expect(checkCupStageReached("Final", matches)).toBe(false);
  });

  it("avalia objetivos de classificação na tabela de Liga Nacional", () => {
    const table: TableRowData[] = [
      {
        id: "t1",
        name: "Arsenal",
        position: 1,
        badge: "",
        played: 38,
        won: 30,
        drawn: 5,
        lost: 3,
        goalsFor: 85,
        goalsAgainst: 25,
        goalDiff: 60,
        points: 95,
        zone: "champions",
      },
      {
        id: "t2",
        name: "Man City",
        position: 2,
        badge: "",
        played: 38,
        won: 28,
        drawn: 4,
        lost: 6,
        goalsFor: 80,
        goalsAgainst: 30,
        goalDiff: 50,
        points: 88,
        zone: "champions",
      },
    ];

    expect(checkLeagueTableObjective("Campeão", table, "Arsenal")).toBe(true);
    expect(checkLeagueTableObjective("Vaga Continental", table, "Arsenal")).toBe(true);
    expect(checkLeagueTableObjective("Evitar Rebaixamento", table, "Arsenal")).toBe(true);

    expect(checkLeagueTableObjective("Campeão", table, "Man City")).toBe(false);
    expect(checkLeagueTableObjective("Vaga Continental", table, "Man City")).toBe(true);
  });

  it("detecta artilheiro e garçom da temporada", () => {
    const players: Players[] = [
      { id: "p1", name: "Gabriel Magalhães" } as Players,
      { id: "p2", name: "Bukayo Saka" } as Players,
    ];

    const leaders = calculateSeasonLeaders(players, dummyMatches, "Arsenal");
    expect(leaders.topScorerPlayerIds).toContain("p2");
    expect(leaders.maxGoals).toBe(3);
    expect(leaders.topAssistPlayerIds).toContain("p1");
    expect(leaders.topAssistPlayerIds).toContain("p2");
  });

  it("avalia bônus de performance e muda status para pronto para pagar", () => {
    const bonus: TransferBonus = {
      id: "b1",
      direction: "payable",
      category: "performance",
      name: "Bônus por 2 Gols",
      metric: "goals",
      metricTarget: 2,
      value: 500000,
      status: "pending",
    };

    const evaluation = evaluateBonus(
      bonus,
      "p2",
      [{ id: "p2", name: "Bukayo Saka" } as Players],
      dummyMatches,
      [],
      "Arsenal",
    );

    expect(evaluation.isAchieved).toBe(true);
    expect(evaluation.isReadyToPay).toBe(true);
    expect(evaluation.calculatedProgress).toBe(3);
  });

  it("preserva status paid sem reverter mesmo após nova avaliação", () => {
    const bonus: TransferBonus = {
      id: "b1",
      direction: "payable",
      category: "performance",
      name: "Bônus por Gols",
      metric: "goals",
      metricTarget: 10,
      value: 500000,
      status: "paid", // já foi pago
    };

    const evaluation = evaluateBonus(
      bonus,
      "p2",
      [{ id: "p2", name: "Bukayo Saka" } as Players],
      dummyMatches,
      [],
      "Arsenal",
    );

    expect(evaluation.status).toBe("paid");
    expect(evaluation.isReadyToPay).toBe(false);
  });

  it("calcula ajuste salarial automático (+20% ao atingir meta de liga e -20% se não atingir)", () => {
    const contractWithAdjustment = {
      weeklyWage: 100000,
      durationYears: 3,
      squadRole: "Crucial" as const,
      wageAdjustment: {
        enabled: true,
        percentage: 20,
        competitionBasis: "league" as const,
        targetObjective: "Campeão",
      },
    };

    const tableChampion: TableRowData[] = [
      {
        id: "t1",
        name: "Arsenal",
        position: 1,
        badge: "",
        played: 38,
        won: 30,
        drawn: 5,
        lost: 3,
        goalsFor: 80,
        goalsAgainst: 20,
        goalDiff: 60,
        points: 95,
        zone: "champions",
      },
    ];

    const resultWon = evaluateWageAdjustment(
      contractWithAdjustment,
      tableChampion,
      [],
      "Arsenal",
    );
    expect(resultWon.applied).toBe(true);
    expect(resultWon.outcome).toBe("increased");
    expect(resultWon.adjustedWage).toBe(120000); // 100k + 20%

    const tableNotChampion: TableRowData[] = [
      {
        ...tableChampion[0],
        position: 3,
      },
    ];

    const resultLost = evaluateWageAdjustment(
      contractWithAdjustment,
      tableNotChampion,
      dummyMatches,
      "Arsenal",
    );
    expect(resultLost.applied).toBe(true);
    expect(resultLost.outcome).toBe("decreased");
    expect(resultLost.adjustedWage).toBe(80000); // 100k - 20%
  });
});
