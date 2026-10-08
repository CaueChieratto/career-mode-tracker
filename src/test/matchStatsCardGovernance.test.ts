// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { formatMatchStats } from "../layout/SectionView/features/ClubTabs/GeneralTab/components/MatchStatsCard/helpers/formatMatchStats";
import { buildMatchStatsCopyText } from "../layout/SectionView/features/ClubTabs/GeneralTab/components/MatchStatsCard/helpers/buildMatchStatsCopyText";
import { AggregatedStats } from "../layout/SectionView/features/ClubTabs/GeneralTab/components/MatchStatsCard/helpers/calculateMatchStats";
import {
  METRICS_REGISTRY,
  isMetricEnabledForMatchStatsCard,
} from "../common/stats/registry/metricsRegistry";

const createMockStats = (): AggregatedStats => ({
  totalRating: 75,
  ratingCount: 10,
  goalsScored: 12,
  goalsConceded: 6,
  totalXG: 14.5,
  totalAssists: 8,
  totalFinishings: 45,
  totalFinishingsOnTarget: 22,
  totalPossession: 550,
  totalPasses: 1200,
  totalPassesCompleted: 1020,
  cleanSheets: 4,
  totalDefenses: 18,
  totalYellowCards: 10,
  totalRedCards: 1,
  totalBallRecoveryTime: 120,
  totalBallsRecovered: 80,
  totalBallsLost: 60,
  totalKeyPasses: 25,
  wins: 7,
  draws: 2,
  losses: 1,
});

describe("Governança Centralizada do MatchStatsCard via metricsRegistry", () => {
  beforeEach(() => {
    // Restaura o estado padrão de todas as métricas no registry
    Object.values(METRICS_REGISTRY).forEach((m) => {
      m.enabled = true;
      if (m.screens.matchStatsCard !== undefined) {
        m.screens.matchStatsCard = true;
      }
    });
  });

  it("1. Por padrão, todas as 5 categorias e suas métricas estão presentes", () => {
    const stats = createMockStats();
    const categories = formatMatchStats(stats, 10);

    expect(categories).toHaveLength(5);
    const titles = categories.map((c) => c.title);
    expect(titles).toEqual(["Geral", "Atacando", "Passes", "Defendendo", "Outros"]);

    const atacando = categories.find((c) => c.title === "Atacando")!;
    const atacandoNames = atacando.stats.map((s) => s.name);
    expect(atacandoNames).toContain("Gols marcados");
    expect(atacandoNames).toContain("Gols por jogo");
    expect(atacandoNames).toContain("xG médio");
    expect(atacandoNames).toContain("Finalizações por jogo");
  });

  it("2. Desativar 'goals' globalmente oculta 'Gols marcados' e 'Gols por jogo' do card", () => {
    METRICS_REGISTRY.goals.enabled = false;

    const stats = createMockStats();
    const categories = formatMatchStats(stats, 10);

    const atacando = categories.find((c) => c.title === "Atacando")!;
    const atacandoNames = atacando.stats.map((s) => s.name);
    expect(atacandoNames).not.toContain("Gols marcados");
    expect(atacandoNames).not.toContain("Gols por jogo");

    // Outras estatísticas da categoria continuam presentes
    expect(atacandoNames).toContain("xG médio");
    expect(atacandoNames).toContain("Finalizações por jogo");
  });

  it("3. Desativar 'goals' apenas na tela matchStatsCard mantém a métrica nas outras telas", () => {
    METRICS_REGISTRY.goals.screens.matchStatsCard = false;

    expect(METRICS_REGISTRY.goals.enabled).toBe(true);
    expect(METRICS_REGISTRY.goals.screens.bestPlayers).toBe(true);
    expect(METRICS_REGISTRY.goals.screens.comparePlayers).toBe(true);
    expect(isMetricEnabledForMatchStatsCard("goals")).toBe(false);

    const stats = createMockStats();
    const categories = formatMatchStats(stats, 10);
    const atacando = categories.find((c) => c.title === "Atacando")!;
    const atacandoNames = atacando.stats.map((s) => s.name);
    expect(atacandoNames).not.toContain("Gols marcados");
    expect(atacandoNames).not.toContain("Gols por jogo");
  });

  it("4. Desativar métricas coletivas da equipe (ex: wins, xg, possession) as remove pontualmente", () => {
    METRICS_REGISTRY.wins.enabled = false;
    METRICS_REGISTRY.xg.screens.matchStatsCard = false;
    METRICS_REGISTRY.possession.enabled = false;

    const stats = createMockStats();
    const categories = formatMatchStats(stats, 10);

    const geral = categories.find((c) => c.title === "Geral")!;
    expect(geral.stats.map((s) => s.name)).not.toContain("Vitórias");
    expect(geral.stats.map((s) => s.name)).toContain("Partidas");
    expect(geral.stats.map((s) => s.name)).toContain("Empates");
    expect(geral.stats.map((s) => s.name)).toContain("Derrotas");

    const atacando = categories.find((c) => c.title === "Atacando")!;
    expect(atacando.stats.map((s) => s.name)).not.toContain("xG médio");

    const passes = categories.find((c) => c.title === "Passes")!;
    expect(passes.stats.map((s) => s.name)).not.toContain("Posse de bola média");
    expect(passes.stats.map((s) => s.name)).toContain("Total de passes");
  });

  it("5. Quando todas as métricas de uma categoria são desativadas, a seção inteira é omitida", () => {
    // Desativa todas as métricas de "Outros" (avgRating, yellowCards, redCards)
    METRICS_REGISTRY.avgRating.screens.matchStatsCard = false;
    METRICS_REGISTRY.yellowCards.screens.matchStatsCard = false;
    METRICS_REGISTRY.redCards.screens.matchStatsCard = false;

    const stats = createMockStats();
    const categories = formatMatchStats(stats, 10);

    const titles = categories.map((c) => c.title);
    expect(titles).not.toContain("Outros");
    expect(titles).toHaveLength(4);
  });

  it("6. Quando todas as métricas são desativadas, formatMatchStats retorna lista vazia", () => {
    Object.values(METRICS_REGISTRY).forEach((m) => {
      m.screens.matchStatsCard = false;
    });

    const stats = createMockStats();
    const categories = formatMatchStats(stats, 10);
    expect(categories).toEqual([]);
  });

  it("7. A cópia para a área de transferência (buildMatchStatsCopyText) reflete apenas as métricas visíveis", () => {
    METRICS_REGISTRY.goals.enabled = false;
    METRICS_REGISTRY.wins.enabled = false;

    const stats = createMockStats();
    const categories = formatMatchStats(stats, 10);
    const copyText = buildMatchStatsCopyText(categories);

    expect(copyText).not.toContain("Gols marcados");
    expect(copyText).not.toContain("Gols por jogo");
    expect(copyText).not.toContain("Vitórias");
    expect(copyText).toContain("Partidas: 10");
    expect(copyText).toContain("xG médio");
  });
});

