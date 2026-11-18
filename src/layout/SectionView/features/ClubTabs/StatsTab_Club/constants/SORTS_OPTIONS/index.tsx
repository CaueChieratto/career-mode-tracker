import { isMetricEnabledForClubTab } from "../../../../../../../common/stats/registry/metricsRegistry";

export const ALL_SORTS_CONFIG = [
  { label: "Ordenar por padrão", metricId: null },
  { label: "Ordenar por posições", metricId: null },
  { label: "Ordenar por jogos", metricId: "games" },
  { label: "Ordenar por minutos", metricId: "minutesPlayed" },
  { label: "Ordenar por participações em gols", metricId: "goalParticipations" },
  { label: "Ordenar por gols", metricId: "goals" },
  { label: "Ordenar por assistencias", metricId: "assists" },
  { label: "Ordenar por nota média", metricId: "avgRating" },
  { label: "Ordenar por jogos sem sofrer gols", metricId: "cleanSheets" },
  { label: "Ordenar por defesas", metricId: "defenses" },
];

export const getVisibleSortOptions = (): string[] => {
  return ALL_SORTS_CONFIG.filter((opt) => {
    if (!opt.metricId) return true;
    return isMetricEnabledForClubTab(opt.metricId);
  }).map((opt) => opt.label);
};
