import { getSeasonStartYear, isEuropeanSeason } from "./Date";

const ISO_EUROPEAN_CODES = [
  "ESP",
  "ENG",
  "FRA",
  "GER",
  "ITA",
  "POR",
  "NED",
  "BEL",
  "TUR",
  "SCO",
];

export const getSeasonDateRange = (
  seasonNumber: number,
  careerCreatedAt: unknown,
  nation: string,
): { startDate: Date; endDate: Date } => {
  const isEuropean =
    isEuropeanSeason(nation) ||
    ISO_EUROPEAN_CODES.includes(nation?.toUpperCase?.());

  const startYear = getSeasonStartYear(careerCreatedAt, seasonNumber);

  let startDate: Date;
  let endDate: Date;

  if (isEuropean) {
    startDate = new Date(startYear, 6, 1);
    endDate = new Date(startYear + 1, 5, 30, 23, 59, 59, 999);
  } else {
    startDate = new Date(startYear, 0, 1);
    endDate = new Date(startYear, 11, 31, 23, 59, 59, 999);
  }

  return { startDate, endDate };
};
