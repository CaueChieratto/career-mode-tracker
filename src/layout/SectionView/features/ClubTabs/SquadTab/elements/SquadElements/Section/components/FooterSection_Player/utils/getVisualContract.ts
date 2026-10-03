import { Match } from "../../../../../../../../../../../common/interfaces/Match";
import { getContinentByCountry } from "../../../../../../../../../../../common/services/GetContinentByCountry";
import { formatContractDisplay, getContractInMonths } from "./FormatContract";
import { getLatestFinishedMatch } from "./getLatestFinishedMatch";

export const getVisualContract = (
  contractTime: number,
  matches: Match[],
  careerNationOrIsEuropean: string | boolean = true,
): string => {
  const latest = getLatestFinishedMatch(matches);
  if (!latest) return formatContractDisplay(contractTime);

  const isEuropean =
    typeof careerNationOrIsEuropean === "boolean"
      ? careerNationOrIsEuropean
      : typeof careerNationOrIsEuropean === "string"
      ? getContinentByCountry(careerNationOrIsEuropean) === "Europa"
      : true;

  const originalMonths = getContractInMonths(contractTime);
  const [, month, rawYear] = latest.date.split("/").map(Number);
  const year = rawYear < 100 ? 2000 + rawYear : rawYear;

  let diffMonths = 0;

  if (isEuropean) {
    const seasonStartYear = month >= 7 ? year : year - 1;
    const baseIndex = seasonStartYear * 12 + 7;
    const currentIndex = year * 12 + month;
    diffMonths = currentIndex - baseIndex;
  } else {
    const baseIndex = year * 12 + 1;
    const currentIndex = year * 12 + month;
    diffMonths = currentIndex - baseIndex;
  }

  const remainingMonths = originalMonths - Math.max(0, diffMonths);

  if (remainingMonths <= 0) return "Expirado";

  const years = Math.floor(remainingMonths / 12);
  const months = remainingMonths % 12;

  if (years === 0) {
    return months === 1 ? `${months} Mês` : `${months} Meses`;
  }

  if (months === 0) {
    return years === 1 ? `${years} Ano` : `${years} Anos`;
  }

  return `${years}A. ${months}M.`;
};
