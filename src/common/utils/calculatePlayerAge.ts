import { Match } from "../interfaces/Match";
import { getSeasonDateRange } from "./GetSeasonDateRange";
import { resolveSeasonDate } from "../services/ServicePlayers/helpers/resolveSeasonDate";
import { getValidDate, parseFullBrasilDate } from "./Date";

/**
 * Calcula a idade de um atleta com base em sua data de nascimento (DD/MM/AAAA)
 * e no marco temporal da temporada:
 * - A temporada inicia em 01/07 para calendários europeus ou 01/01 para os demais.
 * - Conforme partidas finalizadas são registradas, a data de corte avança até a data
 *   da última partida finalizada, permitindo que o atleta faça aniversário durante a temporada.
 */
export const calculatePlayerAge = (
  birthDate?: string | null,
  careerCreatedAt?: unknown,
  seasonNumber: number = 1,
  careerNation?: string | null,
  matches?: Match[] | null,
): number => {
  if (!birthDate || typeof birthDate !== "string" || !birthDate.includes("/")) {
    return 0;
  }

  const parts = birthDate.trim().split("/");
  if (parts.length !== 3) return 0;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const birthYear = Number(parts[2]);

  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(birthYear) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    birthYear < 1900 ||
    birthYear > 2100
  ) {
    return 0;
  }

  const careerStartDate = careerCreatedAt
    ? getValidDate(careerCreatedAt)
    : new Date();

  const safeCareerStartDate =
    careerStartDate.getTime() === 0 || isNaN(careerStartDate.getTime())
      ? new Date()
      : careerStartDate;

  const { startDate, endDate } = getSeasonDateRange(
    seasonNumber,
    safeCareerStartDate,
    careerNation || "ESP",
  );

  let referenceDate = new Date(startDate);

  if (matches && matches.length > 0) {
    const finishedMatches = matches.filter(
      (m) =>
        m.status === "FINISHED" ||
        m.result === "V" ||
        m.result === "E" ||
        m.result === "D",
    );

    for (const match of finishedMatches) {
      if (!match.date) continue;
      const fullDateStr = resolveSeasonDate(match.date, startDate, endDate);
      const parsedMatchDate = parseFullBrasilDate(fullDateStr);
      if (parsedMatchDate && parsedMatchDate > referenceDate) {
        referenceDate = parsedMatchDate;
      }
    }
  }

  let age = referenceDate.getFullYear() - birthYear;
  const refMonth = referenceDate.getMonth(); // 0-11
  const refDay = referenceDate.getDate();

  const birthMonthZeroIndexed = month - 1; // 0-11
  if (
    refMonth < birthMonthZeroIndexed ||
    (refMonth === birthMonthZeroIndexed && refDay < day)
  ) {
    age--;
  }

  return Math.max(0, age);
};
