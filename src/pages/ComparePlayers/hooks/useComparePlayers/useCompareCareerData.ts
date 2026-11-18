import { useMemo } from "react";
import { AugmentedCareer } from "../../../../common/interfaces/ComparePlayers";
import { useCareers } from "../../../../common/hooks/Career/UseCareer";
import { augmentCareerWithMatchStats } from "../../../../common/stats/helpers/mergeMatchStats";

export const useCompareCareerData = (careerId?: string) => {
  const { careers, loading } = useCareers();

  const career = useMemo(
    () => careers.find((c) => c.id === careerId),
    [careers, careerId],
  );

  const augmentedCareer = useMemo(
    () =>
      (career
        ? augmentCareerWithMatchStats(career)
        : null) as AugmentedCareer | null,
    [career],
  );

  const latestSeasonPlayerIds = useMemo(() => {
    if (!augmentedCareer?.clubData || augmentedCareer.clubData.length === 0) {
      return new Set<string>();
    }

    const latestSeason = augmentedCareer.clubData.reduce(
      (max, s) => (s.seasonNumber > max.seasonNumber ? s : max),
      augmentedCareer.clubData[0],
    );

    const ids = new Set<string>();
    latestSeason.players.forEach((p) => {
      if (p.sell === false) {
        ids.add(String(p.id));
      }
    });
    return ids;
  }, [augmentedCareer]);

  return {
    careers,
    career,
    augmentedCareer,
    latestSeasonPlayerIds,
    isLoading: loading,
  };
};

