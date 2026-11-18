import { Match } from "../../../interfaces/Match";
import { Players } from "../../../interfaces/playersInfo/players";
import { Contract } from "../../../interfaces/playersInfo/contract";
import { getContinentByCountry } from "../../../utils/league";
import { getSeasonStartYear, isEuropeanSeason } from "../../../utils/Date";
import { hasDefinedLoanBuyOption } from "./contractHelpers";

export const normalizeTiming = (timing?: string): string => {
  if (!timing) return "";
  return timing
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
};

export const isNextSeasonTiming = (timing?: string): boolean => {
  return normalizeTiming(timing) === "proxima temporada";
};

export const isNextWindowTiming = (timing?: string): boolean => {
  return normalizeTiming(timing) === "proxima janela";
};

export const isImmediateTiming = (timing?: string): boolean => {
  const norm = normalizeTiming(timing);
  return norm === "imediata" || norm === "imediato";
};

/**
 * Universal canonical function to evaluate whether a transfer contract
 * (arrival or exit) still has active financial or contractual obligations pending.
 */
export const hasTransferActiveClauses = (contract: Contract): boolean => {
  // 1. Parcelas pendentes
  const hasPendingInstallments = Boolean(
    contract.installments &&
      (Array.isArray(contract.installments.installmentsList) ||
      Boolean(contract.installments.paidSeasonId)
        ? contract.installments.remainingInstallments > 0
        : contract.installments.status === "paid"
          ? contract.installments.remainingInstallments > 1
          : contract.installments.remainingInstallments > 0),
  );

  // 2. Bônus pendentes
  const hasPendingBonuses = Boolean(
    (contract.bonuses || []).some(
      (b) => b.status !== "paid" && b.status !== "expired",
    ),
  );

  // 3. Cláusulas especiais acionáveis pendentes (recompra não exercida, revenda não recebida)
  const clauses = contract.transferClauses;
  const hasPendingBuyback = Boolean(
    clauses?.buybackValue && !clauses.buybackExercised && !clauses.buybackExpired,
  );
  const hasPendingSellOn = Boolean(
    (clauses?.sellOnPercentage || contract.loanTerms?.sellOnPercentage) &&
      !clauses?.sellOnReceived &&
      !clauses?.sellOnExercised &&
      !contract.loanTerms?.sellOnReceived &&
      !contract.loanTerms?.sellOnExercised,
  );
  const hasPendingFirstRefusal = Boolean(clauses?.firstRefusal);
  const hasPendingLoanBack = Boolean(
    clauses?.loanBackDuration && clauses.loanBackDuration > 0,
  );

  const hasSpecialClauses =
    hasPendingBuyback ||
    hasPendingSellOn ||
    hasPendingFirstRefusal ||
    hasPendingLoanBack;

  // 4. Opção de compra em empréstimo pendente de exercício
  const hasPendingLoanBuyOption = Boolean(
    contract.isLoan &&
    hasDefinedLoanBuyOption(contract) &&
    !contract.loanTerms?.buyOptionExercised,
  );

  return (
    hasPendingInstallments ||
    hasPendingBonuses ||
    hasSpecialClauses ||
    hasPendingLoanBuyOption
  );
};

export const hasRenewalActiveClauses = (contract: Contract): boolean => {
  const hasPendingBonuses = Boolean(
    (contract.bonuses || []).some(
      (b) =>
        b.status !== "paid" &&
        b.status !== "expired" &&
        (b.status as string) !== "Liquidada" &&
        (b.status as string) !== "Liquidado" &&
        (b.status as string) !== "Expirada",
    ),
  );

  const wageAdj =
    contract.contractDetails?.wageAdjustment ||
    contract.contractClauses?.wageAdjustment;
  const hasPendingWageAdjustment = Boolean(
    wageAdj?.enabled &&
      !wageAdj.applied &&
      wageAdj.status !== "paid" &&
      (wageAdj.status as string) !== "Liquidada" &&
      (wageAdj.status as string) !== "Liquidado" &&
      (wageAdj.status as string) !== "Expirada",
  );

  return hasPendingBonuses || hasPendingWageAdjustment;
};

/**
 * Parses a date string in Brazilian/European format (DD/MM/YYYY or DD/MM/YY or DD/MM).
 */
export const parseMatchDateToDate = (
  dateVal: string | Date | null | undefined,
  fallbackYear?: number,
): Date | null => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  if (typeof dateVal !== "string") return null;

  const trimmed = dateVal.trim();
  if (trimmed.includes("-")) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const parts = trimmed.split("/").map(Number);
  if (parts.length < 2) return null;
  const day = parts[0];
  const month = parts[1];
  let year =
    parts.length >= 3 ? parts[2] : (fallbackYear ?? new Date().getFullYear());
  if (year < 100) year += 2000;
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
};

/**
 * Evaluates whether a contract falls within the date range of a given season.
 * Transfer agreements scheduled for 'Próxima Temporada' belong to the subsequent season.
 */
export const isContractInSeasonRange = (
  contract: Contract,
  direction: "arrivals" | "exit",
  seasonRange?: { startDate: Date; endDate: Date } | null,
): boolean => {
  if (!seasonRange) return true;

  const isLoanBackArrival =
    direction === "arrivals" &&
    Boolean(
      contract.leftClub &&
      !contract.isLoan &&
      contract.transferClauses?.loanBackDuration,
    );

  const dateVal =
    direction === "arrivals"
      ? (contract.dataArrival || (isLoanBackArrival ? contract.dataExit : null))
      : contract.dataExit;
  if (!dateVal) {
    if (isNextSeasonTiming(contract.timing)) {
      return true;
    }
    return false;
  }

  const parsed = parseMatchDateToDate(
    dateVal,
    seasonRange.startDate.getFullYear(),
  );
  if (!parsed) {
    if (isNextSeasonTiming(contract.timing)) {
      return true;
    }
    return false;
  }

  const t = parsed.getTime();
  const inRange =
    t >= seasonRange.startDate.getTime() &&
    t <= seasonRange.endDate.getTime();

  if (inRange) {
    return true;
  }

  // Se o contrato está com status 'Próxima Temporada' (ou seja, acordado nesta temporada mas com saída na próxima),
  // ele pertence à temporada em que o acordo foi firmado.
  if (isNextSeasonTiming(contract.timing)) {
    return true;
  }

  return false;
};

/**
 * Computes the season number in which a loan-back ends.
 * - Mid-season transfers (e.g., January in European calendar, July in non-European calendar):
 *   The remainder of the transfer season is the partial period, and the contracted duration
 *   determines how many additional FULL seasons are covered.
 *   endSeasonNumber = transferSeasonNumber + duration + 1
 * - Start-of-season transfers (e.g., July in European calendar, January in non-European calendar):
 *   The transfer season is the first full season.
 *   endSeasonNumber = transferSeasonNumber + duration
 */
export const getLoanBackEndSeasonNumber = (
  contract: Contract,
  careerCreatedAt?: Date | string | null,
  careerNation?: string | null,
  fallbackSeasonNumber = 1,
): number => {
  if (contract.transferClauses?.loanEndSeasonNumber) {
    return contract.transferClauses.loanEndSeasonNumber;
  }

  const duration = contract.transferClauses?.loanBackDuration || 1;
  const isEuropean = careerNation
    ? getContinentByCountry(careerNation) === "Europa"
    : true;

  let agreementSeasonNumber = fallbackSeasonNumber;
  const parsedDate = parseMatchDateToDate(contract.dataExit || contract.dataArrival);

  if (parsedDate && careerCreatedAt) {
    const startYear = new Date(careerCreatedAt).getFullYear();
    const dateYear = parsedDate.getFullYear();
    const month = parsedDate.getMonth() + 1; // 1 - 12

    if (isEuropean) {
      // European season starts July 1 (month 7)
      const seasonStartYear = month >= 7 ? dateYear : dateYear - 1;
      const calculatedSeason = seasonStartYear - startYear + 1;
      if (calculatedSeason >= 1) {
        agreementSeasonNumber = calculatedSeason;
      }
    } else {
      // Non-European season starts Jan 1 (month 1)
      const calculatedSeason = dateYear - startYear + 1;
      if (calculatedSeason >= 1) {
        agreementSeasonNumber = calculatedSeason;
      }
    }
  }

  let transferSeasonNumber = agreementSeasonNumber;
  let isMidSeason = false;

  if (isNextSeasonTiming(contract.timing)) {
    transferSeasonNumber = agreementSeasonNumber + 1;
    isMidSeason = false;
  } else if (isNextWindowTiming(contract.timing)) {
    const agreementMonth = parsedDate ? parsedDate.getMonth() + 1 : (isEuropean ? 7 : 1);
    if (isEuropean) {
      if (agreementMonth >= 7 && agreementMonth <= 12) {
        // Agreement in summer/autumn -> winter window (January) of current season (mid-season)
        transferSeasonNumber = agreementSeasonNumber;
        isMidSeason = true;
      } else {
        // Agreement in winter/spring -> summer window (July) of next season (start of season)
        transferSeasonNumber = agreementSeasonNumber + 1;
        isMidSeason = false;
      }
    } else {
      if (agreementMonth >= 1 && agreementMonth <= 6) {
        // Agreement in first half -> mid-season window (July) of current season (mid-season)
        transferSeasonNumber = agreementSeasonNumber;
        isMidSeason = true;
      } else {
        // Agreement in second half -> start of next season (January)
        transferSeasonNumber = agreementSeasonNumber + 1;
        isMidSeason = false;
      }
    }
  } else {
    // Immediate / default timing
    transferSeasonNumber = agreementSeasonNumber;
    const transferMonth = parsedDate ? parsedDate.getMonth() + 1 : (isEuropean ? 7 : 1);
    if (isEuropean) {
      // Summer window months (7, 8, 9) are start-of-season; other months are mid-season
      isMidSeason = !(transferMonth >= 7 && transferMonth <= 9);
    } else {
      // Start-of-season months (1, 2, 3); other months are mid-season
      isMidSeason = !(transferMonth >= 1 && transferMonth <= 3);
    }
  }

  const endSeason = isMidSeason
    ? transferSeasonNumber + duration + 1
    : transferSeasonNumber + duration;

  return endSeason;
};

export const shouldPlayerLeaveOnNextWindow = (
  matches: Match[],
  agreementDateExit?: string | Date | null,
): boolean => {
  const finished = (matches || []).filter((m) => m.status === "FINISHED");

  const getMatchDate = (m: Match) =>
    parseMatchDateToDate(m.date || (m as unknown as { matchDate?: string }).matchDate);

  const finishedMatchesWithDate = finished
    .map((m) => ({ match: m, date: getMatchDate(m) }))
    .filter((item): item is { match: Match; date: Date } => item.date !== null);

  let agreementMonth = 7;
  let agreementYear: number | null = null;
  if (agreementDateExit) {
    const parsed = parseMatchDateToDate(agreementDateExit);
    if (parsed) {
      agreementMonth = parsed.getMonth() + 1;
      agreementYear = parsed.getFullYear();
    }
  }

  // Acordos feitos entre jul-dez (meses 7 a 12) miram a janela de jan/fev (inverno) -> mês antecedente: 12 (dezembro)
  // Acordos feitos entre jan-jun (meses 1 a 6) miram a janela de jul/ago (verão) -> mês antecedente: 6 (junho)
  const isTargetingWinter = agreementMonth >= 7 && agreementMonth <= 12;
  const targetPrecedingMonth = isTargetingWinter ? 12 : 6;

  const allMatchesWithDate = (matches || [])
    .map((m) => ({ match: m, date: getMatchDate(m) }))
    .filter((item): item is { match: Match; date: Date } => item.date !== null);

  const allInPrecedingMonth = allMatchesWithDate.filter((item) => {
    const matchMonth = item.date.getMonth() + 1;
    if (matchMonth !== targetPrecedingMonth) return false;
    if (agreementYear !== null) {
      return item.date.getFullYear() >= agreementYear;
    }
    return true;
  });

  if (allInPrecedingMonth.length > 0) {
    allInPrecedingMonth.sort((a, b) => a.date.getTime() - b.date.getTime());
    const lastMatchInPrecedingMonth =
      allInPrecedingMonth[allInPrecedingMonth.length - 1];

    // Se a última partida do mês antecedente ainda não estiver FINISHED, o mês antecedente ainda está em andamento
    if (lastMatchInPrecedingMonth.match.status !== "FINISHED") {
      const hasFinishedMatchAfterPreceding = finishedMatchesWithDate.some((item) => {
        const mMonth = item.date.getMonth() + 1;
        return (
          item.date.getTime() > lastMatchInPrecedingMonth.date.getTime() &&
          mMonth !== targetPrecedingMonth
        );
      });
      return hasFinishedMatchAfterPreceding;
    }

    // A última partida do mês antecedente está FINISHED.
    // O jogador sai assim que o calendário avançar para o período da janela (partida posterior agendada ou finalizada)
    const hasMatchInNextPeriod = allMatchesWithDate.some((item) => {
      const mMonth = item.date.getMonth() + 1;
      return (
        item.date.getTime() > lastMatchInPrecedingMonth.date.getTime() &&
        mMonth !== targetPrecedingMonth
      );
    });

    return hasMatchInNextPeriod;
  }

  // Caso não haja partidas no mês antecedente (ex: temporada posterior ou calendário avançado):
  if (agreementYear !== null && allMatchesWithDate.length > 0) {
    const hasMatchAfterTargetWindow = allMatchesWithDate.some((item) => {
      const mMonth = item.date.getMonth() + 1;
      const mYear = item.date.getFullYear();
      if (isTargetingWinter) {
        return (
          mYear > agreementYear! + 1 ||
          (mYear === agreementYear! + 1 && mMonth >= 1)
        );
      } else {
        return (
          mYear > agreementYear! ||
          (mYear === agreementYear! && mMonth >= 7)
        );
      }
    });
    if (hasMatchAfterTargetWindow) {
      return true;
    }
  }

  // Se não houver jogos cadastrados no mês antecedente, verificar se já há partidas finalizadas na janela
  return finishedMatchesWithDate.some((item) => {
    const mMonth = item.date.getMonth() + 1;
    if (agreementDateExit) {
      const parsed = parseMatchDateToDate(agreementDateExit);
      if (parsed && item.date.getTime() < parsed.getTime()) {
        return false;
      }
    }
    if (isTargetingWinter) {
      return mMonth >= 1 && mMonth < 7;
    } else {
      return mMonth >= 7 && mMonth <= 12;
    }
  });
};

export const isPlayerActuallyDeparted = (
  player: Players,
  contract: Contract,
  matches?: Match[],
): boolean => {
  if (!contract.leftClub) return false;

  // Se o jogador está atualmente emprestado de volta para nós (loan-back), ele permanece no clube
  if (player.incomingLoan || contract.transferClauses?.loanBackDuration) {
    return false;
  }

  const timing = contract.timing;

  // Próxima Temporada: jogador permanece na temporada atual; só sai na temporada seguinte
  if (isNextSeasonTiming(timing)) {
    return false;
  }

  // Próxima Janela: jogador sai quando a condição da janela for atingida pelas partidas
  if (isNextWindowTiming(timing)) {
    if (player.sell === true) return true;
    if (matches && shouldPlayerLeaveOnNextWindow(matches, contract.dataExit)) {
      return true;
    }
    return false;
  }

  // Empréstimo para fora:
  if (contract.isLoan || player.loan) {
    return true;
  }

  // Venda imediata ou padrão:
  if (player.sell !== undefined) {
    return player.sell;
  }

  return true;
};

export const isPlayerSoldOrDeparted = (
  player: Players,
  matches?: Match[],
): boolean => {
  if (player.incomingLoan) return false;
  if (player.loan) return false;

  const exitContracts = (player.contract || []).filter(
    (c) => Boolean(c.leftClub) && !c.isLoan,
  );
  if (!exitContracts.length) {
    // Checar se é contratação pré-agendada para próxima temporada (não deve estar no elenco ativo da atual)
    const arrivalContracts = (player.contract || []).filter(
      (c) => Boolean(c.fromClub || c.dataArrival) && !c.isLoan,
    );
    const lastArrival = arrivalContracts[arrivalContracts.length - 1];
    if (lastArrival && isNextSeasonTiming(lastArrival.timing)) {
      return true;
    }
    if (player.sell) return true;
    return false;
  }

  const exitContract = exitContracts[exitContracts.length - 1];
  if (exitContract.transferClauses?.loanBackDuration) {
    return false;
  }

  const timing = exitContract.timing;
  if (isNextSeasonTiming(timing)) {
    return false;
  }

  if (isNextWindowTiming(timing)) {
    if (player.sell === true) return true;
    return shouldPlayerLeaveOnNextWindow(matches || [], exitContract.dataExit);
  }

  return true;
};

export interface ResolvedNextWindowDetails {
  targetSeasonNumber: number;
  effectiveDate: Date;
  belongsToPreviousSeason: boolean;
  belongsToNewSeason: boolean;
}

/**
 * Resolve determinística e canonicamente em qual temporada e em qual data exata de janela
 * uma transferência agendada para 'Próxima Janela' deve acontecer, considerando o calendário
 * (europeu vs. não-europeu), a data de criação da carreira e o mês de formalização do acordo.
 */
export const resolveNextWindowTimingSchedule = (
  contract: Contract,
  previousSeasonNumber: number,
  careerCreatedAt?: Date | string | null,
  careerNation?: string,
): ResolvedNextWindowDetails => {
  const isEuropean = careerNation
    ? isEuropeanSeason(careerNation) || getContinentByCountry(careerNation) === "Europa"
    : true;

  const startYear = getSeasonStartYear(careerCreatedAt, previousSeasonNumber);
  const agreementDate = contract.dataExit || contract.dataArrival;
  const parsedDate = parseMatchDateToDate(agreementDate, startYear);
  const agreementMonth = parsedDate ? parsedDate.getMonth() + 1 : (isEuropean ? 7 : 1);

  let targetSeasonNumber: number;
  let effectiveDate: Date;

  if (isEuropean) {
    if (agreementMonth >= 7 && agreementMonth <= 12) {
      // Acordo firmado entre jul-dez (verão/outono): a próxima janela é a de Inverno (Janeiro),
      // que pertence à mesma temporada do acordo (previousSeasonNumber).
      targetSeasonNumber = previousSeasonNumber;
      effectiveDate = new Date(startYear + 1, 0, 1); // 01/01/(startYear + 1)
    } else {
      // Acordo firmado entre jan-jun (inverno/primavera): a próxima janela é a de Verão (Julho),
      // que inaugura a nova temporada (previousSeasonNumber + 1).
      targetSeasonNumber = previousSeasonNumber + 1;
      effectiveDate = new Date(startYear + 1, 6, 1); // 01/07/(startYear + 1)
    }
  } else {
    // Calendário Não-Europeu / Sul-Americano (Janeiro a Dezembro)
    if (agreementMonth >= 1 && agreementMonth <= 6) {
      // Acordo no 1º semestre (jan-jun): próxima janela é Julho do mesmo ano (meio de temporada).
      targetSeasonNumber = previousSeasonNumber;
      effectiveDate = new Date(startYear, 6, 1); // 01/07/startYear
    } else {
      // Acordo no 2º semestre (jul-dez): próxima janela é Janeiro do ano seguinte (início da próxima).
      targetSeasonNumber = previousSeasonNumber + 1;
      effectiveDate = new Date(startYear + 1, 0, 1); // 01/01/(startYear + 1)
    }
  }

  return {
    targetSeasonNumber,
    effectiveDate,
    belongsToPreviousSeason: targetSeasonNumber === previousSeasonNumber,
    belongsToNewSeason: targetSeasonNumber > previousSeasonNumber,
  };
};


