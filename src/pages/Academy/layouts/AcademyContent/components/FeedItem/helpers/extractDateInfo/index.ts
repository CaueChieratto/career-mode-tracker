import { getSeasonMonthWeight } from "../../../Player/components/PlayerDevelopment/utils/getSeasonMonthWeight";

export interface ExtractedAcademyDateInfo {
  day: number;
  month: number;
  monthWeight: number;
  formattedDate: string;
  year: number;
  seasonYear: number;
}

export const extractDateInfo = (
  dateStr: string,
  isEurope: boolean,
  fallbackYear?: number,
): ExtractedAcademyDateInfo => {
  const defaultYear = fallbackYear ?? new Date().getFullYear();

  if (!dateStr) {
    return {
      day: 0,
      month: 1,
      monthWeight: 0,
      formattedDate: "",
      year: defaultYear,
      seasonYear: defaultYear,
    };
  }

  try {
    let dayStr = "";
    let monthStr = "";
    let yearStr = "";

    if (dateStr.includes(" - ")) {
      const [datePart, seasonPart] = dateStr.split(" - ");
      const [d, m] = datePart.split("/");
      dayStr = d;
      monthStr = m;
      if (seasonPart.includes("/")) {
        const [startYY, endYY] = seasonPart.split("/");
        const monthNum = parseInt(m, 10);
        yearStr =
          isEurope && monthNum >= 7 ? startYY : isEurope ? endYY : startYY;
      } else {
        yearStr = seasonPart;
      }
    } else if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      dayStr = parts[0];
      monthStr = parts[1];
      yearStr = parts[2] || "";
    }

    const day = parseInt(dayStr, 10) || 0;
    const month = parseInt(monthStr, 10) || 1;
    const monthWeight = getSeasonMonthWeight(month, isEurope);

    const parsedYear = yearStr ? parseInt(yearStr, 10) : NaN;
    let rawYear = !isNaN(parsedYear) ? parsedYear : defaultYear;
    if (rawYear > 0 && rawYear < 100) rawYear += 2000;

    const seasonYear =
      isEurope && month < 7 && rawYear > 0 ? rawYear - 1 : rawYear;

    const finalYear = String(rawYear).slice(-2).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const formattedMonth = String(month).padStart(2, "0");

    return {
      day,
      month,
      monthWeight,
      formattedDate: `${formattedDay}/${formattedMonth}/${finalYear}`,
      year: rawYear,
      seasonYear,
    };
  } catch {
    return {
      day: 0,
      month: 1,
      monthWeight: 0,
      formattedDate: dateStr,
      year: defaultYear,
      seasonYear: defaultYear,
    };
  }
};

export const compareAcademyDates = (
  dateA: string,
  dateB: string,
  isEurope: boolean,
  fallbackYear?: number,
): number => {
  const infoA = extractDateInfo(dateA, isEurope, fallbackYear);
  const infoB = extractDateInfo(dateB, isEurope, fallbackYear);

  if (infoA.seasonYear !== infoB.seasonYear) {
    return infoA.seasonYear - infoB.seasonYear;
  }
  if (infoA.monthWeight !== infoB.monthWeight) {
    return infoA.monthWeight - infoB.monthWeight;
  }
  return infoA.day - infoB.day;
};
