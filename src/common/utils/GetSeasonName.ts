import { formatSeasonShortLabel } from "./Date";

export const getSeasonName = (
  seasonNumber: number,
  careerCreatedAt: unknown,
  nation: string,
): string => {
  return formatSeasonShortLabel(careerCreatedAt, nation, seasonNumber);
};
