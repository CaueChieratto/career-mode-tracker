import { useState, useCallback } from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { TransferBonus } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { WageAdjustmentClause } from "../../../../../../../../../common/interfaces/playersInfo/contractClauses";
import { PlayersContractService } from "../../../../../../../../../common/services/ServicePlayers/PlayersContractService";
import { parseValue } from "../../../../../../../../../common/utils/FormatValue";
import {
  calculateContractYears,
  calculateContractUntilFromYears,
  getPlayerOriginalContractYears,
} from "../../../../../../../../../common/utils/calculateContractYears";
import { RenewalFormValues } from "../../types";
import { OptimisticUpdateData } from "../../../../../../../helpers/updateSectionCareer";
import { SectionScreen } from "../../../../../../../config/screens";
import { toast } from "../../../../../../../../../common/services/ToastService";
import { NavigationSessionStore } from "../../../../../../../../../common/services/NavigationSessionStore";
import { ServiceProposals } from "../../../../../../../../../common/services/ServiceProposals";
import { calculateOverallProposalStatus } from "../../../../../../../../../common/helpers/proposals/proposalStatusHelper";
import {
  NegotiationStageStatus,
  PlayerNegotiationStage,
  TransferProposal,
} from "../../../../../../../../../common/interfaces/proposals/transferProposal";

export interface UseRenewPlayerActionsParams {
  career: Career;
  season: ClubData;
  player?: Players;
  formValues: RenewalFormValues;
  bonuses: TransferBonus[];
  draftKey: string;
  proposalId?: string;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  playerNegotiationStatus: NegotiationStageStatus;
  setPlayerNegotiationStatus: React.Dispatch<
    React.SetStateAction<NegotiationStageStatus>
  >;
}

export interface UseRenewPlayerActionsResult {
  isSaving: boolean;
  isConfirmationOpen: boolean;
  setIsConfirmationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  confirmationProposal: TransferProposal | null;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  handleSaveProposal: (asAccepted?: boolean) => Promise<TransferProposal | null>;
  handleReviewAndFinalize: () => Promise<void>;
  executeFinalRenewal: (confirmedProposal: TransferProposal) => Promise<void>;
  handleClose: () => void;
}

export const useRenewPlayerActions = ({
  career,
  season,
  player,
  formValues,
  bonuses,
  draftKey,
  proposalId,
  onClose,
  onOpenScreen,
  playerNegotiationStatus,
  setPlayerNegotiationStatus,
}: UseRenewPlayerActionsParams): UseRenewPlayerActionsResult => {
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationProposal, setConfirmationProposal] =
    useState<TransferProposal | null>(null);

  const originalYears = getPlayerOriginalContractYears(
    player,
    career.createdAt,
    season.seasonNumber,
    career.nation,
  );

  const handleClose = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(draftKey);
      }
    } catch (err) {
      void err;
    }
    onClose();
  }, [draftKey, onClose]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!player) return;

      const hasSalary = Boolean(formValues.salary && formValues.salary.trim());
      const hasDuration = Boolean(
        (formValues.contractTime && formValues.contractTime.trim()) ||
          (formValues.contractUntil && formValues.contractUntil.trim()),
      );

      if (!hasSalary || !hasDuration) {
        toast.warning(
          "Por favor, preencha as informações do contrato para renovar.",
        );
        return;
      }

      const isWageAdjActive =
        formValues.wageAdjustmentType === "Aumentar" ||
        formValues.wageAdjustmentType === "Diminuir";

      if (isWageAdjActive && !formValues.wageAdjustmentObjective?.trim()) {
        toast.warning(
          "Por favor, selecione um critério para o ajuste automático de salário.",
        );
        return;
      }

      setIsSaving(true);
      try {
        const pctNumber =
          parseInt(
            (formValues.wageAdjustmentPercentage || "5").replace("%", ""),
            10,
          ) || 5;

        const wageAdjustmentClause: WageAdjustmentClause | undefined =
          isWageAdjActive
            ? {
                enabled: true,
                direction: formValues.wageAdjustmentType as
                  | "Aumentar"
                  | "Diminuir",
                percentage: pctNumber,
                targetObjective: formValues.wageAdjustmentObjective || "",
                targetLeague: formValues.wageAdjustmentLeague || undefined,
                status: "pending",
              }
            : undefined;

        let calculatedYears: number;
        let contractUntilDate = formValues.contractUntil;

        const hasExtension =
          formValues.contractTime !== undefined &&
          formValues.contractTime.trim() !== "" &&
          !isNaN(parseInt(formValues.contractTime, 10));

        const extensionYears = hasExtension
          ? parseInt(formValues.contractTime!, 10)
          : 0;

        if (hasExtension && extensionYears >= 0) {
          calculatedYears = Math.max(1, originalYears + extensionYears);
          contractUntilDate = calculateContractUntilFromYears(
            calculatedYears,
            career.createdAt,
            season.seasonNumber,
            career.nation,
          );
        } else if (formValues.contractUntil) {
          calculatedYears = calculateContractYears(
            formValues.contractUntil,
            career.createdAt,
            season.seasonNumber,
            career.nation,
          );
        } else {
          calculatedYears = originalYears || player.contractTime || 1;
        }

        const updatedPlayer = await PlayersContractService.createPlayerRenewal({
          careerId: career.id,
          seasonId: season.id,
          playerId: player.id,
          salary: formValues.salary,
          contractUntil: contractUntilDate,
          contractTime: calculatedYears,
          signingBonus: formValues.signingBonus,
          releaseClause: formValues.releaseClause,
          wageAdjustment: wageAdjustmentClause,
          bonuses,
        });

        try {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem(draftKey);
          }
        } catch (err) {
          void err;
        }

        // Atualização otimista
        toast.success("Contrato renovado com sucesso!");
        if (player?.id) {
          NavigationSessionStore.saveClickAnchor("squad", {
            scrollY: 0,
            anchorSelector: `#player-row-${player.id}`,
            updatedAt: Date.now(),
          });
        }
        onClose({
          type: "UPDATE_PLAYER",
          player: updatedPlayer,
        });
      } catch (err) {
        console.error("Erro ao renovar contrato:", err);
        toast.error("Ocorreu um erro ao salvar a renovação. Tente novamente.");
      } finally {
        setIsSaving(false);
      }
    },
    [career, season, player, formValues, bonuses, draftKey, onClose, originalYears],
  );

  const buildProposalData = useCallback(
    (asAccepted = false): Omit<TransferProposal, "id"> | null => {
      if (!player) return null;

      const isWageAdjActive =
        formValues.wageAdjustmentType === "Aumentar" ||
        formValues.wageAdjustmentType === "Diminuir";

      const pctNumber =
        parseInt(
          (formValues.wageAdjustmentPercentage || "5").replace("%", ""),
          10,
        ) || 5;

      const wageAdjustmentClause: WageAdjustmentClause | undefined =
        isWageAdjActive
          ? {
              enabled: true,
              direction: formValues.wageAdjustmentType as
                | "Aumentar"
                | "Diminuir",
              percentage: pctNumber,
              targetObjective: formValues.wageAdjustmentObjective || "",
              targetLeague: formValues.wageAdjustmentLeague || undefined,
              status: "pending",
            }
          : undefined;

      let calculatedYears: number;
      let contractUntilDate = formValues.contractUntil;

      const hasExtension =
        formValues.contractTime !== undefined &&
        formValues.contractTime.trim() !== "" &&
        !isNaN(parseInt(formValues.contractTime, 10));

      const extensionYears = hasExtension
        ? parseInt(formValues.contractTime!, 10)
        : 0;

      if (hasExtension && extensionYears >= 0) {
        calculatedYears = Math.max(1, originalYears + extensionYears);
        contractUntilDate = calculateContractUntilFromYears(
          calculatedYears,
          career.createdAt,
          season.seasonNumber,
          career.nation,
        );
      } else if (formValues.contractUntil) {
        calculatedYears = calculateContractYears(
          formValues.contractUntil,
          career.createdAt,
          season.seasonNumber,
          career.nation,
        );
      } else {
        calculatedYears = originalYears || player.contractTime || 1;
      }

      const playerStage: PlayerNegotiationStage = {
        status: asAccepted ? "aceita" : playerNegotiationStatus,
        weeklyWage: parseValue(formValues.salary || "0"),
        durationYears: calculatedYears,
        contractUntil: contractUntilDate,
        squadRole:
          player.squadRole || player.contractDetails?.squadRole || "Rodízio",
        signingBonus: formValues.signingBonus
          ? parseValue(formValues.signingBonus)
          : undefined,
        releaseClause: formValues.releaseClause
          ? parseValue(formValues.releaseClause)
          : undefined,
        wageAdjustment: wageAdjustmentClause,
        performanceBonuses: bonuses.length > 0 ? bonuses : undefined,
        // STRICT VETO: agentFee is forbidden in renewals!
        agentFee: undefined,
      };

      const overallStatus = calculateOverallProposalStatus({
        type: "renovacao",
        clubNegotiation: undefined,
        playerNegotiation: playerStage,
      });

      return {
        careerId: career.id,
        seasonId: season.id,
        type: "renovacao",
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
        clubNegotiation: undefined,
        playerNegotiation: playerStage,
        timing: "Imediata",
        formState: {
          formValues: {
            ...formValues,
            contractUntil: contractUntilDate,
          } as Record<string, string>,
          booleanValues: {},
        },
      };
    },
    [
      player,
      formValues,
      bonuses,
      playerNegotiationStatus,
      career.id,
      career.createdAt,
      career.nation,
      season.id,
      season.seasonNumber,
      originalYears,
    ],
  );

  const handleSaveProposal = useCallback(
    async (asAccepted = false): Promise<TransferProposal | null> => {
      if (!player) return null;

      const hasSalary = Boolean(formValues.salary && formValues.salary.trim());
      const hasDuration = Boolean(
        (formValues.contractTime && formValues.contractTime.trim()) ||
          (formValues.contractUntil && formValues.contractUntil.trim()),
      );

      if (!hasSalary || !hasDuration) {
        toast.warning(
          "Por favor, preencha salário e duração para salvar a proposta de renovação.",
        );
        return null;
      }

      const isWageAdjActive =
        formValues.wageAdjustmentType === "Aumentar" ||
        formValues.wageAdjustmentType === "Diminuir";

      if (isWageAdjActive && !formValues.wageAdjustmentObjective?.trim()) {
        toast.warning(
          "Por favor, selecione um critério para o ajuste automático de salário.",
        );
        return null;
      }

      setIsSaving(true);
      try {
        const payload = buildProposalData(asAccepted);
        if (!payload) return null;

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

        toast.success(
          proposalId
            ? "Proposta atualizada com sucesso!"
            : "Proposta de renovação salva com sucesso!",
        );
        handleClose();
        if (onOpenScreen) {
          onOpenScreen({
            key: "manageClauses",
            initialTab: "renewals",
            selectedPlayerName: saved.playerName,
            selectedProposalId: saved.id,
          });
        }
        return saved;
      } catch (err) {
        console.error("Erro ao salvar proposta de renovação:", err);
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao salvar proposta de renovação.",
        );
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [
      player,
      formValues,
      buildProposalData,
      proposalId,
      career.id,
      season.id,
      handleClose,
      onOpenScreen,
    ],
  );

  const handleReviewAndFinalize = useCallback(async () => {
    if (!player) return;

    const hasSalary = Boolean(formValues.salary && formValues.salary.trim());
    const hasDuration = Boolean(
      (formValues.contractTime && formValues.contractTime.trim()) ||
        (formValues.contractUntil && formValues.contractUntil.trim()),
    );

    if (!hasSalary || !hasDuration) {
      toast.warning(
        "Por favor, preencha as informações do contrato para renovar.",
      );
      return;
    }

    const isWageAdjActive =
      formValues.wageAdjustmentType === "Aumentar" ||
      formValues.wageAdjustmentType === "Diminuir";

    if (isWageAdjActive && !formValues.wageAdjustmentObjective?.trim()) {
      toast.warning(
        "Por favor, selecione um critério para o ajuste automático de salário.",
      );
      return;
    }

    setPlayerNegotiationStatus("aceita");
    const payload = buildProposalData(true);
    if (!payload) return;

    const proposalObj: TransferProposal = {
      ...payload,
      id:
        proposalId ||
        `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    setConfirmationProposal(proposalObj);
    setIsConfirmationOpen(true);
  }, [
    player,
    formValues,
    buildProposalData,
    proposalId,
    setPlayerNegotiationStatus,
  ]);

  const executeFinalRenewal = useCallback(
    async (_confirmedProposal: TransferProposal) => {
      void _confirmedProposal;
      setIsSaving(true);
      try {
        await handleSubmit();
        if (proposalId) {
          try {
            await ServiceProposals.updateProposalStatus(
              career.id,
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
      } finally {
        setIsSaving(false);
      }
    },
    [handleSubmit, proposalId, career.id, season.id],
  );

  return {
    isSaving,
    isConfirmationOpen,
    setIsConfirmationOpen,
    confirmationProposal,
    handleSubmit,
    handleSaveProposal,
    handleReviewAndFinalize,
    executeFinalRenewal,
    handleClose,
  };
};

export default useRenewPlayerActions;
