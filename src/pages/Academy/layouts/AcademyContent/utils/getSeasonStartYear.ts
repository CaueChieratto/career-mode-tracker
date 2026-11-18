import { Career } from "../../../../../common/interfaces/Career";
import { getSeasonStartYear as getSeasonStartYearFromDate } from "../../../../../common/utils/Date";

export const getSeasonStartYear = (
  career: Career,
  seasonId: string,
): number => {
  const currentSeason = career.clubData.find((s) => s.id === seasonId);
  const seasonNumber = currentSeason?.seasonNumber || 1;
  return getSeasonStartYearFromDate(career.createdAt, seasonNumber);
};
