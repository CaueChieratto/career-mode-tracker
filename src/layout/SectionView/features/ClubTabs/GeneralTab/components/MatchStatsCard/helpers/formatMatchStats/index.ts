import { AggregatedStats } from "../calculateMatchStats";
import { isMetricEnabledForMatchStatsCard } from "../../../../../../../../../common/stats/registry/metricsRegistry";

export type MatchStatItem = {
  name: string;
  value: string | number;
  metricId?: string;
};

export type MatchStatCategory = {
  title: string;
  stats: MatchStatItem[];
};

export const formatMatchStats = (
  stats: AggregatedStats,
  totalMatches: number,
): MatchStatCategory[] => {
  const avg = (value: number, digits = 1) =>
    (value / totalMatches).toFixed(digits);

  const avgRating =
    stats.ratingCount > 0
      ? (stats.totalRating / stats.ratingCount).toFixed(2)
      : "0.00";

  const passesPercentage =
    stats.totalPasses > 0
      ? Math.round((stats.totalPassesCompleted / stats.totalPasses) * 100)
      : 0;

  const missedPasses = stats.totalPasses - stats.totalPassesCompleted;
  const missedPassesPercentage =
    stats.totalPasses > 0
      ? Math.round((missedPasses / stats.totalPasses) * 100)
      : 0;

  const avgPossession = Math.round(stats.totalPossession / totalMatches);

  const avgFinishingsOffTarget = (
    (stats.totalFinishings - stats.totalFinishingsOnTarget) /
    totalMatches
  ).toFixed(1);

  const rawCategories: MatchStatCategory[] = [
    {
      title: "Geral",
      stats: [
        { name: "Partidas", value: totalMatches, metricId: "games" },
        { name: "Vitórias", value: stats.wins, metricId: "wins" },
        { name: "Empates", value: stats.draws, metricId: "draws" },
        { name: "Derrotas", value: stats.losses, metricId: "losses" },
      ],
    },
    {
      title: "Atacando",
      stats: [
        { name: "Gols marcados", value: stats.goalsScored, metricId: "goals" },
        { name: "Gols por jogo", value: avg(stats.goalsScored), metricId: "goals" },
        { name: "xG médio", value: avg(stats.totalXG, 2), metricId: "xg" },
        { name: "Finalizações por jogo", value: avg(stats.totalFinishings), metricId: "totalFinishings" },
        {
          name: "Chutes no alvo por jogo",
          value: avg(stats.totalFinishingsOnTarget),
          metricId: "finishingsOnTarget",
        },
        {
          name: "Chutes fora por jogo",
          value: avgFinishingsOffTarget,
          metricId: "finishingsMissed",
        },
      ],
    },
    {
      title: "Passes",
      stats: [
        { name: "Posse de bola média", value: `${avgPossession}%`, metricId: "possession" },
        { name: "Total de passes", value: stats.totalPasses, metricId: "totalPasses" },
        { name: "Assistências", value: stats.totalAssists, metricId: "assists" },
        {
          name: "Passes certos",
          value: `${stats.totalPassesCompleted} (${passesPercentage}%)`,
          metricId: "passesCompleted",
        },
        {
          name: "Passes errados",
          value: `${missedPasses} (${missedPassesPercentage}%)`,
          metricId: "passesMissed",
        },
        { name: "Passes decisivos", value: stats.totalKeyPasses, metricId: "keyPasses" },
        {
          name: "Passes decisivos por jogo",
          value: avg(stats.totalKeyPasses),
          metricId: "keyPasses",
        },
      ],
    },
    {
      title: "Defendendo",
      stats: [
        { name: "Jogos sem sofrer gol", value: stats.cleanSheets, metricId: "cleanSheets" },
        { name: "Gols sofridos", value: stats.goalsConceded, metricId: "goalsConceded" },
        {
          name: "Gols sofridos por jogo",
          value: avg(stats.goalsConceded),
          metricId: "goalsConceded",
        },
        { name: "Defesas por jogo", value: avg(stats.totalDefenses), metricId: "defenses" },
        {
          name: "Tempo médio para recuperar a bola",
          value: `${avg(stats.totalBallRecoveryTime)}s`,
          metricId: "ballRecoveryTime",
        },
        {
          name: "Bolas recuperadas por jogo",
          value: avg(stats.totalBallsRecovered),
          metricId: "ballsRecovered",
        },
        {
          name: "Bolas perdidas por jogo",
          value: avg(stats.totalBallsLost),
          metricId: "ballsLost",
        },
      ],
    },
    {
      title: "Outros",
      stats: [
        { name: "Nota média do time", value: avgRating, metricId: "avgRating" },
        {
          name: "Cartões amarelos",
          value: `${stats.totalYellowCards} (${avg(stats.totalYellowCards)})`,
          metricId: "yellowCards",
        },
        {
          name: "Cartões vermelhos",
          value: `${stats.totalRedCards} (${avg(stats.totalRedCards)})`,
          metricId: "redCards",
        },
      ],
    },
  ];

  return rawCategories
    .map((category) => ({
      ...category,
      stats: category.stats.filter((stat) =>
        stat.metricId ? isMetricEnabledForMatchStatsCard(stat.metricId) : true,
      ),
    }))
    .filter((category) => category.stats.length > 0);
};
