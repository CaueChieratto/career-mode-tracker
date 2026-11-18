import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { Contract } from "../../../../../../../../common/interfaces/playersInfo/contract";
import {
  parseBrasilDate,
  parseFullBrasilDate,
  brasilDatePlaceholderShort,
} from "../../../../../../../../common/utils/Date";
import { ServicePlayers } from "../../../../../../../../common/services/ServicePlayers";
import {
  applyEditToCareer,
  applyRevertToCareer,
} from "../../TransferPlayer/helpers/transferCareerStateReducers";
import { commitEditedCareerState } from "../../TransferPlayer/hooks/useEditTransferActions";
import { calculatePlayerAge } from "../../../../../../../../common/utils/calculatePlayerAge";
import { calculateContractYears } from "../../../../../../../../common/utils/calculateContractYears";
import { parseLoanDuration } from "../../../../../../../../common/utils/parseLoanDuration";
import { parseValue, formatTransferValue } from "../../../../../../../../common/utils/FormatValue";
import { getSeasonDateRange } from "../../../../../../../../common/utils/GetSeasonDateRange";
import { PlayersContractService } from "../../../../../../../../common/services/ServicePlayers/PlayersContractService";
import {
  SquadRole,
  ContractDetails,
} from "../../../../../../../../common/interfaces/playersInfo/contractClauses";
import {
  TransferTiming,
  TransferBonus,
  createTransferInstallments,
} from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { isNextSeasonTiming } from "../../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import {
  SectionScreen,
  TransferClausePrefill,
} from "../../../../../../config/screens";
import {
  TransferDraftService,
  PendingTransferDraft,
} from "../../../../../../../../common/services/TransferDraftService";
import { toast } from "../../../../../../../../common/services/ToastService";
import { NavigationSessionStore } from "../../../../../../../../common/services/NavigationSessionStore";
import { OptimisticUpdateData } from "../../../../../../helpers/updateSectionCareer";
import { ServiceProposals } from "../../../../../../../../common/services/ServiceProposals";
import { calculateOverallProposalStatus } from "../../../../../../../../common/helpers/proposals/proposalStatusHelper";
import {
  ClubNegotiationStage,
  NegotiationStageStatus,
  PlayerNegotiationStage,
  ProposalType,
  TransferProposal,
} from "../../../../../../../../common/interfaces/proposals/transferProposal";

export interface UseAddTransferPlayerActionsParams {
  career: Career;
  season: ClubData;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  prefill?: TransferClausePrefill;
  editTransfer?: {
    player: Players;
    contract: NonNullable<Players["contract"]>[number];
    contractIndex: number;
  };
  formValues: Record<string, string>;
  booleanValues: Record<string, boolean>;
  bonuses?: TransferBonus[];
  transferType: "Compra" | "Empréstimo";
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentStep?: React.Dispatch<React.SetStateAction<1 | 2>>;
  proposalId?: string;
  clubNegotiationStatus?: NegotiationStageStatus;
  playerNegotiationStatus?: NegotiationStageStatus;
  setClubNegotiationStatus?: React.Dispatch<
    React.SetStateAction<NegotiationStageStatus>
  >;
  setPlayerNegotiationStatus?: React.Dispatch<
    React.SetStateAction<NegotiationStageStatus>
  >;
  onOpenConfirmation?: (proposal: TransferProposal) => void;
}

export const useAddTransferPlayerActions = ({
  career,
  season,
  onClose,
  onOpenScreen,
  prefill,
  editTransfer,
  formValues,
  booleanValues,
  bonuses = [],
  transferType,
  setIsLoading,
  setCurrentStep,
  proposalId,
  clubNegotiationStatus = "em_negociacao",
  playerNegotiationStatus = "em_negociacao",
  setClubNegotiationStatus,
  setPlayerNegotiationStatus,
  onOpenConfirmation,
}: UseAddTransferPlayerActionsParams) => {
  const buildProposalData = (
    stage: 1 | 2 = 1,
    asAccepted = false,
  ): Omit<TransferProposal, "id"> => {
    const isCompra = transferType === "Compra";
    const playerName = (formValues.playerName || formValues.name || "").trim();
    const fromClubName = (formValues.fromClub || "").trim();
    const rawBuyValue =
      formValues.buyValue ||
      formValues.transferFee ||
      formValues.playerValue ||
      formValues.buyOption ||
      "0";
    const buyValueNum = parseValue(rawBuyValue);

    let installments;
    if (booleanValues.hasInstallments && buyValueNum > 0) {
      const years = Math.min(
        Math.max(Number(formValues.installmentsYears) || 3, 1),
        7,
      );
      const upfrontPct = Number(formValues.installmentsUpfrontPercentage) || 40;
      const rawPct = 100 - upfrontPct;
      const validPct = [20, 40, 60, 80, 100].includes(rawPct)
        ? (rawPct as 20 | 40 | 60 | 80 | 100)
        : 60;
      installments = createTransferInstallments({
        totalValue: buyValueNum,
        percentage: validPct,
        totalInstallments: years,
        currentSeasonNumber: season.seasonNumber,
        direction: "payable",
        partnerClub: fromClubName,
      });
    }

    const sellOnPct = Number(formValues.sellOnPercentage);
    const buybackFee =
      formValues.buybackClauseFee || formValues.buybackValue
        ? parseValue(formValues.buybackClauseFee || formValues.buybackValue)
        : undefined;

    let duration: number = 1;
    if (isCompra) {
      if (formValues.contractUntil) {
        duration = calculateContractYears(
          formValues.contractUntil,
          career.createdAt,
          season.seasonNumber,
          career.nation,
        );
      } else if (formValues.contractTime) {
        duration = Number(formValues.contractTime) || 1;
      }
    } else {
      duration = parseLoanDuration(formValues.loanDuration || "1") || 1;
    }

    const currentClubStatus: NegotiationStageStatus =
      stage === 1 && asAccepted ? "aceita" : clubNegotiationStatus;

    const clubStage: ClubNegotiationStage = {
      partnerClub: fromClubName,
      status: currentClubStatus,
      transferFee: buyValueNum > 0 ? buyValueNum : undefined,
      installments,
      sellOnPercentage: sellOnPct > 0 ? sellOnPct : undefined,
      buybackValue: buybackFee,
      firstRefusal: Boolean(
        booleanValues.firstRefusal || booleanValues.hasFirstRefusalClause,
      ),
      loanBackDuration:
        booleanValues.hasLoanBackClause && formValues.loanBackDuration
          ? (Number(formValues.loanBackDuration) as 1 | 2)
          : undefined,
      loanTerms: !isCompra
        ? {
            durationYears: duration,
            ourWagePercentage:
              formValues.wagePercentage !== undefined &&
              formValues.wagePercentage.trim() !== ""
                ? Number(formValues.wagePercentage)
                : undefined,
            theirWagePercentage:
              formValues.wagePercentage !== undefined &&
              formValues.wagePercentage.trim() !== ""
                ? 100 - Number(formValues.wagePercentage)
                : undefined,
            hasBuyOption: Boolean(booleanValues.hasBuyOption),
            buyOptionFee:
              booleanValues.hasBuyOption && formValues.buyOption
                ? parseValue(formValues.buyOption)
                : undefined,
            sellOnPercentage:
              booleanValues.hasBuyOption && formValues.sellOnPercentage
                ? Number(formValues.sellOnPercentage)
                : undefined,
            partnerClub: fromClubName,
          }
        : undefined,
      bonuses: bonuses.length > 0 ? bonuses : undefined,
    };

    const currentPlayerStatus: NegotiationStageStatus =
      stage === 2 && asAccepted ? "aceita" : playerNegotiationStatus;

    const playerSalaryNum = parseValue(formValues.salary || "0");
    const playerStage: PlayerNegotiationStage | undefined =
      stage === 2 || playerSalaryNum > 0 || proposalId
        ? {
            status: currentPlayerStatus,
            weeklyWage: playerSalaryNum,
            durationYears: duration,
            contractUntil: formValues.contractUntil || undefined,
            squadRole: (formValues.squadRole as SquadRole) || "Rodízio",
            signingBonus: formValues.signingBonus
              ? parseValue(formValues.signingBonus)
              : undefined,
            agentFee: formValues.agentFee
              ? parseValue(formValues.agentFee)
              : undefined,
            releaseClause: formValues.releaseClause
              ? parseValue(formValues.releaseClause)
              : undefined,
            wageAdjustment:
              formValues.wageAdjustmentType === "Aumentar" ||
              formValues.wageAdjustmentType === "Diminuir"
                ? {
                    enabled: true,
                    direction: formValues.wageAdjustmentType as
                      | "Aumentar"
                      | "Diminuir",
                    percentage:
                      parseInt(
                        (formValues.wageAdjustmentPercentage || "5").replace(
                          "%",
                          "",
                        ),
                        10,
                      ) || 5,
                    targetObjective: formValues.wageAdjustmentObjective || "",
                    status: "pending" as const,
                  }
                : undefined,
            performanceBonuses: bonuses.filter(
              (b) =>
                (!b.partnerClub || (b as { bonusOrigin?: string }).bonusOrigin === "player") &&
                (b.category === "performance" ||
                  b.bonusCategory === "Desempenho"),
            ),
          }
        : undefined;

    const type: ProposalType = isCompra ? "compra" : "emprestimo_entrada";
    const overallStatus = calculateOverallProposalStatus({
      type,
      clubNegotiation: clubStage,
      playerNegotiation: playerStage,
    });

    return {
      careerId: career.id,
      seasonId: season.id,
      type,
      overallStatus,
      playerId:
        (booleanValues.isKnownPlayer && formValues.globalId) ||
        `target_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      playerName,
      playerNation: formValues.nation || career.nation || "BRA",
      playerPosition: formValues.position,
      playerSector: formValues.sector,
      playerOverall: formValues.overall ? Number(formValues.overall) : undefined,
      playerAge: formValues.age ? Number(formValues.age) : undefined,
      playerValue: formValues.playerValue
        ? parseValue(formValues.playerValue)
        : buyValueNum > 0
          ? buyValueNum
          : undefined,
      shirtNumber: formValues.shirtNumber || undefined,
      height: formValues.height || undefined,
      weight: formValues.weight || undefined,
      isKnownPlayer: Boolean(booleanValues.isKnownPlayer),
      playedWithUs: formValues.playedWithUs || undefined,
      isAcademy: formValues.isAcademy === "true",
      clubNegotiation: clubStage,
      playerNegotiation: playerStage,
      timing: (formValues.timing as TransferTiming) || "Imediata",
      agreementDate:
        formValues.dateArrival || formValues.dataArrival || undefined,
      formState: {
        formValues: {
          ...formValues,
          buyValue:
            formValues.buyValue ||
            formValues.transferFee ||
            (buyValueNum > 0 ? formatTransferValue(buyValueNum) : ""),
          transferFee:
            formValues.transferFee ||
            formValues.buyValue ||
            (buyValueNum > 0 ? formatTransferValue(buyValueNum) : ""),
        },
        booleanValues: Object.fromEntries(
          Object.entries(booleanValues).filter(([k]) => k !== "isSigning"),
        ),
      },
    };
  };

  const handleProceedToStep2 = (): boolean => {
    const playerName = (formValues.playerName || formValues.name || "").trim();
    const fromClubName = (formValues.fromClub || "").trim();

    if (!playerName) {
      toast.warning("Por favor, informe o nome do jogador.");
      return false;
    }

    if (!fromClubName) {
      toast.warning("Por favor, selecione ou informe o clube de origem.");
      return false;
    }

    if (!formValues.position || !formValues.sector) {
      toast.warning("Por favor, informe a posição e o setor do atleta.");
      return false;
    }

    if (transferType === "Compra") {
      if (!formValues.buyValue && !formValues.playerValue) {
        toast.warning(
          "Por favor, informe o valor da compra ou de mercado do jogador.",
        );
        return false;
      }
    } else {
      if (!formValues.loanDuration || !formValues.loanDuration.trim()) {
        toast.warning("Por favor, selecione a duração do empréstimo.");
        return false;
      }
      if (!formValues.salary || !formValues.salary.trim()) {
        toast.warning("Por favor, informe o salário semanal.");
        return false;
      }
      if (!formValues.wagePercentage || !formValues.wagePercentage.trim()) {
        toast.warning(
          "Por favor, informe a porcentagem do salário paga pelo clube.",
        );
        return false;
      }
      if (booleanValues.hasBuyOption) {
        if (!formValues.buyOption || !formValues.buyOption.trim()) {
          toast.warning(
            "Por favor, informe a taxa de transferência da opção de compra.",
          );
          return false;
        }
      }
    }

    if (setClubNegotiationStatus) {
      setClubNegotiationStatus("aceita");
    }

    const draftData: PendingTransferDraft = {
      careerId: career.id,
      seasonId: season.id,
      timestamp: Date.now(),
      step: 2,
      formValues,
      booleanValues: Object.fromEntries(
        Object.entries(booleanValues).filter(([k]) => k !== "isSigning"),
      ),
      bonuses,
      playerName,
      playerNation: formValues.nation || career.nation,
      fromClub: fromClubName,
      playerValue: formValues.playerValue,
      transferFee: formValues.buyValue,
      position: formValues.position,
    };

    TransferDraftService.saveDraft(career.id, season.id, draftData);

    if (setCurrentStep) {
      setCurrentStep(2);
    }
    return true;
  };

  const handleSaveProposal = async (
    stage: 1 | 2 = 1,
    asAccepted = false,
  ): Promise<TransferProposal | null> => {
    const playerName = (formValues.playerName || formValues.name || "").trim();
    const fromClubName = (formValues.fromClub || "").trim();

    if (!playerName) {
      toast.warning("Por favor, informe o nome do jogador.");
      return null;
    }

    if (!fromClubName) {
      toast.warning("Por favor, selecione ou informe o clube de origem.");
      return null;
    }

    if (!formValues.position || !formValues.sector) {
      toast.warning("Por favor, informe a posição e o setor do atleta.");
      return null;
    }

    const timing = formValues.timing || "Imediata";
    if (!timing) {
      toast.warning("Por favor, selecione o momento da transferência.");
      return null;
    }

    if (transferType === "Empréstimo") {
      if (!formValues.loanDuration || !formValues.loanDuration.trim()) {
        toast.warning("Por favor, selecione a duração do empréstimo.");
        return null;
      }
      if (!formValues.salary || !formValues.salary.trim()) {
        toast.warning("Por favor, informe o salário semanal.");
        return null;
      }
      if (!formValues.wagePercentage || !formValues.wagePercentage.trim()) {
        toast.warning(
          "Por favor, informe a porcentagem do salário paga pelo clube.",
        );
        return null;
      }
      if (booleanValues.hasBuyOption) {
        if (!formValues.buyOption || !formValues.buyOption.trim()) {
          toast.warning(
            "Por favor, informe a taxa de transferência da opção de compra.",
          );
          return null;
        }
      }
    }

    setIsLoading(true);
    try {
      const payload = buildProposalData(stage, asAccepted);
      let saved: TransferProposal;

      if (proposalId) {
        await ServiceProposals.updateProposal(
          career.id,
          season.id,
          proposalId,
          payload,
        );
        saved = { ...payload, id: proposalId };
      } else {
        saved = await ServiceProposals.createProposal(
          career.id,
          season.id,
          payload,
        );
      }

      TransferDraftService.clearDraft(career.id, season.id);
      toast.success(
        proposalId
          ? "Proposta atualizada com sucesso!"
          : "Proposta enviada com sucesso!",
      );
      onClose();
      if (onOpenScreen) {
        onOpenScreen({
          key: "manageClauses",
          initialTab: "arrivals",
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

  const handleReviewAndFinalize = async (): Promise<void> => {
    const playerName = (formValues.playerName || formValues.name || "").trim();
    const fromClubName = (formValues.fromClub || "").trim();

    if (!playerName) {
      toast.warning("Por favor, informe o nome do jogador.");
      return;
    }

    if (!fromClubName) {
      toast.warning("Por favor, selecione ou informe o clube de origem.");
      return;
    }

    const rawSalary = parseValue(formValues.salary || "0");
    if (!formValues.salary || rawSalary <= 0) {
      toast.warning("Por favor, informe o salário semanal do atleta.");
      return;
    }

    if (transferType === "Compra") {
      const contractUntilRaw = (formValues.contractUntil || "").trim();
      if (!contractUntilRaw) {
        toast.warning("Por favor, informe a data de término do contrato.");
        return;
      }
    } else {
      if (!formValues.loanDuration || !formValues.loanDuration.trim()) {
        toast.warning("Por favor, selecione a duração do empréstimo.");
        return;
      }
      if (!formValues.wagePercentage || !formValues.wagePercentage.trim()) {
        toast.warning(
          "Por favor, informe a porcentagem do salário paga pelo clube.",
        );
        return;
      }
      if (booleanValues.hasBuyOption) {
        if (!formValues.buyOption || !formValues.buyOption.trim()) {
          toast.warning(
            "Por favor, informe a taxa de transferência da opção de compra.",
          );
          return;
        }
      }
    }

    if (setClubNegotiationStatus) setClubNegotiationStatus("aceita");
    if (setPlayerNegotiationStatus) setPlayerNegotiationStatus("aceita");

    const payload = buildProposalData(2, true);
    if (payload.clubNegotiation) payload.clubNegotiation.status = "aceita";
    if (payload.playerNegotiation) payload.playerNegotiation.status = "aceita";
    payload.overallStatus = "aguardando_confirmacao";

    const proposalObj: TransferProposal = {
      ...payload,
      id:
        proposalId ||
        `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    if (onOpenConfirmation) {
      onOpenConfirmation(proposalObj);
    }
  };

  const executeFinalTransfer = async (
    confirmedProposal?: TransferProposal,
  ): Promise<void> => {
    if (editTransfer) {
      const isCompra = transferType === "Compra";
      const playerName = (formValues.playerName || formValues.name || editTransfer.player.name || "").trim();
      const fromClubName = (formValues.fromClub || "").trim();

      if (!playerName) {
        toast.warning("Por favor, informe o nome do jogador.");
        return;
      }
      if (!fromClubName) {
        toast.warning("Por favor, selecione ou informe o clube de origem.");
        return;
      }

      if (!isCompra) {
        if (!formValues.loanDuration) {
          toast.warning("Por favor, selecione a duração do empréstimo.");
          return;
        }
        const wagePct = Number(formValues.wagePercentage);
        if (
          formValues.wagePercentage === undefined ||
          formValues.wagePercentage === "" ||
          isNaN(wagePct) ||
          wagePct < 0 ||
          wagePct > 100
        ) {
          toast.warning("Por favor, informe a porcentagem de salário paga (0 a 100).");
          return;
        }
        if (!formValues.salary || formValues.salary.trim() === "") {
          toast.warning("Por favor, informe o salário semanal.");
          return;
        }
        if (booleanValues.hasBuyOption) {
          const buyOptRaw = (formValues.buyOption || "").trim();
          if (!buyOptRaw) {
            toast.warning("Por favor, informe a taxa de transferência da opção de compra.");
            return;
          }
          if (parseValue(buyOptRaw) <= 0) {
            toast.warning("Por favor, informe um valor válido para a taxa de transferência.");
            return;
          }
        }
      }

      setIsLoading(true);
      try {
        const rawSalary = parseValue(formValues.salary || "0");
        const wagePct = Number(formValues.wagePercentage) || 100;
        const duration = isCompra
          ? (Number(formValues.contractTime) || 1)
          : (parseLoanDuration(formValues.loanDuration || "1") || 1);

        const buyOptRaw = (formValues.buyOption || "").trim();
        const buyOptNum = buyOptRaw ? parseValue(buyOptRaw) : undefined;
        const sellOnRaw = (formValues.sellOnPercentage || "").trim();
        const parsedSellOn = sellOnRaw ? Number(sellOnRaw.replace("%", "").trim()) : undefined;

        const loanTerms = !isCompra ? {
          durationYears: duration,
          ourWagePercentage: wagePct,
          theirWagePercentage: 100 - wagePct,
          hasBuyOption: Boolean(booleanValues.hasBuyOption),
          buyOptionFee: booleanValues.hasBuyOption && buyOptNum ? buyOptNum : undefined,
          ...(booleanValues.hasBuyOption && parsedSellOn !== undefined ? { sellOnPercentage: parsedSellOn } : {}),
          partnerClub: fromClubName,
        } : undefined;

        const dateStr = editTransfer.contract.dataArrival
          ? (typeof editTransfer.contract.dataArrival === "string"
              ? editTransfer.contract.dataArrival
              : brasilDatePlaceholderShort(new Date(editTransfer.contract.dataArrival)))
          : "01/07";

        await ServicePlayers.editTransferInSeason({
          careerId: career.id,
          seasonId: season.id,
          playerId: editTransfer.player.id,
          contractIndex: editTransfer.contractIndex,
          direction: "arrivals",
          transferType: isCompra ? "Compra" : "Empréstimo",
          clubName: fromClubName,
          transferValue: isCompra ? (formValues.buyValue || formValues.transferFee || "0") : "0",
          date: dateStr,
          timing: formValues.timing || editTransfer.contract.timing,
          loanDuration: formValues.loanDuration,
          wagePercentage: formValues.wagePercentage,
          buyOptionValue: !isCompra && booleanValues.hasBuyOption && buyOptNum ? String(buyOptNum) : undefined,
          buyOption: formValues.buyOption,
          salary: formValues.salary,
          contractTime: String(duration),
          loanTerms,
        });

        const isEditingExercisedLoan =
          !isCompra &&
          (Boolean(editTransfer.contract?.loanTerms?.buyOptionExercised) ||
            (Array.isArray(editTransfer.player.contract) &&
              editTransfer.player.contract.some((c) => Boolean(c.fromLoanBuyOption))));

        const updatedPlayerFields: Partial<Players> = {
          name: playerName,
          nation: formValues.nation || editTransfer.player.nation,
          sector: formValues.sector || editTransfer.player.sector,
          position: formValues.position || editTransfer.player.position,
          captain: Boolean(booleanValues.isCaptain),
          ...(formValues.overall ? { overall: Number(formValues.overall) } : {}),
          ...(isEditingExercisedLoan && buyOptNum
            ? { playerValue: buyOptNum }
            : !isEditingExercisedLoan
              ? {
                  ...(formValues.playerValue ? { playerValue: parseValue(formValues.playerValue) } : {}),
                  salary: !isCompra ? rawSalary * (wagePct / 100) : rawSalary,
                }
              : {}),
        };

        await ServicePlayers.editPlayerInSeason(
          career.id,
          season.id,
          editTransfer.player.id,
          updatedPlayerFields,
        );

        const parsedArrivalDate = editTransfer.contract.dataArrival
          ? new Date(editTransfer.contract.dataArrival)
          : new Date();

        const updatedCareer = applyEditToCareer(
          career,
          season.id,
          editTransfer.player.id,
          editTransfer.contractIndex,
          "arrivals",
          {
            clubName: fromClubName,
            transferValue: isCompra ? parseValue(formValues.buyValue || "0") : 0,
            transferType: isCompra ? "Compra" : "Empréstimo",
            date: parsedArrivalDate,
            timing: formValues.timing as TransferTiming,
            loanDuration: !isCompra ? duration : undefined,
            wagePercentage: !isCompra ? wagePct : undefined,
            buyOptionValue: !isCompra && booleanValues.hasBuyOption && buyOptNum ? buyOptNum : undefined,
            buyOption: formValues.buyOption,
            salary: rawSalary,
            contractTime: duration,
            loanTerms,
          },
        );

        const updatedSeason = updatedCareer.clubData.find((s) => s.id === season.id);
        const playerInSeason = updatedSeason?.players.find((p) => p.id === editTransfer.player.id);
        if (playerInSeason) {
          Object.assign(playerInSeason, updatedPlayerFields);
        }

        NavigationSessionStore.saveClickAnchor("squad", {
          scrollY: 0,
          anchorSelector: `#player-row-${editTransfer.player.id}`,
          updatedAt: Date.now(),
        });

        commitEditedCareerState(career, season, editTransfer.player, updatedCareer, onClose);
        toast.success(isCompra ? "Transferência atualizada com sucesso!" : "Empréstimo atualizado com sucesso!");
        return;
      } catch (err: unknown) {
        console.error("Erro ao atualizar transferência:", err);
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar transferência.");
        return;
      } finally {
        setIsLoading(false);
      }
    }

    const isCompra = transferType === "Compra";
    const playerName = (formValues.playerName || formValues.name || "").trim();
    const fromClubName = (formValues.fromClub || "").trim();

    if (!playerName) {
      toast.warning("Por favor, informe o nome do jogador.");
      return;
    }

    if (!fromClubName) {
      toast.warning("Por favor, selecione ou informe o clube de origem.");
      return;
    }

    const rawSalary = parseValue(formValues.salary || "0");
    if (!formValues.salary || rawSalary <= 0) {
      toast.warning("Por favor, informe o salário semanal do atleta.");
      return;
    }

    let duration: number;
    if (isCompra) {
      const contractUntilRaw = (formValues.contractUntil || "").trim();
      if (!contractUntilRaw) {
        toast.warning("Por favor, informe a data de término do contrato.");
        return;
      }
      duration = calculateContractYears(
        contractUntilRaw,
        career.createdAt,
        season.seasonNumber,
        career.nation,
      );
    } else {
      duration = parseLoanDuration(formValues.loanDuration || "1") || 1;
    }

    const seasonRange = getSeasonDateRange(
      season.seasonNumber,
      new Date(career.createdAt),
      career.nation,
    );

    let parsedArrivalDate: Date = new Date();
    if (formValues.dateArrival || formValues.dataArrival) {
      const dateStr = formValues.dateArrival || formValues.dataArrival;
      const parsed =
        dateStr.includes("/") && dateStr.split("/").length === 3
          ? parseFullBrasilDate(dateStr)
          : parseBrasilDate(
              dateStr,
              new Date(career.createdAt).getFullYear() +
                season.seasonNumber -
                1,
            );
      if (parsed && !isNaN(parsed.getTime())) {
        parsedArrivalDate = parsed;
      }
    } else if (seasonRange) {
      parsedArrivalDate = seasonRange.startDate;
    }

    setIsLoading(true);
    try {
      let contractDetails: ContractDetails | undefined;
      let contractItem: Contract;

      const signingBonusVal = formValues.signingBonus
        ? parseValue(formValues.signingBonus)
        : undefined;
      const agentFeeVal = formValues.agentFee
        ? parseValue(formValues.agentFee)
        : undefined;

      if (isCompra) {
        const releaseClauseVal = formValues.releaseClause
          ? parseValue(formValues.releaseClause)
          : undefined;

        const isWageAdjActive =
          formValues.wageAdjustmentType === "Aumentar" ||
          formValues.wageAdjustmentType === "Diminuir";

        const wageAdjustment = isWageAdjActive
          ? {
              enabled: true,
              direction: formValues.wageAdjustmentType as
                | "Aumentar"
                | "Diminuir",
              percentage:
                parseInt(
                  (formValues.wageAdjustmentPercentage || "5").replace("%", ""),
                  10,
                ) || 5,
              targetObjective: formValues.wageAdjustmentObjective || "",
              status: "pending" as const,
            }
          : undefined;

        contractDetails = {
          weeklyWage: rawSalary,
          durationYears: duration,
          squadRole: (formValues.squadRole as SquadRole) || "Rodízio",
          signingBonus: signingBonusVal,
          agentFee: agentFeeVal,
          releaseClause: releaseClauseVal,
          wageAdjustment,
          performanceBonuses: bonuses.filter(
            (b) =>
              (!b.partnerClub || (b as { bonusOrigin?: string }).bonusOrigin === "player") &&
              (b.category === "performance" || b.bonusCategory === "Desempenho"),
          ),
        };

        const buyValueNum = parseValue(
          formValues.buyValue || formValues.playerValue || "0",
        );

        let installments;
        if (booleanValues.hasInstallments && buyValueNum > 0) {
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
            totalValue: buyValueNum,
            percentage: validPct,
            totalInstallments: years,
            currentSeasonNumber: season.seasonNumber,
            direction: "payable",
            partnerClub: fromClubName,
          });
        }

        const sellOnPct = Number(formValues.sellOnPercentage);
        const buybackFee =
          formValues.buybackClauseFee || formValues.buybackValue
            ? parseValue(formValues.buybackClauseFee || formValues.buybackValue)
            : undefined;

        const isFromBuyOption = Boolean(
          confirmedProposal?.originLoanBuyOption ||
            (proposalId &&
              season.players?.some(
                (p) =>
                  (p.id === formValues.globalId || p.name.trim().toLowerCase() === playerName.toLowerCase()) &&
                  p.contract?.some(
                    (c) =>
                      c.isLoan &&
                      (c.loanTerms?.buyOptionExercised ||
                        c.loanTerms?.hasBuyOption ||
                        Boolean(c.buyOptionValue)),
                  ),
              )),
        );

        contractItem = {
          buyValue: buyValueNum,
          sellValue: 0,
          fromClub: fromClubName,
          leftClub: "",
          dataArrival: parsedArrivalDate,
          timing: (formValues.timing as TransferTiming) || "Imediata",
          contractDetails,
          contractUntil: formValues.contractUntil || undefined,
          salary: rawSalary,
          contractTime: duration,
          ...(isFromBuyOption ? { fromLoanBuyOption: true } : {}),
          ...(signingBonusVal ? { signingBonus: formValues.signingBonus } : {}),
          ...(bonuses.length > 0 ? { bonuses } : {}),
          ...(installments ? { installments } : {}),
          ...(sellOnPct > 0 || buybackFee
            ? {
                transferClauses: {
                  ...(sellOnPct > 0 ? { sellOnPercentage: sellOnPct } : {}),
                  ...(buybackFee ? { buybackValue: buybackFee } : {}),
                },
              }
            : {}),
        };
      } else {
        const wagePctNum = Number(formValues.wagePercentage) || 100;
        contractDetails = {
          weeklyWage: rawSalary,
          durationYears: duration,
          squadRole: (formValues.squadRole as SquadRole) || "Rodízio",
          signingBonus: signingBonusVal,
        };

        contractItem = {
          buyValue: 0,
          sellValue: 0,
          fromClub: fromClubName,
          leftClub: "",
          dataArrival: parsedArrivalDate,
          timing: (formValues.timing as TransferTiming) || "Imediata",
          isLoan: true,
          loanDuration: duration,
          wagePercentage: wagePctNum,
          contractDetails,
          salary: rawSalary * (wagePctNum / 100),
          fullSalary: rawSalary,
          contractTime: duration,
          ...(booleanValues.hasBuyOption &&
          formValues.buyOption &&
          parseValue(formValues.buyOption) > 0
            ? {
                loanTerms: {
                  durationYears: duration,
                  ourWagePercentage: wagePctNum,
                  theirWagePercentage: 100 - wagePctNum,
                  hasBuyOption: true,
                  buyOptionFee: parseValue(formValues.buyOption),
                  partnerClub: fromClubName,
                },
              }
            : {}),
        };
      }

      const calculatedAge = calculatePlayerAge(
        formValues.birthDate || "",
        career.createdAt,
        season.seasonNumber,
        career.nation,
        season.matches,
      );

      const playerData: Partial<Players> = {
        ...(booleanValues.isKnownPlayer && formValues.globalId
          ? { id: formValues.globalId }
          : {}),
        name: playerName,
        overall: Number(formValues.overall) || 75,
        potential:
          Number(formValues.potential) || Number(formValues.overall) || 75,
        sector: formValues.sector,
        position: formValues.position,
        age: calculatedAge > 0 ? calculatedAge : Number(formValues.age) || 22,
        birthDate: formValues.birthDate || undefined,
        nation: formValues.nation || career.nation || "BRA",
        shirtNumber: formValues.shirtNumber || "",
        height: formValues.height || undefined,
        weight: formValues.weight || undefined,
        playerValue: parseValue(
          formValues.playerValue ||
            formValues.buyValue ||
            formValues.buyOption ||
            "0",
        ),
        salary: isCompra
          ? rawSalary
          : rawSalary * ((Number(formValues.wagePercentage) || 100) / 100),
        contractTime: duration,
        contractUntil: isCompra
          ? formValues.contractUntil || undefined
          : undefined,
        captain: Boolean(booleanValues.isCaptain || booleanValues.captain),
        buy: isCompra && !isNextSeasonTiming(formValues.timing),
        incomingLoan: !isCompra,
        squadRole: (formValues.squadRole as SquadRole) || "Rodízio",
        contractDetails,
        playedWithUs: booleanValues.isKnownPlayer
          ? formValues.playedWithUs || undefined
          : undefined,
        isAcademy: formValues.isAcademy === "true",
      };

      const swapPlayerCandidate =
        confirmedProposal?.clubNegotiation?.swapPlayer ||
        (booleanValues.hasPlayerSwap || formValues.swapPlayerName?.trim()
          ? {
              playerId: season.players?.find(
                (p) =>
                  p.name.trim().toLowerCase() ===
                  formValues.swapPlayerName?.trim().toLowerCase(),
              )?.id,
              playerName: formValues.swapPlayerName?.trim() || "",
              playerValue: parseValue(formValues.swapPlayerValue || "0"),
              estimatedValue: parseValue(formValues.swapPlayerValue || "0"),
              position: formValues.swapPlayerPosition || "",
              sector: formValues.swapPlayerSector || "",
            }
          : undefined);

      await PlayersContractService.signPlayerWithTerms({
        careerId: career.id,
        seasonId: season.id,
        player: playerData,
        contract: contractItem,
        swapPlayer: swapPlayerCandidate,
      });

      if (
        prefill?.sourcePlayerId &&
        prefill.sourceContractIndex !== undefined &&
        (prefill.mode === "buyback" || prefill.mode === "firstRefusal")
      ) {
        await PlayersContractService.consumeExitSpecialAgreement(
          career.id,
          prefill.sourceSeasonId || season.id,
          prefill.sourcePlayerId,
          prefill.sourceContractIndex,
          prefill.mode,
        );
      }

      const targetPropId = confirmedProposal?.id || proposalId;
      if (targetPropId) {
        try {
          await ServiceProposals.updateProposal(
            career.id,
            season.id,
            targetPropId,
            {
              overallStatus: "concluida",
              finalizedAt: Date.now(),
            },
          );
        } catch (updateErr) {
          console.warn(
            "Não foi possível atualizar status para concluída:",
            updateErr,
          );
        }
      }

      TransferDraftService.clearDraft(career.id, season.id);
      toast.success(
        isCompra
          ? "Transferência concluída com sucesso!"
          : "Empréstimo registrado com sucesso!",
      );
      const targetId = (playerData as Players)?.id;
      if (targetId) {
        NavigationSessionStore.saveClickAnchor("squad", {
          scrollY: 0,
          anchorSelector: `#player-row-${targetId}`,
          updatedAt: Date.now(),
        });
      }
      onClose({
        type: "ADD_PLAYER",
        player: playerData as Players,
      });
    } catch (error) {
      console.error("Erro ao adicionar transferência: ", error);
      toast.error(
        error instanceof Error
          ? error.message
          : isCompra
            ? "Erro ao concluir transferência."
            : "Erro ao registrar empréstimo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertTransfer = async () => {
    if (!editTransfer) return;
    setIsLoading(true);
    const isLoan = Boolean(editTransfer.contract.isLoan);
    try {
      await ServicePlayers.revertTransferInSeason({
        careerId: career.id,
        seasonId: season.id,
        playerId: editTransfer.player.id,
        contractIndex: editTransfer.contractIndex,
        direction: "arrivals",
      });

      const updatedCareer = applyRevertToCareer(
        career,
        season.id,
        editTransfer.player.id,
        editTransfer.contractIndex,
        "arrivals",
      );

      toast.success(
        isLoan
          ? "Empréstimo revertido com sucesso!"
          : "Transferência revertida com sucesso!",
      );
      commitEditedCareerState(
        career,
        season,
        editTransfer.player,
        updatedCareer,
        onClose,
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : isLoan
            ? "Erro ao reverter o empréstimo."
            : "Erro ao reverter a transferência.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleProceedToStep2,
    handleSaveProposal,
    handleReviewAndFinalize,
    handleOfficialSaveTransfer: executeFinalTransfer,
    handleSaveTransfer: executeFinalTransfer,
    executeFinalTransfer,
    handleRevertTransfer,
  };
};

export default useAddTransferPlayerActions;
