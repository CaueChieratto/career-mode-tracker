import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { mergeFormValues, useForm } from "../../../../../../../../../common/hooks/UseForm";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import {
  formatDateInputShort,
  brasilDatePlaceholderShort,
} from "../../../../../../../../../common/utils/Date";
import {
  formatDisplayValue,
  parseValue,
  formatTransferValue,
  formatCompactNumber,
} from "../../../../../../../../../common/utils/FormatValue";
import { Field } from "../../../../../../../../../components/FormSection";
import { BooleanValues, FormValues } from "../../types";
import { validateTransfer } from "../../validators/transferValidator";
import { validateLoan } from "../../validators/loanValidator";
import { useEditSquadPlayer } from "../useEditSquadPlayer";
import { PlayersContractService } from "../../../../../../../../../common/services/ServicePlayers/PlayersContractService";
import {
  shouldPlayerLeaveOnNextWindow,
  isNextSeasonTiming,
  isNextWindowTiming,
} from "../../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import { checkIsSpecialTransfer } from "../../constants/buildEditTransferFormSections";
import {
  TransferBonus,
  createTransferInstallments,
  TransferTiming,
} from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import {
  ensureTeamSavedInSeason,
  useGlobalTeamsOptions,
} from "../../../shared/useGlobalTeamsOptions";
import { useTransferBonusesDraft } from "../useTransferBonusesDraft";
import { useEditTransferActions } from "../useEditTransferActions";
import { toast } from "../../../../../../../../../common/services/ToastService";
import { NavigationSessionStore } from "../../../../../../../../../common/services/NavigationSessionStore";
import { SectionScreen } from "../../../../../../../config/screens";
import { OptimisticUpdateData } from "../../../../../../../helpers/updateSectionCareer";
import { parseLoanDuration } from "../../../../../../../../../common/utils/parseLoanDuration";
import { ServiceProposals } from "../../../../../../../../../common/services/ServiceProposals";
import { calculateOverallProposalStatus } from "../../../../../../../../../common/helpers/proposals/proposalStatusHelper";
import {
  ClubNegotiationStage,
  NegotiationStageStatus,
  ProposalType,
  TransferProposal,
} from "../../../../../../../../../common/interfaces/proposals/transferProposal";

type UseTransferFormProps = {
  careerId: string;
  season: ClubData;
  seasonId?: string;
  career: Career;
  player: Players;
  currentPlayers: Players[];
  handleGoBack: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  initialMode?: "transfer" | "loan";
  prefill?: {
    sellValue?: string;
    lockSellValue?: boolean;
    toClub?: string;
    lockToClub?: boolean;
    lockTransferType?: boolean;
    sourceSeasonId?: string;
    sourcePlayerId?: string;
    sourceContractIndex?: number;
    mode?: "buyback" | "release_clause" | "transfer" | "loan";
  };
  proposalId?: string;
  initialProposal?: TransferProposal;
  editTransfer?: {
    player: Players;
    contract: NonNullable<Players["contract"]>[number];
    contractIndex: number;
    direction?: "arrivals" | "exit";
  };
};

export const useTransferForm = ({
  careerId,
  season,
  seasonId,
  career,
  player,
  currentPlayers,
  handleGoBack,
  onOpenScreen,
  initialMode,
  prefill,
  proposalId,
  initialProposal,
  editTransfer,
}: UseTransferFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const [customBonusOptions, setCustomBonusOptions] = useState<
    Record<string, string[]>
  >(() => career?.customBonusObjectives || {});

  const { formValues, setFormValues, handleInputChange } = useForm();

  const { filteredTeamOptions } = useGlobalTeamsOptions({
    career,
    season,
    searchQuery: formValues.toClub || "",
  });

  const {
    bonuses,
    editingBonusIndex,
    setBonuses,
    setEditingBonusIndex,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
  } = useTransferBonusesDraft({
    formValues,
    setFormValues,
    getDirection: () => "receivable",
    getPartnerClub: () => formValues.toClub || "",
    requireValueSuffix: true,
    validateSingleObjective: true,
    hasPerformanceCountInput: true,
  });

  useEffect(() => {
    if (editTransfer) return;
    setFormValues((prev) => {
      let defaultSellValue = prefill?.sellValue || "";
      if (defaultSellValue && /^\d+$/.test(defaultSellValue)) {
        const num = Number(defaultSellValue);
        if (num > 0) {
          defaultSellValue = formatCompactNumber(num).toLowerCase();
        }
      }
      const defaultToClub = prefill?.toClub || prev.toClub || "";

      return {
        ...prev,
        toClub: defaultToClub,
        transferType:
          prefill?.lockTransferType
            ? "Venda"
            : prev.transferType ||
              (initialMode === "loan" ? "Emprestar" : "Venda"),
        timing: prev.timing || "Imediata",
        sellValue: prev.sellValue || defaultSellValue,
        transferFee: prev.transferFee || defaultSellValue,
        buyOption: prev.buyOption || "",
        buyOptionValue: prev.buyOptionValue || "",
      };
    });
  }, [
    editTransfer,
    initialMode,
    prefill?.sellValue,
    prefill?.toClub,
    prefill?.lockTransferType,
    setFormValues,
  ]);

  const isSellValueLocked = Boolean(prefill?.lockSellValue);
  const isToClubLocked = Boolean(prefill?.lockToClub);
  const isTransferTypeLocked = Boolean(
    prefill?.lockTransferType ||
      prefill?.mode === "buyback" ||
      prefill?.mode === "release_clause" ||
      (editTransfer && checkIsSpecialTransfer(editTransfer.contract, "exit")),
  );

  const currentTransferType =
    (formValues.transferType as "Venda" | "Emprestar") ||
    (editTransfer
      ? editTransfer.contract.isLoan
        ? "Emprestar"
        : "Venda"
      : initialMode === "loan"
        ? "Emprestar"
        : "Venda");
  const activeTab = currentTransferType === "Emprestar" ? 2 : 1;

  const [booleanValues, setBooleanValues] = useState<BooleanValues>({
    isRetirement: false,
    isEndContract: false,
    isReturnLoan: false,
    hasInstallments: false,
    hasPlayerSwap: false,
    hasBonus: false,
    hasOtherClauses: false,
    firstRefusal: false,
    hasBuyOption: false,
  });

  const editTransferAppliedRef = useRef(false);
  useEffect(() => {
    if (!editTransfer || editTransferAppliedRef.current) return;
    editTransferAppliedRef.current = true;
    const { player: editPlayer, contract } = editTransfer;
    const isLoanExit = Boolean(contract.isLoan);
    const extra = contract as unknown as Record<string, unknown>;
    const instAny = contract.installments as unknown as
      | { totalValue?: number }
      | undefined;
    const rawExitFee =
      (typeof contract.sellValue === "number" && contract.sellValue > 0) ||
      (typeof contract.sellValue === "string" &&
        parseValue(contract.sellValue) > 0)
        ? contract.sellValue
        : instAny?.totalValue ||
          (contract.installments
            ? contract.installments.annualInstallmentValue *
                contract.installments.totalInstallments +
              (contract.installments.upfrontValue || 0)
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

    const exercisedDerivedContract = editPlayer.contract?.find(
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
      exercisedDerivedContract?.transferClauses?.sellOnPercentage ??
      contract.transferClauses?.sellOnPercentage;

    let timingStr = "Imediata";
    if (isNextSeasonTiming(contract.timing)) {
      timingStr = "Proxima Temporada";
    } else if (isNextWindowTiming(contract.timing)) {
      timingStr = "Proxima Janela";
    }

    const dateExitStr = contract.dataExit
      ? brasilDatePlaceholderShort(new Date(contract.dataExit))
      : "01/07";

    setFormValues((prev) => ({
      ...prev,
      transferType: isLoanExit ? "Emprestar" : "Venda",
      timing: timingStr,
      toClub: contract.leftClub || "",
      sellValue: isLoanExit ? initialBuyOption || exitFeeStr : exitFeeStr,
      transferFee: exitFeeStr || initialBuyOption,
      loanDuration: contract.loanDuration
        ? String(contract.loanDuration)
        : contract.loanTerms?.durationYears
          ? String(contract.loanTerms.durationYears)
          : isLoanExit
            ? "1"
            : "",
      wagePercentage:
        contract.wagePercentage !== undefined &&
        contract.wagePercentage !== null &&
        String(contract.wagePercentage) !== ""
          ? String(contract.wagePercentage)
          : contract.loanTerms?.theirWagePercentage !== undefined &&
              contract.loanTerms.theirWagePercentage !== null
            ? String(contract.loanTerms.theirWagePercentage)
            : isLoanExit
              ? "0"
              : "",
      buyOption: initialBuyOption || exitFeeStr,
      buyOptionValue: initialBuyOption || exitFeeStr,
      sellOnPercentage:
        sellOnPct !== undefined && sellOnPct !== null ? String(sellOnPct) : "",
      dateExit: dateExitStr,
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
      swapPlayerPosition: contract.swapPlayer?.position || "",
      swapPlayerSector: contract.swapPlayer?.sector || "",
      buybackValue: contract.transferClauses?.buybackValue
        ? formatTransferValue(
            contract.transferClauses.buybackValue,
          ).toLowerCase()
        : "",
      loanBackDuration: contract.transferClauses?.loanBackDuration
        ? String(contract.transferClauses.loanBackDuration)
        : "",
    }));

    setBooleanValues({
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
            (contract.buyOptionValue &&
              Number(contract.buyOptionValue) > 0) ||
            (contract.loanTerms?.buyOptionFee &&
              Number(contract.loanTerms.buyOptionFee) > 0) ||
            (contract.isLoan && Number(contract.sellValue || 0) > 0)),
      ),
    });

    if (contract.bonuses && contract.bonuses.length > 0) {
      setBonuses(contract.bonuses);
    }
  }, [editTransfer, setFormValues, setBonuses]);

  const [clubNegotiationStatus, setClubNegotiationStatus] =
    useState<NegotiationStageStatus>("em_negociacao");
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationProposal, setConfirmationProposal] =
    useState<TransferProposal | null>(null);

  const proposalRestoredIdRef = useRef<string | null>(null);

  const applyProposalData = useCallback(
    (proposal: TransferProposal) => {
      const isLoanProposal = proposal.type === "emprestimo_saida";

      const resolvePositiveFee = (
        ...candidates: Array<number | string | undefined | null>
      ): { numeric: number; rawStr: string } => {
        for (const cand of candidates) {
          if (typeof cand === "number" && cand > 0) {
            return { numeric: cand, rawStr: "" };
          }
          if (typeof cand === "string" && cand.trim() !== "") {
            const parsed = parseValue(cand);
            if (parsed > 0) {
              return { numeric: parsed, rawStr: cand.trim() };
            }
            if (cand.trim() !== "0") {
              return { numeric: 0, rawStr: cand.trim() };
            }
          }
        }
        return { numeric: 0, rawStr: "" };
      };

      const instTotal = proposal.clubNegotiation?.installments
        ? proposal.clubNegotiation.installments.annualInstallmentValue *
            proposal.clubNegotiation.installments.totalInstallments +
          (proposal.clubNegotiation.installments.upfrontValue || 0)
        : undefined;

      const { numeric: numericFee, rawStr: rawFeeStr } = resolvePositiveFee(
        proposal.clubNegotiation?.transferFee,
        instTotal,
        proposal.formState?.formValues?.sellValue,
        proposal.formState?.formValues?.transferFee,
        proposal.playerValue,
      );
      const formattedSellFee =
        numericFee > 0 ? formatTransferValue(numericFee).toLowerCase() : rawFeeStr;

      const { numeric: numericBuyOpt, rawStr: rawBuyOptStr } =
        resolvePositiveFee(
          proposal.clubNegotiation?.loanTerms?.buyOptionFee,
          proposal.formState?.formValues?.buyOption,
          proposal.formState?.formValues?.buyOptionValue,
          isLoanProposal ? proposal.clubNegotiation?.transferFee : undefined,
        );
      const formattedBuyOpt =
        numericBuyOpt > 0
          ? formatTransferValue(numericBuyOpt).toLowerCase()
          : rawBuyOptStr;

      const hasProposalBuyOption = Boolean(
        proposal.clubNegotiation?.loanTerms?.hasBuyOption ||
          numericBuyOpt > 0 ||
          Boolean(formattedBuyOpt),
      );

      const partnerClub = proposal.clubNegotiation?.partnerClub || "";

      setFormValues((prev) => {
        const raw = proposal.formState?.formValues || {};
        if (isLoanProposal) {
          return {
            ...prev,
            ...raw,
            transferType: "Emprestar",
            toClub: raw.toClub || partnerClub || prev.toClub,
            loanDuration: String(
              raw.loanDuration ??
                proposal.clubNegotiation?.loanTerms?.durationYears ??
                1,
            ),
            wagePercentage: String(
              raw.wagePercentage ??
                proposal.clubNegotiation?.loanTerms?.ourWagePercentage ??
                proposal.clubNegotiation?.loanTerms?.theirWagePercentage ??
                100,
            ),
            buyOption:
              formattedBuyOpt || raw.buyOption || raw.buyOptionValue || "",
            buyOptionValue:
              formattedBuyOpt || raw.buyOptionValue || raw.buyOption || "",
            sellValue: "",
            transferFee: "",
            timing: proposal.timing || raw.timing || "Imediata",
          };
        } else {
          const finalFee =
            formattedSellFee ||
            raw.sellValue ||
            raw.transferFee ||
            (proposal.playerValue
              ? formatTransferValue(proposal.playerValue).toLowerCase()
              : "") ||
            "";
          return {
            ...prev,
            ...raw,
            transferType: "Venda",
            toClub: raw.toClub || partnerClub || prev.toClub,
            sellValue: finalFee,
            transferFee: finalFee,
            buyOption: "",
            buyOptionValue: "",
            timing: proposal.timing || raw.timing || "Imediata",
          };
        }
      });
      setBooleanValues((prev) => ({
        ...prev,
        ...(proposal.formState?.booleanValues || {}),
        ...(hasProposalBuyOption ? { hasBuyOption: true } : {}),
        ...(proposal.clubNegotiation?.swapPlayer?.playerName
          ? { hasPlayerSwap: true }
          : {}),
      }));
      if (proposal.clubNegotiation?.bonuses?.length) {
        setBonuses(proposal.clubNegotiation.bonuses);
      }
      if (proposal.clubNegotiation?.status) {
        setClubNegotiationStatus(proposal.clubNegotiation.status);
      }
    },
    [setFormValues, setBonuses],
  );

  useEffect(() => {
    if (initialProposal) {
      const proposalKey = `${initialProposal.id}_${initialProposal.updatedAt || ""}`;
      if (proposalRestoredIdRef.current === proposalKey) return;
      proposalRestoredIdRef.current = proposalKey;
      applyProposalData(initialProposal);
      return;
    }

    if (proposalId) {
      if (proposalRestoredIdRef.current === proposalId) return;
      proposalRestoredIdRef.current = proposalId;
      const targetSeasonId = seasonId || season.id;
      ServiceProposals.getProposalById(careerId, targetSeasonId, proposalId)
        .then((proposal) => {
          if (!proposal) return;
          applyProposalData(proposal);
        })
        .catch((err) => {
          console.error("Erro ao restaurar proposta em TransferPlayer:", err);
        });
      return;
    }
  }, [initialProposal, proposalId, seasonId, careerId, season.id, applyProposalData]);

  const { sellPlayer, loanPlayer, returnLoanPlayer } = useEditSquadPlayer({
    careerId,
    seasonId: season.id,
    playerId: player.id,
    currentPlayers,
    onPlayerEdited: () => {},
    career,
    season,
  });

  useEffect(() => {
    if (proposalId || initialProposal) return;
    if (player?.loan) {
      const lastContract = player.contract?.[player.contract.length - 1];
      if (lastContract) {
        const hasBuyOpt = Boolean(
          lastContract.loanTerms?.hasBuyOption ||
            (lastContract.buyOptionValue && lastContract.buyOptionValue > 0),
        );
        const buyOptVal =
          lastContract.buyOptionValue || lastContract.loanTerms?.buyOptionFee;
        const sellOnPct = lastContract.loanTerms?.sellOnPercentage;

        setFormValues((prev) => ({
          ...prev,
          toClub: lastContract.leftClub || "",
          buyOption: buyOptVal ? formatDisplayValue(buyOptVal as number) : "",
          sellOnPercentage: sellOnPct !== undefined ? String(sellOnPct) : "",
          loanDuration: lastContract.loanDuration
            ? String(lastContract.loanDuration)
            : "",
          wagePercentage: lastContract.wagePercentage
            ? String(lastContract.wagePercentage)
            : "",
        }));

        setBooleanValues((prev) => ({
          ...prev,
          hasBuyOption: hasBuyOpt,
        }));
      }
    }
  }, [player, proposalId, initialProposal, setFormValues]);

  const handleBooleanChangeWrapper = (id: string, value: boolean) => {
    setBooleanValues((prev) => {
      const newVals = { ...prev, [id]: value };
      if (id === "isRetirement" && value) newVals.isEndContract = false;
      if (id === "isEndContract" && value) newVals.isRetirement = false;
      return newVals;
    });
    if (id === "hasBuyOption" && !value) {
      setFormValues((prev) => ({
        ...prev,
        buyOption: "",
        sellOnPercentage: "",
      }));
    }
  };

  const handleCustomInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: Field,
  ) => {
    if (field.id === "dateExit") {
      e.target.value = formatDateInputShort(e.target.value);
    }
    if (field.id === "swapPlayerSector") {
      setFormValues((prev) => ({
        ...prev,
        swapPlayerSector: e.target.value,
        swapPlayerPosition: "",
      }));
      return;
    }
    if (field.id === "bonusCategory") {
      setFormValues((prev) => ({
        ...prev,
        bonusCategory: e.target.value,
        bonusObjective: "",
        bonusLeague: "",
        bonusCount: "",
      }));
      return;
    }
    handleInputChange(e, field);
  };

  const saveDestinationTeamIfNew = async (toClubName: string) => {
    await ensureTeamSavedInSeason(careerId, season.id, season, toClubName);
  };

  const processTransfer = async (): Promise<OptimisticUpdateData | null> => {
    const { isValid, error, data } = validateTransfer(
      formValues as FormValues,
      booleanValues,
      season.seasonNumber,
      bonuses,
    );
    if (!isValid || !data) {
      toast.warning(error || "Dados da transferência inválidos.");
      return null;
    }

    const isLoanBack = Boolean(data.transferClauses?.loanBackDuration);
    let isSoldNow = !isLoanBack;
    if (isNextSeasonTiming(data.timing)) {
      isSoldNow = false;
    } else if (isNextWindowTiming(data.timing)) {
      const shouldLeave = shouldPlayerLeaveOnNextWindow(
        season.matches || [],
        data.dateExit,
      );
      isSoldNow = shouldLeave ? !isLoanBack : false;
    }

    player.sell = isSoldNow;
    player.incomingLoan = isLoanBack;
    player.loan = false;

    await saveDestinationTeamIfNew(data.toClub);

    if (booleanValues.hasBonus && formValues.bonusObjective) {
      const cat = formValues.bonusCategory || "Objetivo atingido";
      try {
        await PlayersContractService.saveCustomBonusObjective(
          careerId,
          cat,
          formValues.bonusObjective,
          career.groupId,
        );
        setCustomBonusOptions((prev) => ({
          ...prev,
          [cat]: Array.from(
            new Set([...(prev[cat] || []), formValues.bonusObjective.trim()]),
          ),
        }));
      } catch (err) {
        console.error("Erro ao salvar objetivo customizado de bônus:", err);
      }
    }

    await sellPlayer(data.sellValue, data.toClub, data.dateExit, {
      timing: data.timing,
      installments: data.installments,
      swapPlayer: data.swapPlayer,
      bonuses: data.bonuses,
      transferClauses: data.transferClauses,
      settledBuybackContractIndex:
        prefill?.mode === "buyback" ? prefill.sourceContractIndex : undefined,
    });

    const optimisticData: OptimisticUpdateData = {
      type: "TRANSFER_PLAYER_EXIT",
      playerId: player.id,
      exitData: {
        sell: isSoldNow,
      },
    };

    return optimisticData;
  };

  const processLoan = async (): Promise<OptimisticUpdateData | null> => {
    const { isValid, error, data } = validateLoan(
      formValues as FormValues,
      booleanValues,
    );
    if (!isValid || !data) {
      toast.warning(error || "Dados da transferência inválidos.");
      return null;
    }

    let loanData: Partial<Players>;
    if (data.isReturning) {
      await returnLoanPlayer(data.dateLoan);
      loanData = {
        loan: false,
        incomingLoan: false,
      };
    } else {
      await saveDestinationTeamIfNew(data.toClub!);

      await loanPlayer(
        data.buyOption || "",
        data.toClub!,
        data.dateLoan,
        data.loanDuration!,
        data.wagePercentage!,
        data.loanTerms,
      );
      loanData = {
        loan: true,
      };
    }

    const optimisticData: OptimisticUpdateData = {
      type: "TRANSFER_PLAYER_LOAN",
      playerId: player.id,
      loanData,
    };

    return optimisticData;
  };

  const {
    handleSave: handleSaveEditedTransfer,
    handleRevertTransfer,
  } = useEditTransferActions({
    career,
    season,
    player: editTransfer?.player || player,
    contract: (editTransfer?.contract || {}) as NonNullable<
      Players["contract"]
    >[number],
    contractIndex: editTransfer?.contractIndex ?? 0,
    direction: editTransfer?.direction || "exit",
    onClose: handleGoBack,
    formValues: formValues as FormValues,
    booleanValues,
    bonuses,
    setIsLoading,
  });

  const handleSave = async () => {
    if (editTransfer) {
      await handleSaveEditedTransfer();
      return;
    }
    if (player.incomingLoan) {
      toast.warning(
        "Jogadores emprestados ao clube não podem ser vendidos ou emprestados.",
      );
      return;
    }
    setIsLoading(true);
    try {
      let optimisticPayload: OptimisticUpdateData | null = null;
      if (activeTab === 1) {
        optimisticPayload = await processTransfer();
      } else {
        optimisticPayload = await processLoan();
      }
      if (optimisticPayload) {
        toast.success(
          booleanValues.isRetirement
            ? "Aposentadoria registrada com sucesso!"
            : booleanValues.isEndContract
              ? "Término de contrato registrado com sucesso!"
              : activeTab === 1
                ? "Venda registrada com sucesso!"
                : booleanValues.isReturnLoan
                  ? "Jogador retornado com sucesso!"
                  : "Empréstimo registrado com sucesso!",
        );
        if (player?.id) {
          NavigationSessionStore.saveClickAnchor("squad", {
            scrollY: 0,
            anchorSelector: `#player-row-${player.id}`,
            updatedAt: Date.now(),
          });
        }
        handleGoBack(optimisticPayload);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao processar a negociação.",
      );
      console.error("Erro: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const drawerSnapshotRef = useRef<{
    formValues: Record<string, string>;
    booleanValues: BooleanValues;
    bonuses: TransferBonus[];
    editingBonusIndex: number | null;
  } | null>(null);

  const openDrawerWithSnapshot = useCallback(
    (name: "installments" | "swap" | "bonus" | "other") => {
      drawerSnapshotRef.current = {
        formValues: { ...(formValues as Record<string, string>) },
        booleanValues: { ...booleanValues },
        bonuses: [...bonuses],
        editingBonusIndex,
      };
      if (name === "installments") {
        setBooleanValues((prev) => ({ ...prev, hasInstallments: true }));
      } else if (name === "swap") {
        setBooleanValues((prev) => ({ ...prev, hasPlayerSwap: true }));
      } else if (name === "bonus") {
        setBooleanValues((prev) => ({ ...prev, hasBonus: true }));
      } else if (name === "other") {
        setBooleanValues((prev) => ({ ...prev, hasOtherClauses: true }));
      }
    },
    [formValues, booleanValues, bonuses, editingBonusIndex],
  );

  const cancelDrawerSnapshot = useCallback(() => {
    if (drawerSnapshotRef.current) {
      setFormValues(drawerSnapshotRef.current.formValues);
      setBooleanValues(drawerSnapshotRef.current.booleanValues);
      setBonuses(drawerSnapshotRef.current.bonuses);
      setEditingBonusIndex(drawerSnapshotRef.current.editingBonusIndex);
      drawerSnapshotRef.current = null;
    }
  }, [setFormValues, setBonuses, setEditingBonusIndex]);

  const commitDrawerSnapshot = useCallback(() => {
    drawerSnapshotRef.current = null;
  }, []);

  const buildProposalData = (
    asAccepted = false,
  ): Omit<TransferProposal, "id"> => {
    const isVenda = activeTab === 1;
    const type: ProposalType = isVenda ? "venda" : "emprestimo_saida";
    const partnerClub = (formValues.toClub || "").trim();
    const feeNum = isVenda ? parseValue(formValues.sellValue || "0") : undefined;

    const existingClub = initialProposal?.clubNegotiation;
    const effectiveFee = feeNum && feeNum > 0 ? feeNum : existingClub?.transferFee;

    let installments;
    if (isVenda && booleanValues.hasInstallments && feeNum && feeNum > 0) {
      const years = Math.min(
        Math.max(Number(formValues.installmentsYears) || 3, 1),
        7,
      );
      const upfrontPct =
        Number(formValues.installmentsUpfrontPercentage) || 40;
      const rawPct = 100 - upfrontPct;
      const validPct = [20, 40, 60, 80, 100].includes(rawPct)
        ? (rawPct as 20 | 40 | 60 | 80 | 100)
        : 60;
      installments = createTransferInstallments({
        totalValue: feeNum,
        percentage: validPct,
        totalInstallments: years,
        currentSeasonNumber: season.seasonNumber,
        direction: "receivable",
        partnerClub,
      });
    }

    let preservedInstallments = installments ?? existingClub?.installments;
    if (
      isVenda &&
      preservedInstallments &&
      effectiveFee &&
      effectiveFee > 0 &&
      !booleanValues.hasInstallments
    ) {
      preservedInstallments = createTransferInstallments({
        totalValue: effectiveFee,
        percentage: preservedInstallments.percentage,
        totalInstallments: preservedInstallments.totalInstallments,
        paidInstallments:
          preservedInstallments.totalInstallments -
          preservedInstallments.remainingInstallments,
        currentSeasonNumber: season.seasonNumber,
        direction: "receivable",
        partnerClub,
      });
    }

    const currentClubStatus: NegotiationStageStatus = asAccepted
      ? "aceita"
      : clubNegotiationStatus || existingClub?.status || "aceita";

    const wageNum =
      formValues.wagePercentage !== undefined &&
      formValues.wagePercentage.trim() !== ""
        ? Number(formValues.wagePercentage)
        : undefined;

    const clubStage: ClubNegotiationStage = {
      ...existingClub,
      partnerClub,
      status: currentClubStatus,
      transferFee: isVenda ? effectiveFee : undefined,
      installments: isVenda
        ? (booleanValues.hasInstallments ? installments : preservedInstallments)
        : undefined,
      swapPlayer: isVenda ? existingClub?.swapPlayer : undefined,
      sellOnPercentage: isVenda
        ? Number(formValues.sellOnPercentage) || existingClub?.sellOnPercentage
        : undefined,
      buybackValue: isVenda
        ? (formValues.buybackClauseFee
            ? parseValue(formValues.buybackClauseFee)
            : existingClub?.buybackValue)
        : undefined,
      firstRefusal: isVenda
        ? Boolean(booleanValues.firstRefusal || existingClub?.firstRefusal)
        : undefined,
      loanBackDuration: isVenda ? existingClub?.loanBackDuration : undefined,
      bonuses: isVenda
        ? (bonuses.length > 0 ? bonuses : existingClub?.bonuses)
        : undefined,
      loanTerms: !isVenda
        ? {
            durationYears:
              parseLoanDuration(formValues.loanDuration || "1") ??
              (Number(formValues.loanDuration) || 1),
            ourWagePercentage:
              wageNum !== undefined
                ? Math.max(0, 100 - wageNum)
                : existingClub?.loanTerms?.ourWagePercentage,
            theirWagePercentage:
              wageNum !== undefined
                ? Math.min(100, Math.max(0, wageNum))
                : existingClub?.loanTerms?.theirWagePercentage,
            hasBuyOption: Boolean(
              booleanValues.hasBuyOption &&
                parseValue(formValues.buyOption || "0") > 0,
            ),
            buyOptionFee:
              booleanValues.hasBuyOption &&
              parseValue(formValues.buyOption || "0") > 0
                ? parseValue(formValues.buyOption)
                : undefined,
            sellOnPercentage:
              booleanValues.hasBuyOption && formValues.sellOnPercentage
                ? Number(formValues.sellOnPercentage)
                : undefined,
            partnerClub,
          }
        : undefined,
    };

    const overallStatus = calculateOverallProposalStatus({
      type,
      clubNegotiation: clubStage,
      playerNegotiation: undefined,
    });

    return {
      careerId,
      seasonId: season.id,
      type,
      overallStatus: asAccepted ? "aguardando_confirmacao" : overallStatus,
      playerId: player.id,
      playerName: player.name,
      playerNation: player.nation || career.nation || "BRA",
      playerPosition: player.position,
      playerSector: player.sector || "Ataque",
      playerOverall: player.overall,
      playerAge: player.age,
      playerValue: player.playerValue ? player.playerValue : undefined,
      shirtNumber: player.shirtNumber || undefined,
      isKnownPlayer: true,
      clubNegotiation: clubStage,
      playerNegotiation: undefined,
      timing: (formValues.timing as TransferTiming) || "Imediata",
      agreementDate: isVenda
        ? initialProposal?.agreementDate
        : formValues.dateLoan || initialProposal?.agreementDate,
      formState: {
        formValues: {
          ...formValues,
          ...(isVenda
            ? {
                sellValue:
                  formValues.sellValue ||
                  formValues.transferFee ||
                  (feeNum && feeNum > 0
                    ? formatTransferValue(feeNum).toLowerCase()
                    : ""),
                transferFee:
                  formValues.transferFee ||
                  formValues.sellValue ||
                  (feeNum && feeNum > 0
                    ? formatTransferValue(feeNum).toLowerCase()
                    : ""),
              }
            : {}),
        },
        booleanValues,
      },
    };
  };

  const handleSaveProposal = async (
    asAccepted = false,
  ): Promise<TransferProposal | null> => {
    if (player.incomingLoan) {
      toast.warning(
        "Jogadores emprestados ao clube não podem ter propostas de saída cadastradas.",
      );
      return null;
    }

    const toClub = (formValues.toClub || "").trim();
    if (!toClub) {
      toast.warning("Por favor, selecione ou informe o clube de destino.");
      return null;
    }

    if (activeTab === 1) {
      const rawSellValue = parseValue(formValues.sellValue || "0");
      if (!formValues.sellValue || rawSellValue <= 0) {
        toast.warning("Por favor, informe o valor da venda do jogador.");
        return null;
      }
    } else if (activeTab === 2) {
      if (!formValues.loanDuration) {
        toast.warning("Por favor, selecione a duração do empréstimo.");
        return null;
      }
      if (!formValues.wagePercentage) {
        toast.warning(
          "Por favor, informe a porcentagem de salário paga pelo clube de destino.",
        );
        return null;
      }
      if (booleanValues.hasBuyOption && !formValues.buyOption) {
        toast.warning("Por favor, informe o valor da opção de compra.");
        return null;
      }
    }

    setIsLoading(true);
    try {
      const payload = buildProposalData(asAccepted);
      let saved: TransferProposal;

      if (proposalId) {
        await ServiceProposals.updateProposal(
          careerId,
          season.id,
          proposalId,
          payload,
        );
        saved = { ...payload, id: proposalId };
      } else {
        saved = await ServiceProposals.createProposal(
          careerId,
          season.id,
          payload,
        );
      }

      toast.success(
        proposalId
          ? "Proposta atualizada com sucesso!"
          : "Proposta salva com sucesso!",
      );
      handleGoBack();
      if (onOpenScreen) {
        onOpenScreen({
          key: "manageClauses",
          initialTab: "exit",
          selectedPlayerName: saved.playerName,
          selectedProposalId: saved.id,
        });
      }
      return saved;
    } catch (err) {
      console.error("Erro ao salvar proposta:", err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar proposta.",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewAndFinalize = async () => {
    if (player.incomingLoan) {
      toast.warning(
        "Jogadores emprestados ao clube não podem ser vendidos ou emprestados.",
      );
      return;
    }

    if (activeTab === 1) {
      const { isValid, error } = validateTransfer(
        formValues as FormValues,
        booleanValues,
        season.seasonNumber,
        bonuses,
      );
      if (!isValid) {
        toast.warning(error || "Dados da transferência inválidos.");
        return;
      }
    } else {
      const { isValid, error } = validateLoan(
        formValues as FormValues,
        booleanValues,
      );
      if (!isValid) {
        toast.warning(error || "Dados do empréstimo inválidos.");
        return;
      }
    }

    setClubNegotiationStatus("aceita");
    const payload = buildProposalData(true);
    const proposalObj: TransferProposal = {
      ...payload,
      id:
        proposalId ||
        `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    setConfirmationProposal(proposalObj);
    setIsConfirmationOpen(true);
  };

  const executeFinalTransfer = async (
    _confirmedProposal: TransferProposal,
  ) => {
    void _confirmedProposal;
    setIsLoading(true);
    try {
      let optimisticPayload: OptimisticUpdateData | null = null;
      if (activeTab === 1) {
        optimisticPayload = await processTransfer();
      } else {
        optimisticPayload = await processLoan();
      }

      if (proposalId) {
        try {
          await ServiceProposals.updateProposalStatus(
            careerId,
            season.id,
            proposalId,
            "concluida",
          );
        } catch (updateErr) {
          console.warn(
            "Erro ao atualizar status da proposta para concluída:",
            updateErr,
          );
        }
      }

      if (optimisticPayload) {
        toast.success(
          booleanValues.isRetirement
            ? "Aposentadoria registrada com sucesso!"
            : booleanValues.isEndContract
              ? "Término de contrato registrado com sucesso!"
              : activeTab === 1
                ? "Venda registrada com sucesso!"
                : booleanValues.isReturnLoan
                  ? "Jogador retornado com sucesso!"
                  : "Empréstimo registrado com sucesso!",
        );
        if (player?.id) {
          NavigationSessionStore.saveClickAnchor("squad", {
            scrollY: 0,
            anchorSelector: `#player-row-${player.id}`,
            updatedAt: Date.now(),
          });
        }
        handleGoBack(optimisticPayload);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao processar a negociação.",
      );
      console.error("Erro: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDirectExit =
    Boolean(editTransfer) ||
    (!proposalId &&
      ((activeTab === 1 &&
        (booleanValues.isRetirement || booleanValues.isEndContract)) ||
        (activeTab === 2 &&
          (booleanValues.isReturnLoan || Boolean(player.loan)))));

  const navText = editTransfer
    ? "Salvar Alterações"
    : isDirectExit
      ? activeTab === 1
      ? "Confirmar Venda"
      : booleanValues.isReturnLoan
        ? "Retornar Jogador"
        : player.loan
          ? "Salvar Edição"
          : "Confirmar Empréstimo"
    : proposalId
      ? "Salvar Alterações"
      : "Enviar Proposta";

  const mergedFormValues = useMemo(
    () => mergeFormValues(formValues, booleanValues as unknown as Record<string, boolean>),
    [formValues, booleanValues],
  );

  return {
    activeTab,
    isLoading,
    formValues,
    booleanValues,
    mergedFormValues,
    navText,
    handleSave,
    handleSaveProposal,
    handleReviewAndFinalize,
    executeFinalTransfer,
    proposalId,
    editTransfer,
    handleRevertTransfer,
    clubNegotiationStatus,
    setClubNegotiationStatus,
    isConfirmationOpen,
    setIsConfirmationOpen,
    confirmationProposal,
    handleCustomInputChange,
    handleBooleanChangeWrapper,
    filteredTeamOptions,
    customBonusOptions,
    bonuses,
    editingBonusIndex,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
    isSellValueLocked,
    isToClubLocked,
    isTransferTypeLocked,
    openDrawerWithSnapshot,
    cancelDrawerSnapshot,
    commitDrawerSnapshot,
  };
};

