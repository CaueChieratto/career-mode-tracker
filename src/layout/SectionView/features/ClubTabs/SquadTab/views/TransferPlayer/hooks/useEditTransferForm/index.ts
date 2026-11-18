import { useEffect, useMemo, useState } from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import {
  brasilDatePlaceholderShort,
  formatDateInput,
  formatDateInputShort,
} from "../../../../../../../../../common/utils/Date";
import {
  formatDisplayValue,
  formatTransferValue,
  parseValue,
} from "../../../../../../../../../common/utils/FormatValue";
import { calculateContractYears } from "../../../../../../../../../common/utils/calculateContractYears";
import {
  checkIsSpecialTransfer,
  checkIsIncomingLoanExit,
} from "../../constants/buildEditTransferFormSections";
import {
  isNextSeasonTiming,
  isNextWindowTiming,
} from "../../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { BooleanValues } from "../../types";
import { toast } from "../../../../../../../../../common/services/ToastService";
import { mergeFormValues } from "../../../../../../../../../common/hooks/UseForm";
import { useGlobalTeamsOptions } from "../../../shared/useGlobalTeamsOptions";
import { useTransferBonusesDraft } from "../useTransferBonusesDraft";
import { useEditTransferActions } from "../useEditTransferActions";

export type UseEditTransferFormProps = {
  career: Career;
  season: ClubData;
  player: Players;
  contract: NonNullable<Players["contract"]>[number];
  contractIndex: number;
  direction: "arrivals" | "exit";
  onClose: () => void;
};

const resolveTimingOption = (timing?: string, isArrival?: boolean): string => {
  if (isNextSeasonTiming(timing)) return "Próxima Temporada";
  if (isNextWindowTiming(timing)) return "Próxima Janela";
  return isArrival ? "Imediata" : "Imediato";
};

export const useEditTransferForm = ({
  career,
  season,
  player,
  contract,
  contractIndex,
  direction,
  onClose,
}: UseEditTransferFormProps) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);

  const [booleanValues, setBooleanValues] = useState<BooleanValues>(() => {
    return {
      isRetirement:
        contract.leftClub === "Aposentou" ||
        contract.leftClub === "Aposentadoria",
      isEndContract: contract.leftClub === "Fim de Contrato",
      isReturnLoan: false,
      hasInstallments: Boolean(contract.installments),
      hasPlayerSwap: Boolean(
        contract.swapPlayer &&
        (contract.swapPlayer.playerName || contract.swapPlayer.playerId),
      ),
      hasBonus: Boolean(contract.bonuses && contract.bonuses.length > 0),
      hasOtherClauses: Boolean(
        contract.transferClauses &&
        (contract.transferClauses.loanBackDuration ||
          contract.transferClauses.buybackValue ||
          contract.transferClauses.firstRefusal ||
          contract.transferClauses.sellOnPercentage),
      ),
      firstRefusal: Boolean(contract.transferClauses?.firstRefusal),
      hasBuyOption: Boolean(
        contract.loanTerms?.hasBuyOption !== false &&
          (contract.loanTerms?.hasBuyOption ||
            (contract.buyOptionValue && Number(contract.buyOptionValue) > 0) ||
            (contract.loanTerms?.buyOptionFee &&
              Number(contract.loanTerms.buyOptionFee) > 0) ||
            (contract.isLoan &&
              (Number(contract.sellValue || 0) > 0 ||
                parseValue(String(contract.buyValue || "0")) > 0))),
      ),
    };
  });

  const [customBonusOptions] = useState<Record<string, string[]>>(
    () => career?.customBonusObjectives || {},
  );

  const initialValues = useMemo<Record<string, string>>(() => {
    const isArrival = direction === "arrivals";
    const isLoanArrival = Boolean(contract.isLoan);
    const initialSalary =
      isArrival && isLoanArrival
        ? contract.fullSalary !== undefined
          ? contract.wagePercentage &&
            contract.wagePercentage < 100 &&
            contract.salary !== undefined &&
            Number(contract.fullSalary) === Number(contract.salary)
            ? formatTransferValue(
                Math.round(
                  Number(contract.salary) / (contract.wagePercentage / 100),
                ),
              ).toLowerCase()
            : formatTransferValue(Number(contract.fullSalary)).toLowerCase()
          : contract.wagePercentage && contract.salary
            ? formatTransferValue(
                Math.round(
                  Number(contract.salary) / (contract.wagePercentage / 100),
                ),
              ).toLowerCase()
            : player.salary !== undefined
              ? formatTransferValue(Number(player.salary)).toLowerCase()
              : ""
        : contract.salary !== undefined
          ? formatTransferValue(Number(contract.salary)).toLowerCase()
          : player.salary !== undefined
            ? formatTransferValue(Number(player.salary)).toLowerCase()
            : "";
    const initialContractTime = contract.contractTime
      ? String(contract.contractTime)
      : player.contractTime
        ? String(player.contractTime)
        : "1";
    const initialContractUntil =
      contract.contractUntil || player.contractUntil || "";
    const initialSigningBonus = contract.signingBonus
      ? String(contract.signingBonus)
      : contract.contractDetails?.signingBonus
        ? formatTransferValue(
            contract.contractDetails.signingBonus,
          ).toLowerCase()
        : "";
    const initialAgentFee = contract.contractDetails?.agentFee
      ? formatTransferValue(contract.contractDetails.agentFee).toLowerCase()
      : "";

    if (isArrival) {
      const extra = contract as unknown as Record<string, unknown>;
      const instAny = contract.installments as unknown as { totalValue?: number } | undefined;
      const rawArrivalFee =
        (typeof contract.buyValue === "number" && contract.buyValue > 0) ||
        (typeof contract.buyValue === "string" &&
          parseValue(contract.buyValue) > 0)
          ? contract.buyValue
          : instAny?.totalValue ||
            (contract.installments
              ? contract.installments.annualInstallmentValue * contract.installments.totalInstallments + (contract.installments.upfrontValue || 0)
              : undefined) ||
            (extra.transferFee ??
              extra.value ??
              (isLoanArrival
                ? contract.buyOptionValue || contract.loanTerms?.buyOptionFee
                : undefined));
      const numericArrivalFee =
        typeof rawArrivalFee === "number"
          ? rawArrivalFee
          : parseValue(String(rawArrivalFee || "0"));
      const arrivalFeeStr =
        numericArrivalFee > 0
          ? formatTransferValue(numericArrivalFee).toLowerCase()
          : "";

      const exercisedDerivedContract = player.contract?.find(
        (c) =>
          !c.isLoan &&
          Boolean(
            c.fromLoanBuyOption ||
              c.buyOptionFinalized ||
              c.sourceLoanContractIndex !== undefined,
          ),
      );

      const buyOptVal =
        contract.buyOptionValue ||
        contract.loanTerms?.buyOptionFee ||
        exercisedDerivedContract?.buyValue ||
        (isLoanArrival
          ? contract.buyValue || extra.transferFee || extra.value
          : undefined);
      const numericBuyOpt =
        typeof buyOptVal === "number"
          ? buyOptVal
          : parseValue(String(buyOptVal || "0"));
      const initialBuyOption =
        numericBuyOpt > 0
          ? formatTransferValue(numericBuyOpt).toLowerCase()
          : arrivalFeeStr;
      const sellOnPct =
        contract.loanTerms?.sellOnPercentage ??
        exercisedDerivedContract?.transferClauses?.sellOnPercentage;

      const res: Record<string, string> = {
        transferType: isLoanArrival ? "Empréstimo" : "Compra",
        fromClub: contract.fromClub || "",
        timing: resolveTimingOption(contract.timing, true),
        buyValue: isLoanArrival ? (initialBuyOption || arrivalFeeStr) : arrivalFeeStr,
        transferFee: arrivalFeeStr || initialBuyOption,
        loanDuration: contract.loanDuration
          ? String(contract.loanDuration)
          : contract.loanTerms?.durationYears
            ? String(contract.loanTerms.durationYears)
            : isLoanArrival
              ? "1"
              : "",
        wagePercentage: contract.wagePercentage !== undefined && contract.wagePercentage !== null && String(contract.wagePercentage) !== ""
          ? String(contract.wagePercentage)
          : contract.loanTerms?.ourWagePercentage !== undefined && contract.loanTerms.ourWagePercentage !== null
            ? String(contract.loanTerms.ourWagePercentage)
            : isLoanArrival
              ? "100"
              : "",
        buyOption: initialBuyOption || arrivalFeeStr,
        buyOptionValue: initialBuyOption || arrivalFeeStr,
        sellOnPercentage:
          sellOnPct !== undefined && sellOnPct !== null
            ? String(sellOnPct)
            : "",
        dateArrival: contract.dataArrival
          ? brasilDatePlaceholderShort(new Date(contract.dataArrival))
          : "",
        salary: initialSalary,
        contractTime: initialContractTime,
        contractUntil: initialContractUntil,
        signingBonus: initialSigningBonus,
        agentFee: initialAgentFee,
      };
      return res;
    } else {
      const isIncomingLoanReturnExit = checkIsIncomingLoanExit(
        player,
        contract,
        "exit",
      );

      if (isIncomingLoanReturnExit) {
        return {
          transferType: "Fim de Empréstimo",
          toClub: contract.leftClub || contract.fromClub || "",
          sellValue: "0",
          dateExit: contract.dataExit
            ? brasilDatePlaceholderShort(new Date(contract.dataExit))
            : "",
          salary: initialSalary,
          contractTime: initialContractTime,
          contractUntil: initialContractUntil,
          signingBonus: initialSigningBonus,
          agentFee: initialAgentFee,
        };
      }

      const isLoanExit = Boolean(contract.isLoan);
      const extra = contract as unknown as Record<string, unknown>;
      const instAny = contract.installments as unknown as { totalValue?: number } | undefined;
      const rawExitFee =
        (typeof contract.sellValue === "number" && contract.sellValue > 0) ||
        (typeof contract.sellValue === "string" &&
          parseValue(contract.sellValue) > 0)
          ? contract.sellValue
          : instAny?.totalValue ||
            (contract.installments
              ? contract.installments.annualInstallmentValue * contract.installments.totalInstallments + (contract.installments.upfrontValue || 0)
              : undefined) ||
            (extra.transferFee ??
              extra.value ??
              (isLoanExit
                ? contract.buyOptionValue || contract.loanTerms?.buyOptionFee
                : undefined));
      const numericExitFee =
        typeof rawExitFee === "number"
          ? rawExitFee
          : parseValue(String(rawExitFee || "0"));
      const exitFeeStr =
        numericExitFee > 0
          ? formatTransferValue(numericExitFee).toLowerCase()
          : "";

      const exercisedDerivedContract = player.contract?.find(
        (c) =>
          !c.isLoan &&
          Boolean(
            c.fromLoanBuyOption ||
              c.buyOptionFinalized ||
              c.sourceLoanContractIndex !== undefined,
          ),
      );

      const buyOptVal =
        contract.loanTerms?.buyOptionFee ||
        contract.buyOptionValue ||
        exercisedDerivedContract?.sellValue ||
        (isLoanExit
          ? contract.sellValue || extra.transferFee || extra.value
          : undefined);
      const numericBuyOpt =
        typeof buyOptVal === "number"
          ? buyOptVal
          : parseValue(String(buyOptVal || "0"));
      const initialBuyOption =
        numericBuyOpt > 0
          ? formatTransferValue(numericBuyOpt).toLowerCase()
          : exitFeeStr;
      const sellOnPct =
        contract.loanTerms?.sellOnPercentage ??
        exercisedDerivedContract?.transferClauses?.sellOnPercentage;

      const res: Record<string, string> = {
        transferType: isLoanExit ? "Emprestar" : "Venda",
        timing: resolveTimingOption(contract.timing, false),
        toClub: contract.leftClub || "",
        sellValue: isLoanExit ? (initialBuyOption || exitFeeStr) : exitFeeStr,
        transferFee: exitFeeStr || initialBuyOption,
        loanDuration: contract.loanDuration
          ? String(contract.loanDuration)
          : contract.loanTerms?.durationYears
            ? String(contract.loanTerms.durationYears)
            : isLoanExit
              ? "1"
              : "",
        wagePercentage: contract.wagePercentage !== undefined && contract.wagePercentage !== null && String(contract.wagePercentage) !== ""
          ? String(contract.wagePercentage)
          : contract.loanTerms?.theirWagePercentage !== undefined && contract.loanTerms.theirWagePercentage !== null
            ? String(contract.loanTerms.theirWagePercentage)
            : isLoanExit
              ? "0"
              : "",
        buyOption: initialBuyOption || exitFeeStr,
        buyOptionValue: initialBuyOption || exitFeeStr,
        sellOnPercentage:
          sellOnPct !== undefined && sellOnPct !== null
            ? String(sellOnPct)
            : "",
        dateExit: contract.dataExit
          ? brasilDatePlaceholderShort(new Date(contract.dataExit))
          : "",
        installmentsPercentage: contract.installments?.percentage
          ? `${contract.installments.percentage}%`
          : "20%",
        installmentsYears: contract.installments?.totalInstallments
          ? `${contract.installments.totalInstallments} temporadas`
          : "2 temporadas",
        swapPlayerName: contract.swapPlayer?.playerName || "",
        swapPlayerValue: (() => {
          if (!contract.swapPlayer?.playerValue) return "";
          const numeric =
            typeof contract.swapPlayer.playerValue === "number"
              ? contract.swapPlayer.playerValue
              : parseValue(String(contract.swapPlayer.playerValue || "0"));
          return numeric > 0 ? formatTransferValue(numeric).toLowerCase() : "";
        })(),
        swapPlayerSector: contract.swapPlayer?.sector || "",
        swapPlayerPosition: contract.swapPlayer?.position || "",
        sellOnPercentageClause: contract.transferClauses?.sellOnPercentage
          ? `${contract.transferClauses.sellOnPercentage}%`
          : "",
        buybackValue: contract.transferClauses?.buybackValue
          ? formatDisplayValue(
              contract.transferClauses.buybackValue,
              career.currency,
            )
          : "",
        loanBackDuration: contract.transferClauses?.loanBackDuration
          ? `${contract.transferClauses.loanBackDuration} temporada${
              contract.transferClauses.loanBackDuration > 1 ? "s" : ""
            }`
          : "",
        salary: initialSalary,
        contractTime: initialContractTime,
        contractUntil: initialContractUntil,
        signingBonus: initialSigningBonus,
        agentFee: initialAgentFee,
      };
      return res;
    }
  }, [career.currency, contract, direction, player]);

  const [formValues, setFormValues] =
    useState<Record<string, string>>(initialValues);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  const {
    bonuses,
    editingBonusIndex,
    setBonuses,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
  } = useTransferBonusesDraft({
    formValues,
    setFormValues,
    initialBonuses: contract.bonuses ? [...contract.bonuses] : [],
    getDirection: () => "receivable",
    getPartnerClub: () => formValues.toClub || "",
    requireValueSuffix: false,
    validateSingleObjective: false,
    hasPerformanceCountInput: true,
    getNextCategoryAfterSave: () => "",
  });

  const handleCustomInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: { id: string },
  ) => {
    const fieldId = field?.id || e.target.name;
    let value = e.target.value;

    if (fieldId === "dateArrival" || fieldId === "dateExit") {
      value = formatDateInputShort(value);
    }

    if (fieldId === "sellOnPercentage") {
      value = value.replace("%", "").trim();
    }

    if (fieldId === "contractUntil") {
      value = formatDateInput(value);
      if (value.length === 10) {
        const years = calculateContractYears(
          value,
          career.createdAt,
          season.seasonNumber,
          career.nation,
        );
        if (years >= 1 && years <= 7) {
          setFormValues((prev) => ({ ...prev, contractTime: String(years) }));
        }
      }
    }

    setFormValues((prev) => {
      const next = { ...prev, [fieldId]: value };

      if (fieldId === "transferType") {
        const isSpecial = checkIsSpecialTransfer(contract, direction);
        if (!isSpecial) {
          if (direction === "exit") {
            if (value === "Venda") {
              setBooleanValues((b) => ({ ...b, hasBuyOption: false }));
            } else if (value === "Emprestar") {
              if (!next.timing) next.timing = "Imediata";
              if (!next.installmentsPercentage)
                next.installmentsPercentage = "20%";
              if (!next.installmentsYears)
                next.installmentsYears = "2 temporadas";
              setBooleanValues((b) => ({
                ...b,
                hasInstallments: false,
                hasPlayerSwap: false,
                hasBonus: false,
                hasOtherClauses: false,
                firstRefusal: false,
              }));
              setBonuses([]);
            }
          }
        }
      }

      if (fieldId === "bonusCategory") {
        next.bonusObjective = "";
        next.bonusCount = "";
      }

      return next;
    });
  };

  const handleBooleanChangeWrapper = (id: string, value: boolean) => {
    setBooleanValues((prev) => {
      const next = { ...prev, [id]: value };

      if (id === "isRetirement" && value) {
        next.isEndContract = false;
        next.hasInstallments = false;
        next.hasPlayerSwap = false;
        next.hasBonus = false;
        next.hasOtherClauses = false;
        setBonuses([]);
      } else if (id === "isEndContract" && value) {
        next.isRetirement = false;
        next.hasInstallments = false;
        next.hasPlayerSwap = false;
        next.hasBonus = false;
        next.hasOtherClauses = false;
        setBonuses([]);
      }

      if (id === "hasBonus" && !value) {
        setBonuses([]);
      }

      return next;
    });
  };

  const currentClubName =
    direction === "arrivals" ? formValues.fromClub : formValues.toClub;

  const { filteredTeamOptions } = useGlobalTeamsOptions({
    career,
    season,
    searchQuery: currentClubName || "",
  });

  const mergedFormValues = useMemo(
    () =>
      mergeFormValues(
        formValues,
        booleanValues as unknown as Record<string, boolean>,
      ),
    [formValues, booleanValues],
  );

  const handleProceedToStep2 = () => {
    const club =
      direction === "arrivals" ? formValues.fromClub : formValues.toClub;
    if (!club || !club.trim()) {
      toast.warning("Por favor, informe o clube.");
      return false;
    }
    setCurrentStep(2);
    return true;
  };

  const handleReturnToStep1 = () => {
    setCurrentStep(1);
  };

  const { handleSave, handleRevertTransfer } = useEditTransferActions({
    career,
    season,
    player,
    contract,
    contractIndex,
    direction,
    onClose,
    formValues,
    booleanValues,
    bonuses,
    setIsLoading,
  });

  return {
    currentStep,
    setCurrentStep,
    handleProceedToStep2,
    handleReturnToStep1,
    isLoading,
    formValues,
    booleanValues,
    mergedFormValues,
    bonuses,
    editingBonusIndex,
    customBonusOptions,
    filteredTeamOptions,
    handleInputChange: handleCustomInputChange,
    handleCustomInputChange,
    handleBooleanChangeWrapper,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
    handleSave,
    handleRevertTransfer,
  };
};

export default useEditTransferForm;
