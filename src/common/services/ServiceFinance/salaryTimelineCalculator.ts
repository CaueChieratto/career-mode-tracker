import { ClubData } from "../../interfaces/club/clubData";
import { Players } from "../../interfaces/playersInfo/players";
import { Contract } from "../../interfaces/playersInfo/contract";
import { Match } from "../../interfaces/Match";
import { getSeasonDateRange } from "../../utils/GetSeasonDateRange";
import { resolveSeasonDate } from "../ServicePlayers/helpers/resolveSeasonDate";
import { parseFullBrasilDate } from "../../utils/Date";
import { parseValue } from "../../utils/FormatValue";
import {
  checkIsIncomingLoanExit,
  checkIsLoanReturnArrival,
} from "../ServicePlayers/helpers/contractHelpers";
import { isNextSeasonTiming } from "../ServicePlayers/helpers/transferTimingHelpers";

export interface SalaryTimelineCalculatorParams {
  career: {
    createdAt?: Date | string | null;
    nation?: string | null;
  };
  season: ClubData;
}

export interface CalculatedSalaryEntry {
  id: string;
  matchId: string;
  amount: number;
  date: string;
  description: string;
  fromDayMonth: string;
  toDayMonth: string;
  days: number;
}

export interface ConsolidatedSalaryExpense {
  id: string;
  seasonId: string;
  lastMatchId: string;
  amount: number;
  date: string;
  description: string;
  fromDayMonth: string;
  toDayMonth: string;
  totalDays: number;
  intervals: CalculatedSalaryEntry[];
}

/**
 * Normaliza uma data para UTC meia-noite (00:00:00.000)
 * para cálculos consistentes de diferença em dias sem interferência de fuso horário.
 */
export function normalizeDateToUTC(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Calcula a diferença em dias corridos entre duas datas.
 */
export function getDaysDifference(start: Date, end: Date): number {
  const t1 = normalizeDateToUTC(start).getTime();
  const t2 = normalizeDateToUTC(end).getTime();
  return Math.max(0, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
}

/**
 * Formata um objeto Date para o formato brasileiro curto DD/MM.
 */
export function formatDayMonthShort(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

/**
 * Converte qualquer formato de data (Date, timestamp, ISO ou DD/MM/AAAA)
 * em um objeto Date normalizado no contexto da temporada.
 */
export function parseContractDate(
  rawDate: unknown,
  seasonStartDate: Date,
  seasonEndDate: Date,
): Date | null {
  if (!rawDate) return null;

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return normalizeDateToUTC(rawDate);
  }

  // Objeto Timestamp do Firestore (com toDate)
  if (
    typeof rawDate === "object" &&
    rawDate !== null &&
    "toDate" in rawDate &&
    typeof (rawDate as { toDate: () => Date }).toDate === "function"
  ) {
    const d = (rawDate as { toDate: () => Date }).toDate();
    if (d instanceof Date && !isNaN(d.getTime())) {
      return normalizeDateToUTC(d);
    }
  }

  if (typeof rawDate === "string") {
    const trimmed = rawDate.trim();
    if (!trimmed) return null;

    if (trimmed.includes("/")) {
      const resolved = resolveSeasonDate(trimmed, seasonStartDate, seasonEndDate);
      const parsed = parseFullBrasilDate(resolved);
      if (parsed) return normalizeDateToUTC(parsed);
    }

    const isoParsed = new Date(trimmed);
    if (!isNaN(isoParsed.getTime())) {
      return normalizeDateToUTC(isoParsed);
    }
  }

  return null;
}

/**
 * Extrai o salário semanal líquido pago pelo clube de um contrato,
 * respeitando a porcentagem assumida pelo clube (`wagePercentage` ou `loanTerms?.ourWagePercentage`),
 * evitando duplo desconto quando `fullSalary` estiver presente, e aceitando fallback para `fallbackPlayerSalary`.
 */
export function getContractWeeklyWage(
  contract?: Contract | null,
  fallbackPlayerSalary?: number | string,
): number {
  if (!contract && fallbackPlayerSalary === undefined) return 0;

  // 1. Determinar a porcentagem salarial paga pelo clube (pct)
  let pct: number | undefined = undefined;
  if (
    contract?.wagePercentage !== undefined &&
    contract.wagePercentage !== null &&
    !isNaN(Number(contract.wagePercentage))
  ) {
    pct = Number(contract.wagePercentage);
  } else if (
    contract?.loanTerms?.ourWagePercentage !== undefined &&
    contract.loanTerms.ourWagePercentage !== null &&
    !isNaN(Number(contract.loanTerms.ourWagePercentage))
  ) {
    pct = Number(contract.loanTerms.ourWagePercentage);
  }

  // 2. Prioridade para fullSalary bruto sem duplo desconto
  const fullSalaryNum =
    contract?.fullSalary !== undefined && contract.fullSalary !== null
      ? Number(contract.fullSalary)
      : NaN;

  if (!isNaN(fullSalaryNum) && fullSalaryNum > 0) {
    const effectivePct = pct !== undefined ? pct : 100;
    return Math.round(fullSalaryNum * (effectivePct / 100));
  }

  // 3. Caso contrário, extrair raw de contract?.salary, contract?.contractDetails?.weeklyWage ou fallbackPlayerSalary
  let raw = 0;
  if (typeof contract?.salary === "number") {
    raw = contract.salary;
  } else if (typeof contract?.salary === "string" && contract.salary.trim()) {
    raw = parseValue(contract.salary);
  } else if (contract?.contractDetails?.weeklyWage) {
    raw = contract.contractDetails.weeklyWage;
  } else if (fallbackPlayerSalary !== undefined && fallbackPlayerSalary !== null) {
    raw =
      typeof fallbackPlayerSalary === "number"
        ? fallbackPlayerSalary
        : parseValue(String(fallbackPlayerSalary));
  }

  if (raw <= 0) return 0;

  // 4. Se pct === 0 (clube parceiro paga 100% do salário no empréstimo), retornar 0
  if (pct === 0) return 0;

  // 5. Se fullSalary não estiver definido, mas contract?.isLoan for true e pct estiver definido (0 <= pct <= 100), aplicar Math.round(raw * (pct / 100))
  if (contract?.isLoan && pct !== undefined && pct >= 0 && pct <= 100) {
    return Math.round(raw * (pct / 100));
  }

  // Caso normal (sem percentual reduzido)
  return Math.round(raw);
}

/**
 * Determina o salário semanal que o clube está pagando para um atleta específico
 * em uma data de referência `targetDate`.
 */
export function getPlayerWeeklyWageAtDate(
  player: Players,
  targetDate: Date,
  seasonStartDate: Date,
  seasonEndDate: Date,
): number {
  const normalizedTarget = normalizeDateToUTC(targetDate);
  const normalizedSeasonStart = normalizeDateToUTC(seasonStartDate);

  // Extrair salário base na raiz do atleta (ou contractDetails)
  const rootSalary =
    typeof player.salary === "number"
      ? player.salary
      : parseValue(String(player.salary || 0));
  const effectiveRootSalary =
    rootSalary > 0
      ? rootSalary
      : player.contractDetails?.weeklyWage || 0;

  // 1. Filtrar contratos ignorando transferências agendadas para a próxima temporada
  const allContracts = player.contract || [];
  const seasonContracts = allContracts.filter(
    (c) => !isNextSeasonTiming(c.timing),
  );

  // Se não possui contratos aplicáveis na temporada, recorre às propriedades da raiz
  if (seasonContracts.length === 0) {
    if (player.sell) return 0;
    return effectiveRootSalary > 0 ? effectiveRootSalary : 0;
  }

  // 2. Identificar saída definitiva do atleta (venda, aposentadoria, fim de contrato ou retorno de empréstimo de chegada encerrado)
  let exitDate: Date | null = null;
  for (const c of seasonContracts) {
    const isPermanentExit =
      (Boolean(c.leftClub) && !c.isLoan && !c.isRenewal) ||
      (Boolean(player.incomingLoan || (c.isLoan && c.fromClub)) && Boolean(c.dataExit)) ||
      checkIsIncomingLoanExit(player, c, "exit");

    if (isPermanentExit && c.dataExit) {
      const parsed = parseContractDate(c.dataExit, seasonStartDate, seasonEndDate);
      if (parsed && (!exitDate || parsed > exitDate)) {
        exitDate = parsed;
      }
    }
  }

  // Se o atleta saiu definitivamente e a data alvo é igual ou posterior à saída, salário é 0
  if (exitDate && normalizedTarget >= exitDate) {
    return 0;
  }
  // Se player.sell for true mas não há exitDate registrado em contrato, o atleta já foi vendido
  if (player.sell && !exitDate) {
    return 0;
  }

  // 3. Identificar contratação / chegada na temporada
  let arrivalDate: Date | null = null;
  const isArrivalPlayer = Boolean(
    player.buy ||
      player.incomingLoan ||
      seasonContracts.some(
        (c) =>
          Boolean(c.fromClub) &&
          c.fromClub !== "Base" &&
          c.fromClub !== "Passes Livres" &&
          !c.isRenewal &&
          !checkIsLoanReturnArrival(player, c),
      ),
  );

  if (isArrivalPlayer) {
    for (const c of seasonContracts) {
      if (c.dataArrival && !c.isRenewal && !checkIsLoanReturnArrival(player, c)) {
        const parsed = parseContractDate(c.dataArrival, seasonStartDate, seasonEndDate);
        if (parsed && (!arrivalDate || parsed < arrivalDate)) {
          arrivalDate = parsed;
        }
      }
    }

    // Se o atleta chegou durante a temporada e a data alvo é anterior à chegada, salário é 0
    if (arrivalDate && arrivalDate > normalizedSeasonStart && normalizedTarget < arrivalDate) {
      return 0;
    }
  }

  // 4. Tratar atletas emprestados para fora (isLoan com leftClub) e eventual retorno na mesma temporada
  const loanOutContract = seasonContracts.find(
    (c) => c.isLoan && Boolean(c.leftClub) && !checkIsIncomingLoanExit(player, c, "exit"),
  );

  if (loanOutContract) {
    const loanExitDate = parseContractDate(
      loanOutContract.dataExit,
      seasonStartDate,
      seasonEndDate,
    );

    if (loanExitDate) {
      // Verificar se existe contrato de retorno de empréstimo subsequente nesta temporada
      let returnDate: Date | null = null;
      for (const c of seasonContracts) {
        if (
          c !== loanOutContract &&
          (c.fromClub === "Fim de Empréstimo" ||
            checkIsLoanReturnArrival(player, c) ||
            (c.dataArrival &&
              (parseContractDate(c.dataArrival, seasonStartDate, seasonEndDate)?.getTime() || 0) >
                loanExitDate.getTime()))
        ) {
          const parsedReturn = parseContractDate(
            c.dataArrival,
            seasonStartDate,
            seasonEndDate,
          );
          if (parsedReturn && parsedReturn > loanExitDate) {
            if (!returnDate || parsedReturn < returnDate) {
              returnDate = parsedReturn;
            }
          }
        }
      }

      // Se normalizedTarget >= loanExitDate e ainda não retornou, paga apenas a fatia acordada
      if (normalizedTarget >= loanExitDate && (!returnDate || normalizedTarget < returnDate)) {
        return getContractWeeklyWage(loanOutContract, effectiveRootSalary);
      }

      // Se normalizedTarget < loanExitDate: o empréstimo ainda não começou, clube pagava 100%
      if (normalizedTarget < loanExitDate) {
        const contractBeforeLoan = seasonContracts.find(
          (c) => c !== loanOutContract && !c.isLoan && (c.salary || c.fullSalary),
        );
        if (contractBeforeLoan) {
          const wage = getContractWeeklyWage(contractBeforeLoan, effectiveRootSalary);
          if (wage > 0) return wage;
        }
        return effectiveRootSalary > 0 ? effectiveRootSalary : 0;
      }

      // Se returnDate && normalizedTarget >= returnDate: já retornou, clube volta a pagar 100%
      if (returnDate && normalizedTarget >= returnDate) {
        const returnContract = seasonContracts.find(
          (c) =>
            c !== loanOutContract &&
            (c.fromClub === "Fim de Empréstimo" || checkIsLoanReturnArrival(player, c)),
        );
        if (returnContract && returnContract.salary) {
          const wage = getContractWeeklyWage(returnContract, effectiveRootSalary);
          if (wage > 0) return wage;
        }
        return effectiveRootSalary > 0 ? effectiveRootSalary : 0;
      }
    }
  }

  // 5. Tratar renovações contratuais (isRenewal) em ordem cronológica
  const renewalContracts = seasonContracts
    .filter((c) => c.isRenewal)
    .map((c) => ({
      contract: c,
      date: parseContractDate(c.dataArrival, seasonStartDate, seasonEndDate),
    }))
    .filter((item): item is { contract: Contract; date: Date } => item.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (renewalContracts.length > 0) {
    const firstRenewal = renewalContracts[0];

    // Se a data alvo é anterior à primeira renovação, o atleta recebia o salário anterior
    if (normalizedTarget < firstRenewal.date) {
      if (
        firstRenewal.contract.previousSalary !== undefined &&
        firstRenewal.contract.previousSalary !== null
      ) {
        const prev =
          typeof firstRenewal.contract.previousSalary === "number"
            ? firstRenewal.contract.previousSalary
            : parseValue(String(firstRenewal.contract.previousSalary));
        if (prev > 0) return prev;
      }
      // Fallback para contrato anterior ou effectiveRootSalary
      const olderContract = seasonContracts.find((c) => !c.isRenewal && c.salary);
      if (olderContract) {
        return getContractWeeklyWage(olderContract, effectiveRootSalary);
      }
      return effectiveRootSalary > 0 ? effectiveRootSalary : 0;
    }

    // Se normalizedTarget >= firstRenewal.date, pegar a última renovação cuja data seja <= normalizedTarget
    const activeRenewals = renewalContracts.filter((r) => normalizedTarget >= r.date);
    const currentRenewal = activeRenewals[activeRenewals.length - 1];
    return getContractWeeklyWage(currentRenewal.contract, effectiveRootSalary);
  }

  // 6. Contrato ativo regular / fallback padrão
  const activeContract = seasonContracts[0];
  const calculated = getContractWeeklyWage(activeContract, effectiveRootSalary);
  if (calculated > 0) {
    return calculated;
  }

  return effectiveRootSalary > 0 ? effectiveRootSalary : 0;
}

/**
 * Calcula a folha salarial semanal total do elenco do clube
 * em uma data específica `targetDate`.
 */
export function calculateSquadWeeklyWageAtDate(
  players: Players[] = [],
  targetDate: Date,
  seasonStartDate: Date,
  seasonEndDate: Date,
): number {
  let totalWage = 0;
  for (const player of players) {
    totalWage += getPlayerWeeklyWageAtDate(
      player,
      targetDate,
      seasonStartDate,
      seasonEndDate,
    );
  }
  return totalWage;
}

/**
 * Extrai e normaliza todas as partidas finalizadas da temporada em ordem cronológica de data.
 */
export function getSortedFinishedMatches(
  matches: Match[] = [],
  seasonStartDate: Date,
  seasonEndDate: Date,
): Array<{ match: Match; date: Date }> {
  const finishedList: Array<{ match: Match; date: Date }> = [];

  for (const m of matches) {
    if (m.status === "SCHEDULED") continue;

    const isFinished =
      m.status === "FINISHED" ||
      m.result === "V" ||
      m.result === "E" ||
      m.result === "D";

    if (!isFinished || !m.date) continue;

    const fullDateStr = resolveSeasonDate(
      m.date,
      seasonStartDate,
      seasonEndDate,
    );
    const parsed = parseFullBrasilDate(fullDateStr);
    if (parsed) {
      finishedList.push({
        match: m,
        date: normalizeDateToUTC(parsed),
      });
    }
  }

  // Ordenação cronológica estrita
  finishedList.sort((a, b) => a.date.getTime() - b.date.getTime());
  return finishedList;
}

/**
 * Coleta todas as datas em que ocorreram alterações salariais no elenco
 * (contratações, saídas ou renovações) dentro do intervalo [seasonStart, maxDate].
 */
export function getWageChangeDates(
  players: Players[] = [],
  seasonStartDate: Date,
  seasonEndDate: Date,
  maxDate: Date,
): Date[] {
  const datesSet = new Set<number>();
  const normalizedMax = normalizeDateToUTC(maxDate).getTime();
  const normalizedStart = normalizeDateToUTC(seasonStartDate).getTime();

  for (const player of players) {
    for (const c of player.contract || []) {
      if (isNextSeasonTiming(c.timing)) continue;

      if (c.dataArrival) {
        const d = parseContractDate(c.dataArrival, seasonStartDate, seasonEndDate);
        if (d) {
          const t = d.getTime();
          if (t > normalizedStart && t < normalizedMax) {
            datesSet.add(t);
          }
        }
      }
      if (c.dataExit) {
        const d = parseContractDate(c.dataExit, seasonStartDate, seasonEndDate);
        if (d) {
          const t = d.getTime();
          if (t > normalizedStart && t < normalizedMax) {
            datesSet.add(t);
          }
        }
      }
    }
  }

  return Array.from(datesSet)
    .sort((a, b) => a - b)
    .map((t) => new Date(t));
}

/**
 * Calcula todas as despesas salariais acumuladas por marco de partida finalizada
 * de forma proporcional por dias e estritamente idempotente.
 */
export function calculateSalaryExpenseEntries(
  params: SalaryTimelineCalculatorParams,
): CalculatedSalaryEntry[] {
  const { career, season } = params;

  const careerStartDate = career.createdAt
    ? new Date(career.createdAt)
    : new Date();
  const safeCareerStartDate = isNaN(careerStartDate.getTime())
    ? new Date()
    : careerStartDate;

  const { startDate: seasonStartDate, endDate: seasonEndDate } =
    getSeasonDateRange(
      season.seasonNumber || 1,
      safeCareerStartDate,
      career.nation || "ESP",
    );

  const normalizedSeasonStart = normalizeDateToUTC(seasonStartDate);
  const finishedMatches = getSortedFinishedMatches(
    season.matches || [],
    seasonStartDate,
    seasonEndDate,
  );

  // Sem partidas finalizadas, nenhuma despesa salarial é contabilizada
  if (finishedMatches.length === 0) {
    return [];
  }

  const players = season.players || [];
  const entries: CalculatedSalaryEntry[] = [];

  let cursorDate = new Date(normalizedSeasonStart);

  for (let i = 0; i < finishedMatches.length; i++) {
    const { match, date: matchDate } = finishedMatches[i];

    // Se a partida ocorreu na mesma data ou antes do cursor atual, 0 dias a contabilizar
    if (matchDate.getTime() <= cursorDate.getTime()) {
      continue;
    }

    const intervalStart = new Date(cursorDate);
    const intervalEnd = new Date(matchDate);

    // Identifica quaisquer alterações salariais ocorridas estritamente dentro deste intervalo
    const transitionDates = getWageChangeDates(
      players,
      seasonStartDate,
      seasonEndDate,
      intervalEnd,
    ).filter(
      (d) =>
        d.getTime() > intervalStart.getTime() &&
        d.getTime() < intervalEnd.getTime(),
    );

    // Constrói os subintervalos: [intervalStart, t1], [t1, t2], ..., [tn, intervalEnd]
    const checkPoints = [intervalStart, ...transitionDates, intervalEnd];
    let totalIntervalExpense = 0;
    let totalDays = 0;

    for (let j = 0; j < checkPoints.length - 1; j++) {
      const subStart = checkPoints[j];
      const subEnd = checkPoints[j + 1];
      const days = getDaysDifference(subStart, subEnd);

      if (days > 0) {
        // Avalia a folha salarial semanal vigente no início do subintervalo
        const wage = calculateSquadWeeklyWageAtDate(
          players,
          subStart,
          seasonStartDate,
          seasonEndDate,
        );
        const subExpense = (wage / 7) * days;
        totalIntervalExpense += subExpense;
        totalDays += days;
      }
    }

    const roundedAmount = Math.round(totalIntervalExpense);
    const fromStr = formatDayMonthShort(intervalStart);
    const toStr = formatDayMonthShort(intervalEnd);

    if (roundedAmount > 0 || totalDays > 0) {
      entries.push({
        id: `salary_auto_${season.id}_match_${match.matchesId}`,
        matchId: match.matchesId,
        amount: roundedAmount,
        date: toStr,
        description: `Salários de atletas (${fromStr} a ${toStr})`,
        fromDayMonth: fromStr,
        toDayMonth: toStr,
        days: totalDays,
      });
    }

    // Avança o cursor para a data desta partida
    cursorDate = new Date(intervalEnd);
  }

  return entries;
}

/**
 * Calcula a despesa salarial consolidada única da temporada ("Salários de atletas"),
 * acumulando proporcionalmente por dias desde o início da temporada até a última partida finalizada.
 */
export function calculateConsolidatedSeasonSalaryExpense(
  params: SalaryTimelineCalculatorParams,
): ConsolidatedSalaryExpense | null {
  const { career, season } = params;
  const intervals = calculateSalaryExpenseEntries({ career, season });

  if (intervals.length === 0) {
    return null;
  }

  const firstInterval = intervals[0];
  const lastInterval = intervals[intervals.length - 1];

  // Soma exata sem perda de precisão entre subintervalos
  const totalDays = intervals.reduce((acc, item) => acc + item.days, 0);
  const totalAmount = intervals.reduce((acc, item) => acc + item.amount, 0);

  return {
    id: `salary_season_${season.id}`,
    seasonId: season.id,
    lastMatchId: lastInterval.matchId,
    amount: Math.round(totalAmount),
    date: lastInterval.toDayMonth,
    description: `Salários de atletas (${firstInterval.fromDayMonth} a ${lastInterval.toDayMonth})`,
    fromDayMonth: firstInterval.fromDayMonth,
    toDayMonth: lastInterval.toDayMonth,
    totalDays,
    intervals,
  };
}
