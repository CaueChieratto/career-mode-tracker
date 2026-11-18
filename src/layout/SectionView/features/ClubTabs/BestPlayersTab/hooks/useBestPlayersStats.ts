import { useMemo } from "react";
import { ClubData } from "../../../../../../common/interfaces/club/clubData";
import { Career } from "../../../../../../common/interfaces/Career";
import { AggregatedPlayerStats } from "../../../../../../common/interfaces/AggregatedPlayerStats/AggregatedPlayerStats";
import { aggregateAllPlayersStats } from "../../../../../../common/stats";

export const useBestPlayersStats = (
  season: ClubData,
  career: Career,
  isGeralPage: boolean,
  minPercentage: number = 0.2,
): AggregatedPlayerStats[] => {
  const careerSeasonsData = useMemo(() => {
    if (!isGeralPage) return [];

    return (career.clubData || []).map((s) => ({
      clubName:
        (s as unknown as { clubName?: string }).clubName || career.clubName,
      season: s,
    }));
  }, [career, isGeralPage]);

  return useMemo(() => {
    return aggregateAllPlayersStats({
      season,
      career,
      isGeralPage,
      minPercentage,
      careerSeasonsData,
    }) as AggregatedPlayerStats[];
  }, [season, career, isGeralPage, minPercentage, careerSeasonsData]);
};
