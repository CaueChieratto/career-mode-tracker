import { parseBrasilDate, parseFullBrasilDate } from "../../../../utils/Date";

function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  if (input.includes("/")) {
    const parsed = parseFullBrasilDate(input);
    if (parsed) return parsed;
  }
  return new Date(input);
}

/**
 * Converte DD/MM considerando a virada de ano entre startDate e endDate
 * e retorna a data completa formatada (DD/MM/YYYY).
 */
export function resolveSeasonDate(
  dayMonth: string,
  startDateInput: string | Date,
  endDateInput: string | Date,
): string {
  if (!dayMonth) return "";

  const parts = dayMonth.trim().split("/");
  if (parts.length === 3) {
    return dayMonth.trim();
  }

  const [dayStr, monthStr] = parts;
  const day = Number(dayStr);
  const month = Number(monthStr);

  if (!day || !month || isNaN(day) || isNaN(month)) {
    return dayMonth;
  }

  const start = toDate(startDateInput);
  const end = toDate(endDateInput);

  const m = month - 1;
  const year = m < start.getMonth() ? end.getFullYear() : start.getFullYear();

  const parsed = parseBrasilDate(`${dayStr}/${monthStr}`, year);
  if (parsed) {
    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const yyyy = String(parsed.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

