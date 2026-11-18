import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { Contract } from "../../../../../common/interfaces/playersInfo/contract";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { parseValue } from "../../../../../common/utils/FormatValue";
import {
  checkIsIncomingLoanExit,
  checkIsLoanReturnArrival,
} from "../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import {
  isNextSeasonTiming,
  isNextWindowTiming,
  shouldPlayerLeaveOnNextWindow,
} from "../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";

const CURRENCY_DICTIONARY: Record<
  string,
  { singular: string; plural: string }
> = {
  EUR: { singular: "euro", plural: "euros" },
  "€": { singular: "euro", plural: "euros" },
  GBP: { singular: "libra", plural: "libras" },
  "£": { singular: "libra", plural: "libras" },
  USD: { singular: "dólar", plural: "dólares" },
  $: { singular: "dólar", plural: "dólares" },
  BRL: { singular: "real", plural: "reais" },
  R$: { singular: "real", plural: "reais" },
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  argentina: "ARG",
  brasil: "BRA",
  brazil: "BRA",
  alemanha: "GER",
  germany: "GER",
  frança: "FRA",
  franca: "FRA",
  france: "FRA",
  inglaterra: "ENG",
  england: "ENG",
  espanha: "ESP",
  spain: "ESP",
  portugal: "POR",
  itália: "ITA",
  italia: "ITA",
  italy: "ITA",
  uruguai: "URU",
  uruguay: "URU",
  colômbia: "COL",
  colombia: "COL",
  chile: "CHI",
  holanda: "NED",
  netherlands: "NED",
  bélgica: "BEL",
  belgica: "BEL",
  belgium: "BEL",
  paraguai: "PAR",
  paraguay: "PAR",
  méxico: "MEX",
  mexico: "MEX",
  "estados unidos": "USA",
  usa: "USA",
};

export const getCurrencyWords = (
  currency?: string,
): { singular: string; plural: string } => {
  if (!currency) return { singular: "euro", plural: "euros" };
  const normalized = currency.trim();
  const entry =
    CURRENCY_DICTIONARY[normalized] ||
    CURRENCY_DICTIONARY[normalized.toUpperCase()];
  return entry || { singular: "euro", plural: "euros" };
};

export const formatNationCode = (nation?: string): string => {
  if (!nation) return "";
  const trimmed = nation.trim();
  if (trimmed.length === 3) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  if (COUNTRY_NAME_TO_CODE[lower]) return COUNTRY_NAME_TO_CODE[lower];
  return trimmed.slice(0, 3).toUpperCase();
};

export const formatSalaryAmount = (value: number): string => {
  const val = Math.abs(value);
  if (val >= 1_000_000_000) {
    const b = val / 1_000_000_000;
    const num =
      b % 1 === 0
        ? String(b)
        : b.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return b === 1 ? "1 bilhão" : `${num} bilhões`;
  }
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    const num =
      m % 1 === 0
        ? String(m)
        : m.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return m === 1 ? "1 milhão" : `${num} milhões`;
  }
  if (val >= 1_000) {
    const k = val / 1_000;
    const num =
      k % 1 === 0
        ? String(k)
        : k.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return `${num} mil`;
  }
  return String(val);
};

export const formatWrittenAmount = (
  value: number,
  currencyWords: { singular: string; plural: string },
): string => {
  const val = Math.abs(value);
  if (val >= 1_000_000_000) {
    const b = val / 1_000_000_000;
    const num =
      b % 1 === 0
        ? String(b)
        : b.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return b === 1
      ? `1 bilhão de ${currencyWords.plural}`
      : `${num} bilhões de ${currencyWords.plural}`;
  }
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    const num =
      m % 1 === 0
        ? String(m)
        : m.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return m === 1
      ? `1 milhão de ${currencyWords.plural}`
      : `${num} milhões de ${currencyWords.plural}`;
  }
  if (val >= 1_000) {
    const k = val / 1_000;
    const num =
      k % 1 === 0
        ? String(k)
        : k.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return `${num} mil ${currencyWords.plural}`;
  }
  if (val === 1) {
    return `1 ${currencyWords.singular}`;
  }
  if (val > 0) {
    return `${val} ${currencyWords.plural}`;
  }
  return "custo zero";
};

export interface BuildTransferCopyTextOptions {
  player: Players;
  contract: Contract;
  direction: "arrivals" | "exit";
  currency?: string;
  career?: Career;
  season?: ClubData;
}

const buildArrivalClausesText = (
  contract: Contract,
  currWords: { singular: string; plural: string },
): string => {
  const parts: string[] = [];
  if (contract.installments) {
    parts.push(
      `com pagamento de ${contract.installments.percentage}% parcelado em ${contract.installments.totalInstallments}x anuais`,
    );
  }
  if (contract.swapPlayer?.playerName) {
    parts.push(
      `envolvendo a cessão de ${contract.swapPlayer.playerName} na negociação`,
    );
  }
  if (contract.transferClauses?.loanBackDuration) {
    parts.push(
      `permanecendo emprestado ao ${contract.fromClub || "vendedor"} por ${
        contract.transferClauses.loanBackDuration
      } ${
        contract.transferClauses.loanBackDuration === 1 ? "ano" : "anos"
      }`,
    );
  }
  if (contract.transferClauses?.buybackValue) {
    parts.push(
      `com cláusula de recompra fixada em ${formatWrittenAmount(
        contract.transferClauses.buybackValue,
        currWords,
      )}`,
    );
  }
  if (contract.transferClauses?.sellOnPercentage) {
    parts.push(
      `com ${contract.transferClauses.sellOnPercentage}% de taxa de futura venda`,
    );
  }
  if (contract.bonuses && contract.bonuses.length > 0) {
    parts.push(`além de bônus por metas e objetivos contratuais`);
  }
  return parts.length > 0 ? `, ${parts.join(", ")}` : "";
};

const buildExitClausesText = (
  contract: Contract,
  currWords: { singular: string; plural: string },
  hasDeparted = false,
): string => {
  const parts: string[] = [];
  if (!hasDeparted) {
    if (isNextWindowTiming(contract.timing)) {
      parts.push("com saída programada para a próxima janela de transferências");
    } else if (isNextSeasonTiming(contract.timing)) {
      parts.push("com saída programada para a próxima temporada");
    }
  }
  if (contract.installments) {
    parts.push(
      `com recebimento de ${contract.installments.percentage}% parcelado em ${contract.installments.totalInstallments}x anuais`,
    );
  }
  if (contract.swapPlayer?.playerName) {
    parts.push(
      `envolvendo a chegada de ${contract.swapPlayer.playerName} na negociação`,
    );
  }
  if (contract.transferClauses?.loanBackDuration) {
    parts.push(
      `permanecendo emprestado ao nosso clube por ${
        contract.transferClauses.loanBackDuration
      } ${
        contract.transferClauses.loanBackDuration === 1 ? "ano" : "anos"
      }`,
    );
  }
  if (contract.transferClauses?.buybackValue) {
    parts.push(
      `com cláusula de recompra fixada em ${formatWrittenAmount(
        contract.transferClauses.buybackValue,
        currWords,
      )}`,
    );
  }
  if (contract.transferClauses?.sellOnPercentage) {
    parts.push(
      `com ${contract.transferClauses.sellOnPercentage}% de taxa de futura venda`,
    );
  }
  if (contract.bonuses && contract.bonuses.length > 0) {
    parts.push(`além de bônus por metas e objetivos contratuais`);
  }
  return parts.length > 0 ? `, ${parts.join(", ")}` : "";
};

const buildLoanClausesText = (
  contract: Contract,
  currWords: { singular: string; plural: string },
): string => {
  const parts: string[] = [];
  if (contract.loanTerms?.hasBuyOption && contract.loanTerms.buyOptionFee) {
    parts.push(
      `com opção de compra fixada em ${formatWrittenAmount(
        contract.loanTerms.buyOptionFee,
        currWords,
      )}`,
    );
  }
  if (
    contract.loanTerms?.ourWagePercentage !== undefined &&
    contract.loanTerms.ourWagePercentage !== 100
  ) {
    parts.push(
      `com divisão salarial de ${contract.loanTerms.ourWagePercentage}% / ${contract.loanTerms.theirWagePercentage}%`,
    );
  }
  if (contract.loanTerms?.sellOnPercentage) {
    parts.push(
      `com ${contract.loanTerms.sellOnPercentage}% de repasse em venda futura`,
    );
  }
  return parts.length > 0 ? `, ${parts.join(", ")}` : "";
};

export const buildTransferCopyText = ({
  player,
  contract,
  direction,
  currency,
  career,
  season,
}: BuildTransferCopyTextOptions): string => {
  const ageYears = player.age || 0;
  const ageText = `${ageYears} ${ageYears === 1 ? "ano" : "anos"}`;
  const nationCode = formatNationCode(player.nation);
  const prefix = `${player.name}, ${player.position}, ${ageText}, ${nationCode}`;
  const currWords = getCurrencyWords(currency);

  const contractYears = player.contractTime || 1;
  const contractTimeStr = `${contractYears} ${contractYears === 1 ? "ano" : "anos"} de contrato`;
  const salaryStr = formatSalaryAmount(player.salary || 0);
  const contractWageSegment = `${contractTimeStr} com um salario semanal de ${salaryStr}`;

  if (direction === "arrivals") {
    const rawBuy =
      typeof contract.buyValue === "string"
        ? parseValue(contract.buyValue)
        : contract.buyValue || 0;

    // 1. Promovido da Base
    if (contract.fromClub === "Base") {
      return `${prefix}, ${contractWageSegment}, foi promovido da base.`;
    }

    // 2. Empréstimo (Chegada)
    const isLoanBackArrival = Boolean(
      contract.leftClub &&
      !contract.isLoan &&
      contract.transferClauses?.loanBackDuration,
    );

    const isExplicitlyNotLoan =
      Boolean(contract.fromLoanBuyOption) ||
      contract.isLoan === false ||
      rawBuy > 0;

    if (contract.isLoan || (player.incomingLoan && !isExplicitlyNotLoan) || isLoanBackArrival) {
      const club =
        contract.fromClub || (isLoanBackArrival ? contract.leftClub : "outro clube");
      const loanClauses = buildLoanClausesText(contract, currWords);
      const effectiveDuration =
        contract.loanDuration ||
        (isLoanBackArrival
          ? contract.transferClauses?.loanBackDuration
          : undefined);
      if (effectiveDuration) {
        const durationText = `${effectiveDuration} ${
          effectiveDuration === 1 ? "ano" : "anos"
        } de empréstimo`;
        return `${prefix}, ${durationText} com um salario semanal de ${salaryStr}, foi contratado por empréstimo do ${club}${loanClauses}.`;
      }
      return `${prefix}, ${contractWageSegment}, foi contratado por empréstimo do ${club}${loanClauses}.`;
    }

    // 3. Retorno de Empréstimo
    if (
      checkIsLoanReturnArrival(
        player,
        contract,
        undefined,
        career,
        season?.seasonNumber,
      )
    ) {
      return `${prefix}, retornou de empréstimo do ${contract.fromClub}.`;
    }

    // 4. Passes Livres / Custo Zero
    if (contract.fromClub === "Passes Livres") {
      const arrivalClauses = buildArrivalClausesText(contract, currWords);
      return `${prefix}, ${contractWageSegment}, foi contratado a custo zero${arrivalClauses}.`;
    }

    // 5. Compra definitiva (com valor ou sem valor)
    const arrivalClauses = buildArrivalClausesText(contract, currWords);

    if (rawBuy > 0) {
      const feeFormatted = formatWrittenAmount(rawBuy, currWords);
      return `${prefix}, ${contractWageSegment}, foi contratado do ${
        contract.fromClub || "outro clube"
      } por ${feeFormatted}${arrivalClauses}.`;
    }

    return `${prefix}, ${contractWageSegment}, foi contratado do ${
      contract.fromClub || "outro clube"
    } a custo zero${arrivalClauses}.`;
  }

  // EXITS (Saídas)
  // 1. Aposentadoria
  if (
    contract.leftClub === "Aposentou" ||
    contract.leftClub === "Aposentadoria"
  ) {
    return `${prefix}, se aposentou do futebol.`;
  }

  // 2. Fim de Contrato / Passes Livres
  if (
    contract.leftClub === "Passes Livres" ||
    contract.leftClub === "Fim de Contrato"
  ) {
    return `${prefix}, deixou o clube em fim de contrato.`;
  }

  // 3. Fim de Empréstimo (jogador emprestado ao nosso clube retorna ao clube de origem)
  const isIncomingLoanReturn = checkIsIncomingLoanExit(player, contract, "exit");

  if (isIncomingLoanReturn) {
    return `${prefix}, retornou ao ${contract.leftClub} após o fim do empréstimo.`;
  }

  // 4. Empréstimo (Saída)
  const rawSell =
    typeof contract.sellValue === "string"
      ? parseValue(contract.sellValue)
      : contract.sellValue || 0;
  const isExplicitlyNotExitLoan =
    Boolean(contract.fromLoanBuyOption) ||
    contract.isLoan === false ||
    rawSell > 0;

  if (contract.isLoan || (player.loan && !isExplicitlyNotExitLoan)) {
    const club = contract.leftClub || "outro clube";
    const loanClauses = buildLoanClausesText(contract, currWords);
    if (contract.loanDuration) {
      return `${prefix}, foi emprestado ao ${club} por ${contract.loanDuration} ${
        contract.loanDuration === 1 ? "ano" : "anos"
      }${loanClauses}.`;
    }
    return `${prefix}, foi emprestado ao ${club}${loanClauses}.`;
  }

  // 5. Venda definitiva (com valor ou sem valor)

  let hasDeparted = false;
  if (contract.fromScheduledAgreement) {
    hasDeparted = true;
  } else if (isNextWindowTiming(contract.timing)) {
    hasDeparted = shouldPlayerLeaveOnNextWindow(
      season?.matches || [],
      contract.dataExit,
    );
  } else if (isNextSeasonTiming(contract.timing)) {
    hasDeparted = Boolean(
      contract.fromScheduledAgreement ||
        (season?.seasonNumber &&
          contract.installments?.firstPaymentSeasonNumber &&
          season.seasonNumber >= contract.installments.firstPaymentSeasonNumber),
    );
  }

  const exitClauses = buildExitClausesText(contract, currWords, hasDeparted);

  if (rawSell > 0) {
    const feeFormatted = formatWrittenAmount(rawSell, currWords);
    return `${prefix}, foi vendido ao ${
      contract.leftClub || "outro clube"
    } por ${feeFormatted}${exitClauses}.`;
  }

  return `${prefix}, foi transferido ao ${
    contract.leftClub || "outro clube"
  } a custo zero${exitClauses}.`;
};

