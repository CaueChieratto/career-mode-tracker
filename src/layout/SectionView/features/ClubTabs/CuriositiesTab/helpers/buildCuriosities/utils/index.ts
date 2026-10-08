import { Match } from "../../../../../../../../common/interfaces/Match";

export type GoalPeriod = "1T" | "2T" | "ET";

export const parseMinute = (minStr: string | number): number => {
  const str = String(minStr);
  if (str.includes("+")) {
    const [base, extra] = str.split("+");
    return Number(base) + Number(extra);
  }
  return Number(str.replace(/[^0-9]/g, ""));
};

/**
 * Classifica o período de um gol respeitando as regras estritas:
 * 1. 1º Tempo com acréscimos: formato "45+X" ou minNumber <= 45 + stoppage1T -> "1T"
 * 2. Prorrogação: partida SÓ é considerada com prorrogação se match.hasExtraTime === true.
 *    - Se hasExtraTime !== true, qualquer gol após o 1T (inclusive 96', 99') pertence ao "2T".
 *    - Se hasExtraTime === true, gols <= 90 + stoppage2T ou "90+X" são "2T", e acima disso são "ET".
 */
export const getGoalPeriod = (
  minNumber: number,
  rawMinuteStr: string | number,
  match?: Match,
): GoalPeriod => {
  const str = String(rawMinuteStr);
  const stoppage1 = match?.stoppage1T || 0;
  const stoppage2 = match?.stoppage2T || 0;

  // Formato explícito de acréscimo do 1º tempo (ex: "45+3", "45+5")
  if (str.includes("45+")) {
    return "1T";
  }

  // Minuto dentro do tempo regulamentar + acréscimos do 1º tempo
  if (minNumber <= 45 + stoppage1) {
    return "1T";
  }

  // Partida com Prorrogação (hasExtraTime === true)
  if (match?.hasExtraTime) {
    if (str.includes("90+") || minNumber <= 90 + stoppage2) {
      return "2T";
    }
    return "ET";
  }

  // Partida normal sem prorrogação: qualquer gol após o 1T é 2º tempo (inclusive nos acréscimos 90'+)
  return "2T";
};

/**
 * Retorna o intervalo do gráfico correspondente ao período do gol:
 * - 1T: "0-15'", "16-30'", "31-45+'" (gols aos 50' com stoppage1T caem em "31-45+'")
 * - 2T: "46-60'", "61-75'", "76-90+'" (gols aos 99' sem prorrogação caem em "76-90+'")
 * - ET: "91-105'", "106-120+'"
 */
export const getInterval = (
  min: number,
  period?: GoalPeriod,
): string => {
  if (period === "1T") {
    if (min <= 15) return "0-15'";
    if (min <= 30) return "16-30'";
    return "31-45+'";
  }

  if (period === "2T") {
    if (min <= 60) return "46-60'";
    if (min <= 75) return "61-75'";
    return "76-90+'";
  }

  if (period === "ET") {
    if (min <= 105) return "91-105'";
    return "106-120+'";
  }

  if (min <= 15) return "0-15'";
  if (min <= 30) return "16-30'";
  if (min <= 45) return "31-45'";
  if (min <= 60) return "46-60'";
  if (min <= 75) return "61-75'";
  return "76-90+'";
};

export const getTopN = (record: Record<string | number, number>, n = 5) =>
  Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label: String(label), count }));
