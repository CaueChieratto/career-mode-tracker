import { Match } from "../../../../../../../../../../../common/interfaces/Match";
import { getContinentByCountry } from "../../../../../../../../../../../common/utils/league";
import {
  formatContractDisplay,
  formatMonthsDuration,
  getContractInMonths,
} from "./FormatContract";
import { getLatestFinishedMatch } from "./getLatestFinishedMatch";

const parseArrivalMonthYear = (
  val: unknown,
  seasonStartYear: number,
  isEuropean: boolean,
  fallbackYear: number,
): { month: number; year: number } | null => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return { month: val.getMonth() + 1, year: val.getFullYear() };
  }
  if (
    typeof val === "object" &&
    typeof (val as { toDate?: () => unknown }).toDate === "function"
  ) {
    const d = (val as { toDate: () => unknown }).toDate();
    if (d instanceof Date && !isNaN(d.getTime())) {
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (trimmed.includes("/")) {
      const parts = trimmed.split("/").map(Number);
      const m = parts[1];
      if (!isNaN(m) && m >= 1 && m <= 12) {
        let y = parts[2];
        if (isNaN(y)) {
          y = isEuropean
            ? m >= 7
              ? seasonStartYear
              : seasonStartYear + 1
            : fallbackYear;
        } else if (y < 100) {
          y += 2000;
        }
        return { month: m, year: y };
      }
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }
  }
  return null;
};

export const getVisualContract = (
  contractTime: number,
  matchesOrLatestDate: Match[] | string | null = null,
  careerNationOrIsEuropean: string | boolean = true,
  arrivalDateOrMonth?: string | Date | null,
): string => {
  let latestDate: string | null = null;
  if (Array.isArray(matchesOrLatestDate)) {
    const latest = getLatestFinishedMatch(matchesOrLatestDate);
    latestDate = latest?.date || null;
  } else if (typeof matchesOrLatestDate === "string") {
    latestDate = matchesOrLatestDate;
  }
  if (!latestDate) return formatContractDisplay(contractTime);

  const isEuropean =
    typeof careerNationOrIsEuropean === "boolean"
      ? careerNationOrIsEuropean
      : typeof careerNationOrIsEuropean === "string"
        ? getContinentByCountry(careerNationOrIsEuropean) === "Europa"
        : true;

  const originalMonths = getContractInMonths(contractTime);
  const [, month, rawYear] = latestDate.split("/").map(Number);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;

  let diffMonths = 0;

  if (isEuropean) {
    const seasonStartYear = month >= 7 ? year : year - 1;
    const baseIndex = seasonStartYear * 12 + 7;
    const currentIndex = year * 12 + month;

    const parsedArrival = parseArrivalMonthYear(
      arrivalDateOrMonth,
      seasonStartYear,
      true,
      year,
    );

    if (parsedArrival) {
      const arrivalIndex = parsedArrival.year * 12 + parsedArrival.month;
      diffMonths = currentIndex - arrivalIndex;
    } else {
      diffMonths = currentIndex - baseIndex;
    }
  } else {
    const baseIndex = year * 12 + 1;
    const currentIndex = year * 12 + month;

    const parsedArrival = parseArrivalMonthYear(
      arrivalDateOrMonth,
      year,
      false,
      year,
    );

    if (parsedArrival) {
      const arrivalIndex = parsedArrival.year * 12 + parsedArrival.month;
      diffMonths = currentIndex - arrivalIndex;
    } else {
      diffMonths = currentIndex - baseIndex;
    }
  }

  const remainingMonths = Math.round(originalMonths - Math.max(0, diffMonths));

  return formatMonthsDuration(remainingMonths);
};
