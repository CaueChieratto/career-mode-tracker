import { parseFullBrasilDate } from "../../../../../common/utils/Date";

export const convertStringToDate = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr.length < 10) return undefined;
  return parseFullBrasilDate(dateStr) ?? undefined;
};
