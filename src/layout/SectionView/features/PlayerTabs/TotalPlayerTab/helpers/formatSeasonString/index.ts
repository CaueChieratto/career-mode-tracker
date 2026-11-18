import { formatSeasonShortLabel } from "../../../../../../../common/utils/Date";

export const formatSeasonString = (
  createdAt: unknown,
  seasonNumber: number,
  nation?: string,
): string => formatSeasonShortLabel(createdAt, nation, seasonNumber);
