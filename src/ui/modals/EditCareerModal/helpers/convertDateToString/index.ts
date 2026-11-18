import {
  formatFullBrasilDate,
  getValidDate,
} from "../../../../../common/utils/Date";

export const convertDateToString = (date: unknown): string => {
  if (!date) return "";

  const d = getValidDate(date);
  if (d.getTime() === 0) return "";

  return formatFullBrasilDate(d);
};
