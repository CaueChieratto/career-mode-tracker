import { Career } from "../../../../../../../../common/interfaces/Career";
import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import {
  checkIsLoanReturnArrival,
  hasDefinedLoanBuyOption,
} from "../../../../../../../../common/services/ServicePlayers/helpers/contractHelpers";
import { isNextSeasonTiming } from "../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { parseValue } from "../../../../../../../../common/utils/FormatValue";
import { resolveContractPlayerClauses } from "../../../../../../../../common/helpers/contractPlayerClauses";

export const hasArrivalActiveClauses = (contract: Contract): boolean => {
  const hasPendingPayableInstallments = Boolean(
    contract.installments &&
      contract.installments.direction !== "receivable" &&
      (contract.installments.status === "paid"
        ? contract.installments.remainingInstallments > 1
        : contract.installments.remainingInstallments > 0),
  );

  const hasPendingPayableBonuses = Boolean(
    (contract.bonuses || []).some(
      (b) =>
        b.direction !== "receivable" &&
        b.status !== "paid" &&
        b.status !== "expired",
    ),
  );

  // Se o mesmo objeto Contract também registrou uma saída (leftClub),
  // transferClauses/loanTerms pertencem à saída se houver sellValue/fromLoanBuyOption,
  // portanto para chegadas sem leftClub (ou antes da saída) verificamos cláusulas de chegada:
  const clauses = !contract.leftClub ? contract.transferClauses : undefined;
  const hasArrivalSpecialClauses = Boolean(
    (clauses?.buybackValue && !clauses.buybackExercised && !clauses.buybackExpired) ||
      (clauses?.sellOnPercentage && !clauses.sellOnReceived && !clauses.sellOnExercised) ||
      clauses?.firstRefusal ||
      (clauses?.loanBackDuration && clauses.loanBackDuration > 0),
  );

  const hasPendingIncomingLoanBuyOption = Boolean(
    contract.isLoan &&
      !contract.leftClub &&
      hasDefinedLoanBuyOption(contract) &&
      !contract.loanTerms?.buyOptionExercised &&
      !contract.loanTerms?.buyOptionExpired,
  );

  const { wageAdjustment, playerBonuses, releaseClause } =
    resolveContractPlayerClauses(contract);
  const hasReleaseClause = Boolean(releaseClause && releaseClause > 0);
  const hasPendingWageAdjustment = Boolean(
    wageAdjustment &&
      (wageAdjustment.enabled ||
        (wageAdjustment.percentage !== undefined && wageAdjustment.percentage > 0) ||
        Boolean(wageAdjustment.targetObjective)) &&
      !wageAdjustment.applied &&
      wageAdjustment.status !== "paid" &&
      (wageAdjustment.status as string) !== "Liquidado" &&
      (wageAdjustment.status as string) !== "Liquidada" &&
      wageAdjustment.status !== "expired",
  );
  const hasPendingPlayerBonuses = playerBonuses.some(
    (b) =>
      b.status !== "paid" &&
      b.status !== "expired" &&
      (b.status as string) !== "Liquidado" &&
      (b.status as string) !== "Liquidada" &&
      !b.achieved,
  );

  return (
    hasPendingPayableInstallments ||
    hasPendingPayableBonuses ||
    hasArrivalSpecialClauses ||
    hasPendingIncomingLoanBuyOption ||
    hasPendingWageAdjustment ||
    hasPendingPlayerBonuses ||
    hasReleaseClause
  );
};

export const isContractedArrivalTransfer = (
  player: Players,
  contract: Contract,
  contractIndex: number,
  career: Career,
  seasonNumber: number,
): boolean => {
  // 1. Excluir renovações
  if (contract.isRenewal || contract.contractDetails?.isRenewal) return false;

  // 2. Excluir registros especiais de saída ou fim de loan-back
  if (
    contract.isLoanBackReturn ||
    (contract.fromLoanBuyOption && Boolean(contract.leftClub))
  ) {
    return false;
  }

  const fromClubClean = (contract.fromClub || "").trim();
  if (!fromClubClean) return false;

  // 3. Excluir promoções da categoria de base
  if (fromClubClean.toLowerCase() === "base") return false;

  // 4. Excluir retornos de empréstimo de jogadores nossos
  if (
    checkIsLoanReturnArrival(
      player,
      contract,
      contractIndex,
      career,
      seasonNumber,
    )
  ) {
    return false;
  }

  // 5. Caso 1: Empréstimo de chegada (contratado por empréstimo)
  if (contract.isLoan) {
    // Se player.loan === true e !player.incomingLoan com leftClub preenchido,
    // o flag isLoan pertence a um empréstimo de SAÍDA mutado sobre contrato antigo.
    const isMutatedOutgoingLoan = Boolean(
      player.loan && !player.incomingLoan && contract.leftClub,
    );
    return !isMutatedOutgoingLoan;
  }

  // 6. Caso 2: Compra / Contratação definitiva (com taxa, custo zero via transferência, troca ou pré-contrato)
  const rawBuyValue =
    typeof contract.buyValue === "number"
      ? contract.buyValue
      : parseValue(String(contract.buyValue || "0"));

  const isPurchaseWithFee = rawBuyValue > 0;
  const isFlaggedSigning = Boolean(player.buy);
  const isIncomingSwap = Boolean(contract.swapPlayer);
  const isScheduledSigning = isNextSeasonTiming(contract.timing);
  const hasContractSigningMetadata = Boolean(
    contract.contractDetails ||
      contract.salary ||
      contract.contractUntil ||
      hasArrivalActiveClauses(contract),
  );

  return (
    isPurchaseWithFee ||
    isFlaggedSigning ||
    isIncomingSwap ||
    isScheduledSigning ||
    hasContractSigningMetadata
  );
};

