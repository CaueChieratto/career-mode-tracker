import { Career } from "../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../common/interfaces/club/clubData";
import { Contract } from "../../../../../common/interfaces/playersInfo/contract";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { formatDisplayValue } from "../../../../../common/utils/FormatValue";
import {
  checkIsIncomingLoanExit,
  checkIsLoanReturnArrival,
} from "../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import {
  isNextSeasonTiming,
  isNextWindowTiming,
  shouldPlayerLeaveOnNextWindow,
} from "../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";

export interface TransferBadge {
  label: string;
  type:
    | "installments"
    | "swap"
    | "buyback"
    | "loanBack"
    | "buyOption"
    | "sellOn"
    | "bonus"
    | "timing";
}

export const getTransferBadges = (contract: Contract): TransferBadge[] => {
  const badges: TransferBadge[] = [];

  if (isNextWindowTiming(contract.timing)) {
    badges.push({
      label: "Próxima Janela",
      type: "timing",
    });
  } else if (isNextSeasonTiming(contract.timing)) {
    badges.push({
      label: "Próxima Temporada",
      type: "timing",
    });
  }

  if (contract.installments) {
    badges.push({
      label: `Parcelado em ${contract.installments.totalInstallments}x`,
      type: "installments",
    });
  }

  if (contract.swapPlayer?.playerName) {
    badges.push({
      label: "Troca de atletas",
      type: "swap",
    });
  }

  if (contract.transferClauses?.buybackValue) {
    badges.push({
      label: "Cláusula de Recompra",
      type: "buyback",
    });
  }

  if (contract.transferClauses?.loanBackDuration) {
    badges.push({
      label: `Emprestado de Volta (${contract.transferClauses.loanBackDuration}a)`,
      type: "loanBack",
    });
  }

  if (contract.loanTerms?.hasBuyOption) {
    badges.push({
      label: "Opção de Compra",
      type: "buyOption",
    });
  }

  if (
    contract.transferClauses?.sellOnPercentage ||
    contract.loanTerms?.sellOnPercentage
  ) {
    const pct =
      contract.transferClauses?.sellOnPercentage ||
      contract.loanTerms?.sellOnPercentage;
    badges.push({
      label: `${pct}% Futura Venda`,
      type: "sellOn",
    });
  }

  if (contract.bonuses && contract.bonuses.length > 0) {
    badges.push({
      label: "Bônus por Objetivos",
      type: "bonus",
    });
  }

  return badges;
};

export interface ResolveTransferDisplayValueParams {
  player: Players;
  contract: Contract;
  contractIndex?: number;
  direction: "arrivals" | "exit";
  currency?: string;
  career?: Career;
  season?: ClubData;
  value?: number;
  isLoanBackArrival?: boolean;
}

export const resolveTransferDisplayValue = ({
  player,
  contract,
  contractIndex = 0,
  direction,
  currency,
  career,
  season,
  value,
  isLoanBackArrival = false,
}: ResolveTransferDisplayValueParams): string => {
  let displayValue = formatDisplayValue(value as number, currency);

  const hasPositiveValue = Boolean(value && (value as number) > 0);
  const isExplicitlyNotLoan =
    Boolean(contract.fromLoanBuyOption) ||
    contract.isLoan === false ||
    hasPositiveValue;

  if (direction === "arrivals") {
    const isLoanReturn = checkIsLoanReturnArrival(
      player,
      contract,
      contractIndex,
      career,
      season?.seasonNumber,
    );
    const isArrivalLoan = Boolean(
      !isLoanReturn &&
      (contract.isLoan ||
        (player.incomingLoan && !isExplicitlyNotLoan) ||
        isLoanBackArrival),
    );

    if (isNextSeasonTiming(contract.timing)) {
      const hasArrived = Boolean(
        contract.fromScheduledAgreement ||
        (season?.seasonNumber &&
          contract.installments?.firstPaymentSeasonNumber &&
          season.seasonNumber >=
            contract.installments.firstPaymentSeasonNumber),
      );
      if (!hasArrived) {
        displayValue = "Chegada: Proxima Temporada";
      } else if (isLoanReturn) {
        displayValue = "Fim do Empréstimo";
      } else if (isArrivalLoan) {
        displayValue = "Empréstimo";
      } else if (value && (value as number) > 0) {
        displayValue = formatDisplayValue(value as number, currency);
      } else {
        displayValue = "Custo Zero";
      }
    } else if (isNextWindowTiming(contract.timing)) {
      const hasArrived = shouldPlayerLeaveOnNextWindow(
        season?.matches || [],
        contract.dataArrival || (isLoanBackArrival ? contract.dataExit : null),
      );
      if (!hasArrived) {
        displayValue = "Chegada: Proxima Janela";
      } else if (isLoanReturn) {
        displayValue = "Fim do Empréstimo";
      } else if (isArrivalLoan) {
        displayValue = "Empréstimo";
      } else if (value && (value as number) > 0) {
        displayValue = formatDisplayValue(value as number, currency);
      } else {
        displayValue = "Custo Zero";
      }
    } else if (isLoanReturn) {
      displayValue = "Fim do Empréstimo";
    } else if (isArrivalLoan) {
      displayValue = "Empréstimo";
    } else if (value && (value as number) > 0) {
      displayValue = formatDisplayValue(value as number, currency);
    } else if (contract.fromClub === "Base") {
      displayValue = "Promovido da Base";
    } else if (contract.fromClub === "Passes Livres") {
      displayValue = "Custo Zero";
    } else if (contract.fromClub) {
      displayValue = "Custo Zero";
    }
  } else {
    const isIncomingLoanReturn = checkIsIncomingLoanExit(
      player,
      contract,
      "exit",
    );
    const isExitLoan = Boolean(
      contract.isLoan || (player.loan && !isExplicitlyNotLoan),
    );

    if (isNextSeasonTiming(contract.timing)) {
      const hasLeft = Boolean(
        contract.fromScheduledAgreement ||
        (season?.seasonNumber &&
          contract.installments?.firstPaymentSeasonNumber &&
          season.seasonNumber >=
            contract.installments.firstPaymentSeasonNumber),
      );
      if (!hasLeft) {
        displayValue = "Saída: Proxima Temporada";
      } else if (value && (value as number) > 0) {
        displayValue = formatDisplayValue(value as number, currency);
      } else {
        displayValue = "Custo Zero";
      }
    } else if (isNextWindowTiming(contract.timing)) {
      const hasLeft = shouldPlayerLeaveOnNextWindow(
        season?.matches || [],
        contract.dataExit,
      );
      if (!hasLeft) {
        displayValue = "Saída: Proxima Janela";
      } else if (value && (value as number) > 0) {
        displayValue = formatDisplayValue(value as number, currency);
      } else {
        displayValue = "Custo Zero";
      }
    } else if (value && (value as number) > 0) {
      displayValue = formatDisplayValue(value as number, currency);
    } else if (isIncomingLoanReturn) {
      displayValue = "Fim do Empréstimo";
    } else if (isExitLoan) {
      displayValue = "Empréstimo";
    } else if (
      contract.leftClub === "Aposentou" ||
      contract.leftClub === "Aposentadoria"
    ) {
      displayValue = "Aposentadoria";
    } else if (
      contract.leftClub === "Passes Livres" ||
      contract.leftClub === "Fim de Contrato"
    ) {
      displayValue = "Fim de Contrato";
    } else if (contract.leftClub) {
      displayValue = "Custo Zero";
    }
  }

  return displayValue;
};
