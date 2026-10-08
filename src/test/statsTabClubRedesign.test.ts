// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/Season/s1" }),
}));
import { aggregateSeasonClubStats } from "../layout/SectionView/features/ClubTabs/StatsTab_Club/helpers/aggregateSeasonClubStats";
import { useStatistics } from "../components/Statistics/CalculatedStatistics/hooks/UseStatistics";
import { getVisibleSortOptions } from "../layout/SectionView/features/ClubTabs/StatsTab_Club/constants/SORTS_OPTIONS";
import { METRICS_REGISTRY } from "../common/stats/registry/metricsRegistry";
import { Players } from "../common/interfaces/playersInfo/players";
import { Match } from "../common/interfaces/Match";
import { AggregatedLeagueStats } from "../layout/SectionView/features/ClubTabs/StatsTab_Club/types/clubStats.types";
import { LeagueStats } from "../common/interfaces/playersStats/leagueStats";

const mockPlayer = (id: string, name: string, manualStats?: LeagueStats[]): Players => ({
  id,
  name,
  position: "ATA",
  sector: "Ataque",
  overall: 80,
  age: 24,
  salary: 10000,
  nation: "Brasil",
  shirtNumber: "9",
  playerValue: 1000000,
  buy: false,
  captain: false,
  sell: false,
  contractTime: 3,
  statsLeagues: manualStats || [],
  contract: [],
  transferHistory: [],
  ballonDor: 0,
} as Players);

const mockMatch = (partial: Partial<Match> & { league: string; status: Match["status"] }): Match => ({
  matchesId: "m-" + Math.random().toString(36).slice(2),
  date: "2026-01-01",
  homeTeam: "Clube",
  awayTeam: "Rival",
  result: "V",
  playerStats: [],
  ...partial,
});

describe("Redesenho do StatsTab_Club: Agregação Pura e Regras de Negócio", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Filtro estrito: partidas SCHEDULED não pontuam, apenas FINISHED contabilizam", () => {
    const player = mockPlayer("p1", "Gabriel Gol");
    const matches: Match[] = [
      mockMatch({
        matchesId: "m1",
        date: "2026-01-01",
        homeTeam: "Clube",
        awayTeam: "Rival",
        league: "Premier League",
        status: "SCHEDULED",
        result: "?",
        playerStats: [{ playerId: "p1", minutesPlayed: 90, goals: 3, assists: 1, defenses: 0, distanceKm: 10, rating: 9, yellowCard: false, redCard: false }],
      }),
      mockMatch({
        matchesId: "m2",
        date: "2026-01-08",
        homeTeam: "Clube",
        awayTeam: "Rival 2",
        league: "Premier League",
        status: "FINISHED",
        homeScore: 2,
        awayScore: 0,
        result: "V",
        playerStats: [{ playerId: "p1", minutesPlayed: 90, goals: 2, assists: 1, defenses: 0, distanceKm: 10, rating: 8, yellowCard: false, redCard: false }],
      }),
    ];

    const result = aggregateSeasonClubStats({
      players: [player],
      matches,
      clubName: "Clube",
    });

    expect(result).toHaveLength(1);
    const p = result[0];
    expect(p.aggregatedLeagues).toHaveLength(1);
    const league = p.aggregatedLeagues[0];

    // Apenas m2 deve ser somada (2 gols e 1 assistência)
    expect(league.stats.games).toBe(1);
    expect(league.stats.goals).toBe(2);
    expect(league.stats.assists).toBe(1);
    expect(league.source).toBe("matches");
  });

  it("2. Deduplicação resiliente: não colapsa partidas sem matchesId explícito", () => {
    const player = mockPlayer("p1", "Gabriel Gol");
    const matches: Match[] = [
      mockMatch({
        matchesId: undefined,
        date: "2026-02-01",
        homeTeam: "Clube",
        awayTeam: "Adversário A",
        league: "Copa",
        status: "FINISHED",
        playerStats: [{ playerId: "p1", minutesPlayed: 45, goals: 1, assists: 0, defenses: 0, distanceKm: 5, rating: 7, yellowCard: false, redCard: false }],
      }),
      mockMatch({
        matchesId: undefined,
        date: "2026-02-08",
        homeTeam: "Clube",
        awayTeam: "Adversário B",
        league: "Copa",
        status: "FINISHED",
        playerStats: [{ playerId: "p1", minutesPlayed: 90, goals: 2, assists: 0, defenses: 0, distanceKm: 9, rating: 8, yellowCard: false, redCard: false }],
      }),
    ];

    const result = aggregateSeasonClubStats({
      players: [player],
      matches,
      clubName: "Clube",
    });

    const copa = result[0].aggregatedLeagues.find((l) => l.leagueName === "Copa");
    expect(copa).toBeDefined();
    // Ambas as partidas devem ser preservadas
    expect(copa!.stats.games).toBe(2);
    expect(copa!.stats.goals).toBe(3);
  });

  it("3. Normalização de nomes de competição (espaços e letras maiúsculas)", () => {
    const manualLeague: LeagueStats = {
      leagueName: "Premier League",
      leagueImage: "logo.png",
      stats: { games: 2, goals: 1, assists: 0, cleanSheets: 0, defenses: 0, minutesPlayed: 180, rating: 7 },
    };
    const player = mockPlayer("p1", "Gabriel Gol", [manualLeague]);

    const matches: Match[] = [
      mockMatch({
        matchesId: "m1",
        date: "2026-03-01",
        homeTeam: "Clube",
        awayTeam: "Rival",
        league: "Premier League ", // espaço no fim
        status: "FINISHED",
        playerStats: [{ playerId: "p1", minutesPlayed: 90, goals: 2, assists: 1, defenses: 0, distanceKm: 10, rating: 8, yellowCard: false, redCard: false }],
      }),
    ];

    const result = aggregateSeasonClubStats({
      players: [player],
      matches,
      clubName: "Clube",
    });

    expect(result[0].aggregatedLeagues).toHaveLength(1);
    const pl = result[0].aggregatedLeagues[0];
    expect(pl.leagueName).toBe("Premier League");
    expect(pl.stats.games).toBe(3);
    expect(pl.stats.goals).toBe(3);
    expect(pl.source).toBe("both");
  });

  it("4. Tagging de origem (source): matches, manual e both", () => {
    const manualOnly: LeagueStats = {
      leagueName: "Amistosos",
      leagueImage: "",
      stats: { games: 1, goals: 0, assists: 0, cleanSheets: 0, defenses: 0, minutesPlayed: 90, rating: 6 },
    };
    const mixedLeague: LeagueStats = {
      leagueName: "Campeonato",
      leagueImage: "",
      stats: { games: 1, goals: 1, assists: 0, cleanSheets: 0, defenses: 0, minutesPlayed: 90, rating: 7 },
    };
    const player = mockPlayer("p1", "Atleta", [manualOnly, mixedLeague]);

    const matches: Match[] = [
      mockMatch({
        matchesId: "m1",
        date: "2026-04-01",
        homeTeam: "Clube",
        awayTeam: "Time X",
        league: "Campeonato",
        status: "FINISHED",
        playerStats: [{ playerId: "p1", minutesPlayed: 90, goals: 2, assists: 1, defenses: 0, distanceKm: 10, rating: 8, yellowCard: false, redCard: false }],
      }),
      mockMatch({
        matchesId: "m2",
        date: "2026-04-10",
        homeTeam: "Clube",
        awayTeam: "Time Y",
        league: "Copa Internacional",
        status: "FINISHED",
        playerStats: [{ playerId: "p1", minutesPlayed: 90, goals: 1, assists: 0, defenses: 0, distanceKm: 10, rating: 8, yellowCard: false, redCard: false }],
      }),
    ];

    const result = aggregateSeasonClubStats({
      players: [player],
      matches,
      clubName: "Clube",
    });

    const leagues = result[0].aggregatedLeagues;
    const lAmistosos = leagues.find((l) => l.leagueName === "Amistosos");
    const lCampeonato = leagues.find((l) => l.leagueName === "Campeonato");
    const lCopa = leagues.find((l) => l.leagueName === "Copa Internacional");

    expect(lAmistosos?.source).toBe("manual");
    expect(lCampeonato?.source).toBe("both");
    expect(lCopa?.source).toBe("matches");
  });
});

describe("Redesenho do StatsTab_Club: Comportamento da Lixeira e Aviso Visual", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("5. Clicar na lixeira em liga 100% de partidas exibe aviso visual e NÃO chama handleDeleteLeague", () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmMock = vi.spyOn(window, "confirm").mockImplementation(() => true);
    const deleteMock = vi.fn();

    const leagueStatsWithMatches: AggregatedLeagueStats = {
      leagueName: "Premier League",
      leagueImage: "",
      stats: { games: 5, goals: 4, assists: 2, cleanSheets: 0, defenses: 0, minutesPlayed: 450, rating: 7.8 },
      source: "matches",
    };

    const { result } = renderHook(() =>
      useStatistics({
        league: true,
        leagueStats: leagueStatsWithMatches,
        handleDeleteLeague: deleteMock,
      }),
    );

    const deleteItem = result.current.filteredStats.find((s) => s.label === "Deletar");
    expect(deleteItem).toBeDefined();

    act(() => {
      deleteItem?.onClick?.();
    });

    expect(alertMock).toHaveBeenCalledWith(
      expect.stringContaining("são calculadas automaticamente a partir de partidas finalizadas e não podem ser excluídas por aqui"),
    );
    expect(deleteMock).not.toHaveBeenCalled();
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("6. Clicar na lixeira em liga manual pede confirmação padrão e executa exclusão", () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteMock = vi.fn();

    const manualLeague: AggregatedLeagueStats = {
      leagueName: "Liga Regional",
      leagueImage: "",
      stats: { games: 3, goals: 1, assists: 0, cleanSheets: 0, defenses: 0, minutesPlayed: 270, rating: 6.5 },
      source: "manual",
    };

    const { result } = renderHook(() =>
      useStatistics({
        league: true,
        leagueStats: manualLeague,
        handleDeleteLeague: deleteMock,
      }),
    );

    const deleteItem = result.current.filteredStats.find((s) => s.label === "Deletar");
    expect(deleteItem).toBeDefined();

    act(() => {
      deleteItem?.onClick?.();
    });

    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining("Deseja excluir permanentemente as estatísticas manuais"),
    );
    expect(deleteMock).toHaveBeenCalledWith("Liga Regional");
    expect(alertMock).not.toHaveBeenCalled();
  });

  it("7. Clicar na lixeira em liga mista alerta que apenas a parte manual será removida", () => {
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteMock = vi.fn();

    const mixedLeague: AggregatedLeagueStats = {
      leagueName: "Copa Nacional",
      leagueImage: "",
      stats: { games: 6, goals: 3, assists: 1, cleanSheets: 0, defenses: 0, minutesPlayed: 540, rating: 7.2 },
      source: "both",
    };

    const { result } = renderHook(() =>
      useStatistics({
        league: true,
        leagueStats: mixedLeague,
        handleDeleteLeague: deleteMock,
      }),
    );

    const deleteItem = result.current.filteredStats.find((s) => s.label === "Deletar");
    expect(deleteItem).toBeDefined();

    act(() => {
      deleteItem?.onClick?.();
    });

    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining("Esta competição possui dados manuais e partidas disputadas"),
    );
    expect(confirmMock).toHaveBeenCalledWith(
      expect.stringContaining("Os números gerados a partir das partidas continuarão salvos normalmente"),
    );
    expect(deleteMock).toHaveBeenCalledWith("Copa Nacional");
    expect(alertMock).not.toHaveBeenCalled();
  });
});

describe("Redesenho do StatsTab_Club: Governança do Catálogo Central (metricsRegistry)", () => {
  it("8. Desativar Gols no registro central oculta Gols e Gols+Assistências de CalculatedStatistics e de SORTS_OPTIONS", () => {
    // Estado original: enabled = true
    expect(getVisibleSortOptions()).toContain("Ordenar por gols");
    expect(getVisibleSortOptions()).toContain("Ordenar por participações em gols");

    // Desativa goals globalmente
    METRICS_REGISTRY.goals.enabled = false;
    try {
      const sortOptionsWithoutGoals = getVisibleSortOptions();
      expect(sortOptionsWithoutGoals).not.toContain("Ordenar por gols");
      expect(sortOptionsWithoutGoals).not.toContain("Ordenar por participações em gols");

      // Verifica CalculatedStatistics
      const dummyPlayer = mockPlayer("p1", "Test");
      const { result } = renderHook(() =>
        useStatistics({
          total: true,
          player: dummyPlayer,
        }),
      );

      const labels = result.current.filteredStats.map((s) => s.label);
      expect(labels).not.toContain("Gols");
      expect(labels).not.toContain("Gols + Assistências");
      expect(labels).toContain("Assistências");
      expect(labels).toContain("Jogos");
    } finally {
      // Restaura o registro original
      METRICS_REGISTRY.goals.enabled = true;
    }
  });
});
