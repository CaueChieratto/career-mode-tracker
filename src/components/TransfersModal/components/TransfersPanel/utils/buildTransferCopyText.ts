import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { Contract } from "../../../../../common/interfaces/playersInfo/contract";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { parseValue } from "../../../../../common/utils/FormatValue";
import {
  checkIsIncomingLoanExit,
  checkIsLoanReturnArrival,
} from "../../../../../common/services/ServicePlayers/helpers/contractHelpers";

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

export const getCurrencyPluralWord = (currency?: string): string => {
  if (!currency) return "euros";
  const normalized = currency.trim();
  const entry =
    CURRENCY_DICTIONARY[normalized] ||
    CURRENCY_DICTIONARY[normalized.toUpperCase()];
  return entry ? entry.plural : "euros";
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
    // 1. Promovido da Base
    if (contract.fromClub === "Base") {
      return `${prefix}, ${contractWageSegment}, foi promovido da base.`;
    }

    // 2. Empréstimo (Chegada)
    if (contract.isLoan || player.incomingLoan) {
      const club = contract.fromClub || "outro clube";
      if (contract.loanDuration) {
        const durationText = `${contract.loanDuration} ${
          contract.loanDuration === 1 ? "ano" : "anos"
        } de empréstimo`;
        return `${prefix}, ${durationText} com um salario semanal de ${salaryStr}, foi contratado por empréstimo do ${club}.`;
      }
      return `${prefix}, ${contractWageSegment}, foi contratado por empréstimo do ${club}.`;
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
      return `${prefix}, ${contractWageSegment}, foi contratado a custo zero.`;
    }

    // 5. Compra definitiva (com valor ou sem valor)
    const rawBuy =
      typeof contract.buyValue === "string"
        ? parseValue(contract.buyValue)
        : contract.buyValue || 0;

    if (rawBuy > 0) {
      const feeFormatted = formatWrittenAmount(rawBuy, currWords);
      return `${prefix}, ${contractWageSegment}, foi contratado do ${
        contract.fromClub || "outro clube"
      } por ${feeFormatted}.`;
    }

    return `${prefix}, ${contractWageSegment}, foi contratado do ${
      contract.fromClub || "outro clube"
    } a custo zero.`;
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
  if (contract.isLoan || player.loan) {
    const club = contract.leftClub || "outro clube";
    if (contract.loanDuration) {
      return `${prefix}, foi emprestado ao ${club} por ${contract.loanDuration} ${
        contract.loanDuration === 1 ? "ano" : "anos"
      }.`;
    }
    return `${prefix}, foi emprestado ao ${club}.`;
  }

  // 5. Venda definitiva (com valor ou sem valor)
  const rawSell =
    typeof contract.sellValue === "string"
      ? parseValue(contract.sellValue)
      : contract.sellValue || 0;

  if (rawSell > 0) {
    const feeFormatted = formatWrittenAmount(rawSell, currWords);
    return `${prefix}, foi vendido ao ${
      contract.leftClub || "outro clube"
    } por ${feeFormatted}.`;
  }

  return `${prefix}, foi transferido ao ${
    contract.leftClub || "outro clube"
  } a custo zero.`;
};
