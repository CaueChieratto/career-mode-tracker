import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { TransferItem } from "../types";
import { TransferBonus } from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import {
  BooleanValues,
  FormValues,
} from "../../../../SquadTab/views/TransferPlayer/types";
import {
  parseValue,
  formatTransferValue,
} from "../../../../../../../../common/utils/FormatValue";
import { getPlayerOriginalContractYears } from "../../../../../../../../common/utils/calculateContractYears";
import {
  resolveContractPlayerClauses,
  splitClubAndPlayerBonuses,
} from "../../../../../../../../common/helpers/contractPlayerClauses";
import { getContractFormattedDate } from "./manageClausesFormatters";

export const isObjectiveBonus = (b: {
  bonusCategory?: string;
  category?: string;
}): boolean =>
  b.bonusCategory
    ? b.bonusCategory === "Objetivo atingido"
    : b.category === "objective";

export const checkIsFromLoanBuyOption = (item: TransferItem): boolean =>
  Boolean(
    item.contract.fromLoanBuyOption ||
      (!item.contract.isLoan &&
        item.direction === "arrivals" &&
        item.player.contract?.some(
          (c) =>
            c.isLoan &&
            (c.loanTerms?.buyOptionExercised ||
              c.loanTerms?.hasBuyOption ||
              Boolean(c.buyOptionValue)),
        )),
  );

export const checkIsIncomingSwapArrival = (item: TransferItem): boolean =>
  item.direction === "arrivals" &&
  Boolean(item.contract.swapPlayer?.isCounterpart);

export const shouldChooseArrivalScope = (item: TransferItem): boolean =>
  item.direction === "arrivals" &&
  !item.contract.isLoan &&
  !checkIsFromLoanBuyOption(item) &&
  !checkIsIncomingSwapArrival(item);

export const buildPlayerTermsInitialState = (
  item: TransferItem,
  career: Career,
  season: ClubData,
): {
  values: FormValues;
  booleans: BooleanValues;
  bonuses: TransferBonus[];
} => {
  const { contract } = item;
  const isRenewal = item.direction === "renewals";
  const isFromLoanBuyOption = checkIsFromLoanBuyOption(item);
  const resolvedPlayerClauses = resolveContractPlayerClauses(contract);

  const releaseClauseNum = resolvedPlayerClauses.releaseClause;
  const releaseClauseStr =
    releaseClauseNum && releaseClauseNum > 0
      ? formatTransferValue(releaseClauseNum).toLowerCase()
      : "";

  const wageAdj = resolvedPlayerClauses.wageAdjustment;
  const wageType = wageAdj?.direction || "N/D";
  const wageObj = wageAdj?.targetObjective || "";
  const wageLeague = wageAdj?.targetLeague || "";
  const wagePct = wageAdj?.percentage ? `${wageAdj.percentage}%` : "5%";
  const isWageApplied = Boolean(
    wageAdj?.applied ||
      wageAdj?.status === "applied" ||
      wageAdj?.status === "paid",
  );
  const wageStatus = isWageApplied ? "Aplicado" : "Pendente";

  const rawSalaryNum =
    contract.salary !== undefined && Number(contract.salary) > 0
      ? Number(contract.salary)
      : contract.contractDetails?.weeklyWage &&
          contract.contractDetails.weeklyWage > 0
        ? contract.contractDetails.weeklyWage
        : item.player.salary && Number(item.player.salary) > 0
          ? Number(item.player.salary)
          : 0;
  const contractSalStr =
    rawSalaryNum > 0
      ? rawSalaryNum % 1000 === 0
        ? formatTransferValue(rawSalaryNum).toLowerCase()
        : String(rawSalaryNum)
      : "";

  const rawSigningNum = contract.signingBonus
    ? parseValue(contract.signingBonus)
    : contract.contractDetails?.signingBonus || 0;
  const contractSigningBonusStr =
    rawSigningNum > 0 ? formatTransferValue(rawSigningNum).toLowerCase() : "";

  const rawAgentFeeNum = resolvedPlayerClauses.agentFee || 0;
  const agentFeeStr =
    rawAgentFeeNum > 0 ? formatTransferValue(rawAgentFeeNum).toLowerCase() : "";

  const totalContractTime =
    contract.contractTime ||
    contract.contractDetails?.durationYears ||
    item.player.contractTime ||
    1;

  let contractTimeStr: string;
  if (isRenewal) {
    const originalYears = getPlayerOriginalContractYears(
      item.player,
      career.createdAt,
      season.seasonNumber,
      career.nation,
      item.contractIndex,
    );
    const extensionYears =
      originalYears > 0 && totalContractTime >= originalYears
        ? totalContractTime - originalYears
        : 0;
    contractTimeStr = String(extensionYears);
  } else {
    contractTimeStr = String(totalContractTime);
  }

  const contractUntilStr =
    contract.contractUntil || item.player.contractUntil || "";

  const initialBonuses =
    isRenewal || isFromLoanBuyOption
      ? contract.bonuses
        ? [...contract.bonuses]
        : []
      : [...resolvedPlayerClauses.playerBonuses];

  const hasObjective = initialBonuses.some(isObjectiveBonus);

  return {
    values: {
      salary: contractSalStr,
      signingBonus: contractSigningBonusStr,
      agentFee: agentFeeStr,
      contractTime: contractTimeStr,
      contractUntil: contractUntilStr,
      bonusCategory: hasObjective ? "Desempenho" : "Objetivo atingido",
      bonusObjective: "",
      bonusLeague: "",
      bonusCount: "",
      bonusValue: "",
      bonusStatus: "Pendente",
      releaseClause: releaseClauseStr,
      wageAdjustmentType: wageType,
      wageAdjustmentObjective: wageObj,
      wageAdjustmentLeague: wageLeague,
      wageAdjustmentPercentage: wagePct,
      wageAdjustmentStatus: wageStatus,
    },
    booleans: {
      isRetirement: false,
      isEndContract: false,
      isReturnLoan: false,
      hasInstallments: false,
      hasPlayerSwap: false,
      hasBonus: initialBonuses.length > 0,
      hasOtherClauses: Boolean(releaseClauseNum || wageAdj),
      firstRefusal: false,
    },
    bonuses: initialBonuses,
  };
};

export const buildClubClausesInitialState = (
  item: TransferItem,
  season: ClubData,
): {
  values: FormValues;
  booleans: BooleanValues;
  bonuses: TransferBonus[];
} => {
  const { contract } = item;
  const isExit = item.direction === "exit";
  const extraContract = contract as unknown as Record<string, unknown>;
  const rawFee = isExit
    ? contract.sellValue ||
      contract.buyOptionValue ||
      contract.loanTerms?.buyOptionFee ||
      extraContract.transferFee ||
      extraContract.value ||
      item.player.playerValue ||
      0
    : contract.buyValue ||
      contract.buyOptionValue ||
      contract.loanTerms?.buyOptionFee ||
      extraContract.transferFee ||
      extraContract.value ||
      item.player.playerValue ||
      0;
  const numericFee =
    typeof rawFee === "number" ? rawFee : parseValue(String(rawFee || "0"));
  const feeStr =
    numericFee > 0 ? formatTransferValue(numericFee).toLowerCase() : "";
  const partner = isExit ? contract.leftClub || "" : contract.fromClub || "";
  const date = getContractFormattedDate(contract);

  const loanDurationStr =
    contract.transferClauses?.loanBackDuration === 1
      ? "1 temporada"
      : contract.transferClauses?.loanBackDuration === 2
        ? "2 temporadas"
        : "Nenhum";

  const hasSavedInst = Boolean(
    contract.installments &&
      contract.installments.percentage &&
      contract.installments.totalInstallments,
  );
  const totalInst = contract.installments?.totalInstallments || 2;
  const remainingInst =
    contract.installments?.remainingInstallments ?? totalInst;
  const paidInst = Math.max(0, totalInst - remainingInst);
  const paidInstStr =
    paidInst === 0
      ? "0 parcelas pagas"
      : paidInst === totalInst
        ? `${paidInst} parcelas pagas (Quitado)`
        : `${paidInst} ${paidInst === 1 ? "parcela paga" : "parcelas pagas"}`;

  const instYearsStr = !hasSavedInst
    ? "Nenhum"
    : totalInst === 1
      ? "1 Parcela"
      : `${totalInst} Parcelas`;

  const swapPlayerName = contract.swapPlayer?.playerName || "";
  let swapPlayerValue = contract.swapPlayer?.playerValue
    ? formatTransferValue(contract.swapPlayer.playerValue).toLowerCase()
    : "";
  let swapPlayerSector = contract.swapPlayer?.sector || "";
  let swapPlayerPosition = contract.swapPlayer?.position || "";

  if (
    swapPlayerName &&
    (!swapPlayerValue || !swapPlayerSector || !swapPlayerPosition)
  ) {
    const foundSwap = (season.players || []).find(
      (p) =>
        (contract.swapPlayer?.playerId &&
          p.id === contract.swapPlayer.playerId) ||
        p.name.trim().toLowerCase() === swapPlayerName.trim().toLowerCase(),
    );
    if (foundSwap) {
      if (!swapPlayerValue && foundSwap.playerValue) {
        swapPlayerValue = formatTransferValue(
          foundSwap.playerValue,
        ).toLowerCase();
      }
      if (!swapPlayerSector && foundSwap.sector) {
        swapPlayerSector = foundSwap.sector;
      }
      if (!swapPlayerPosition && foundSwap.position) {
        swapPlayerPosition = foundSwap.position;
      }
    }
  }

  const initialBonuses = isExit
    ? contract.bonuses
      ? [...contract.bonuses]
      : []
    : [...splitClubAndPlayerBonuses(contract.bonuses || []).clubBonuses];

  const hasObjective = initialBonuses.some(isObjectiveBonus);
  const firstRefusalBool = Boolean(contract.transferClauses?.firstRefusal);

  return {
    values: {
      sellValue: isExit ? feeStr : "",
      buyValue: !isExit ? feeStr : "",
      transferFee: feeStr,
      buyOption: feeStr,
      buyOptionValue: feeStr,
      toClub: partner,
      fromClub: partner,
      dateExit: date,
      timing: contract.timing || "Imediata",
      installmentsPercentage: hasSavedInst
        ? `${contract.installments!.percentage}% do total`
        : "Nenhum",
      installmentsYears: instYearsStr,
      paidInstallments: paidInstStr,
      swapPlayerName,
      swapPlayerValue,
      swapPlayerSector,
      swapPlayerPosition,
      loanBackDuration: loanDurationStr,
      buybackValue: contract.transferClauses?.buybackValue
        ? formatTransferValue(
            contract.transferClauses.buybackValue,
          ).toLowerCase()
        : "",
      sellOnPercentage: contract.transferClauses?.sellOnPercentage
        ? `${contract.transferClauses.sellOnPercentage}%`
        : "Nenhum",
      firstRefusal: String(firstRefusalBool),
      bonusCategory: hasObjective ? "Prêmio" : "Objetivo atingido",
      bonusObjective: "",
      bonusLeague: "",
      bonusCount: "",
      bonusValue: "",
      bonusStatus: "Pendente",
    },
    booleans: {
      isRetirement: false,
      isEndContract: false,
      isReturnLoan: false,
      hasInstallments: hasSavedInst,
      hasPlayerSwap: Boolean(swapPlayerName),
      hasBonus: initialBonuses.length > 0,
      hasOtherClauses: Boolean(
        contract.transferClauses?.loanBackDuration ||
          contract.transferClauses?.buybackValue ||
          firstRefusalBool ||
          contract.transferClauses?.sellOnPercentage,
      ),
      firstRefusal: firstRefusalBool,
      hasBuyOption: Boolean(
        contract.loanTerms?.hasBuyOption ||
          (contract.buyOptionValue && Number(contract.buyOptionValue) > 0) ||
          (contract.loanTerms?.buyOptionFee &&
            Number(contract.loanTerms.buyOptionFee) > 0),
      ),
    },
    bonuses: initialBonuses,
  };
};
