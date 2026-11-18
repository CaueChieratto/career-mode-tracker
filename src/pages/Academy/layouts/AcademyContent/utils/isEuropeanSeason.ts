import { Career } from "../../../../../common/interfaces/Career";
import { isEuropeanSeason as isEuropeanSeasonByNation } from "../../../../../common/utils/Date";

export const isEuropeanSeason = (career: Career): boolean => {
  return isEuropeanSeasonByNation(career.nation);
};
