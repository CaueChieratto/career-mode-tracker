import { usePersistedSortOption } from "../../../StatsTab_Club/hooks/usePersistedSortOption";

export const useSquadSort = (seasonId: string) => {
  const { sortOption, setSortOption, isReversed } = usePersistedSortOption(
    seasonId,
    "squadSort",
  );

  return {
    sortOption,
    isAsc: isReversed,
    handleSortChange: setSortOption,
  };
};
