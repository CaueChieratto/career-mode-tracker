import { PlayerStatsDisplay } from "../../../common/interfaces/ComparePlayers";
import { getCategorizedMetricsForCompare } from "../../../common/stats";

type StatKey = keyof PlayerStatsDisplay;

export interface StatItem {
  label: string;
  key: StatKey;
  isRating?: boolean;
}

export interface StatCategory {
  title: string;
  stats: StatItem[];
}

export const getStatsCategories = (
  compareMode: "season" | "total" | "none",
): StatCategory[] => {
  const categorized = getCategorizedMetricsForCompare(compareMode);

  return categorized.map((cat) => ({
    title: cat.title,
    stats: cat.stats.map((metric) => ({
      label: metric.labels.comparePlayers || metric.labels.default,
      key: (metric.id === "avgRating" ? "rating" : metric.id) as StatKey,
      isRating: metric.isRating,
    })),
  }));
};
