import { getContinentByCountry } from "./league";

export const isFirestoreTimestamp = (
  val: unknown,
): val is { seconds: number; nanoseconds?: number; toDate?: () => Date } =>
  Boolean(
    val && typeof val === "object" && ("seconds" in val || "toDate" in val),
  );

export const getValidDate = (dateInput: unknown): Date => {
  if (!dateInput) return new Date(0);
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? new Date(0) : dateInput;
  }
  if (isFirestoreTimestamp(dateInput)) {
    if (typeof dateInput.toDate === "function") return dateInput.toDate();
    return new Date(dateInput.seconds * 1000);
  }
  if (typeof dateInput === "string" || typeof dateInput === "number") {
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
  return new Date(0);
};

export const isEuropeanSeason = (nation?: string): boolean =>
  Boolean(nation && getContinentByCountry(nation) === "Europa");

export const getSeasonStartYear = (
  createdAt: unknown,
  seasonNumber: number,
): number => {
  const validDate = getValidDate(createdAt);
  const baseYear =
    validDate.getTime() === 0
      ? new Date().getFullYear()
      : validDate.getFullYear();
  return baseYear + (seasonNumber - 1);
};

export const formatSeasonShortLabel = (
  createdAt: unknown,
  nation: string | undefined,
  seasonNumber: number,
): string => {
  const startYear = getSeasonStartYear(createdAt, seasonNumber);
  if (isEuropeanSeason(nation)) {
    const endYear = startYear + 1;
    return `${String(startYear).slice(-2)}/${String(endYear).slice(-2)}`;
  }
  return `${startYear}`;
};

export function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 8);

  if (limited.length <= 2) return limited;
  if (limited.length <= 4) {
    return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  }

  return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4, 8)}`;
}

export function formatDateInputShort(value: string) {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 4);

  if (limited.length <= 2) return limited;
  return `${limited.slice(0, 2)}/${limited.slice(2)}`;
}

export function parseFullBrasilDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const [day, month, year] = dateStr.split("/");
  if (!day || !month || !year) return null;

  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1;
  let y = parseInt(year, 10);

  if (year.length === 2) {
    y = 2000 + y;
  }

  const parsed = new Date(y, m, d);

  if (
    parsed.getFullYear() !== y ||
    parsed.getMonth() !== m ||
    parsed.getDate() !== d
  ) {
    return null;
  }

  return parsed;
}

export function parseBrasilDate(dateStr: string, year: number): Date | null {
  if (!dateStr) return null;

  const [day, month] = dateStr.split("/");
  if (!day || !month) return null;

  const d = parseInt(day, 10);
  const m = parseInt(month, 10) - 1;

  const parsed = new Date(year, m, d);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== m ||
    parsed.getDate() !== d
  ) {
    return null;
  }

  return parsed;
}

export function formatFullBrasilDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function brasilDatePlaceholder(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function brasilDatePlaceholderShort(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}
