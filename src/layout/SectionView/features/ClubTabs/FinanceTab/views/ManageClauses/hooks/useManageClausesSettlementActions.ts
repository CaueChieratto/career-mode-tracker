import React, { useState } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { TransferItem, ActiveInlineState } from "../types";
import {
  TransferBonus,
  applyInstallmentSettlement,
  revertInstallmentSettlement,
} from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { PlayersContractService } from "../../../../../../../../common/services/ServicePlayers/PlayersContractService";
import { parseValue, formatCompactNumber, formatTransferValue } from "../../../../../../../../common/utils/FormatValue";
import { SectionScreen } from "../../../../../../config/screens";
import { isValidShortDate } from "../helpers/manageClausesFormatters";

import { ConfirmToastOptions } from "../../../../../../../../common/services/ToastService";

export interface UseManageClausesSettlementActionsProps {
  career: Career;
  season: ClubData;
  onOpenScreen?: (screen: SectionScreen) => void;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalVersion: React.Dispatch<React.SetStateAction<number>>;
  setDeletedRenewalKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  readOnly?: boolean;
  activeInline: ActiveInlineState | null;
  setActiveInline: React.Dispatch<
    React.SetStateAction<ActiveInlineState | null>
  >;
  confirm: (
    message: string,
    options?: ConfirmToastOptions,
  ) => Promise<boolean>;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showSuccess: (message: string) => void;
}

export const useManageClausesSettlementActions = ({
  career,
  season,
  onOpenScreen,
  setIsLoading,
  setLocalVersion,
  setDeletedRenewalKeys,
  readOnly = false,
  activeInline,
  setActiveInline,
  confirm,
  showError,
  showWarning,
  showSuccess,
}: UseManageClausesSettlementActionsProps) => {
  const [sellOnActiveCardKey, setSellOnActiveCardKey] = useState<string | null>(
    null,
  );
  const [sellOnTotalInput, setSellOnTotalInput] = useState<string>("");
  const [sellOnDateInput, setSellOnDateInput] = useState<string>("01/07");

  const handleSettleInstallment = async (item: TransferItem) => {
    if (readOnly) return;
    setIsLoading(true);
    try {
      const serverInstallments = await PlayersContractService.settleInstallment(
        career.id,
        season.id,
        item.player.id,
        item.contractIndex,
      );

      if (item.contract.installments) {
        const nextInstallments =
          serverInstallments ||
          applyInstallmentSettlement(
            item.contract.installments,
            season.id,
            season.seasonNumber,
          ).updated;
        item.contract.installments = nextInstallments;
        const targetPlayer = season.players?.find((p) => p.id === item.player.id);
        const targetContract = targetPlayer?.contract?.[item.contractIndex];
        if (targetContract) {
          targetContract.installments = nextInstallments;
        }
      }
      setLocalVersion((v) => v + 1);
      showSuccess("Parcela liquidada com sucesso!");
    } catch (err) {
      console.error("Erro ao liquidar parcela:", err);
      showError("Não foi possível liquidar a parcela.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettleBonus = async (item: TransferItem, bonusId: string) => {
    if (readOnly) return;
    setIsLoading(true);
    try {
      await PlayersContractService.settleBonus(
        career.id,
        season.id,
        item.player.id,
        bonusId,
      );

      const targetBonus = item.contract.bonuses?.find(
        (b: TransferBonus) => b.id === bonusId,
      );
      if (targetBonus) {
        targetBonus.status = "paid";
        targetBonus.paid = true;
        targetBonus.paidSeasonId = season.id;
        targetBonus.paidSeasonNumber = season.seasonNumber;
      }
      setLocalVersion((v) => v + 1);
      showSuccess("Bônus contratual liquidado com sucesso!");
    } catch (err) {
      console.error("Erro ao liquidar bônus:", err);
      showError("Não foi possível liquidar o bônus.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsettleInstallment = async (item: TransferItem) => {
    if (readOnly) return;
    setIsLoading(true);
    try {
      const serverInstallments =
        await PlayersContractService.unsettleInstallment(
          career.id,
          season.id,
          item.player.id,
          item.contractIndex,
        );

      if (item.contract.installments) {
        const nextInstallments =
          serverInstallments ||
          revertInstallmentSettlement(item.contract.installments).updated;
        item.contract.installments = nextInstallments;
        const targetPlayer = season.players?.find((p) => p.id === item.player.id);
        const targetContract = targetPlayer?.contract?.[item.contractIndex];
        if (targetContract) {
          targetContract.installments = nextInstallments;
        }
      }
      setLocalVersion((v) => v + 1);
      showSuccess("Pagamento da parcela estornado com sucesso!");
    } catch (err) {
      console.error("Erro ao desfazer pagamento da parcela:", err);
      showError("Não foi possível desfazer o pagamento da parcela.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyWageAdjustment = async (item: TransferItem) => {
    if (readOnly) return;
    setIsLoading(true);
    try {
      const newSalary = await PlayersContractService.applyRenewalWageAdjustment(
        career.id,
        season.id,
        item.player.id,
        item.contractIndex,
      );

      const wageAdj =
        item.contract.contractClauses?.wageAdjustment ||
        item.contract.contractDetails?.wageAdjustment;
      if (wageAdj) {
        wageAdj.applied = true;
        wageAdj.status = "applied";
        wageAdj.appliedAt = new Date().toISOString();
      }
      item.contract.salary = newSalary;
      item.player.salary = newSalary;
      if (item.contract.contractDetails) {
        item.contract.contractDetails.weeklyWage = newSalary;
        if (wageAdj) item.contract.contractDetails.wageAdjustment = wageAdj;
      }
      if (item.player.contractDetails) {
        item.player.contractDetails.weeklyWage = newSalary;
        if (wageAdj) item.player.contractDetails.wageAdjustment = wageAdj;
      }
      setLocalVersion((v) => v + 1);
      showSuccess("Reajuste salarial aplicado com sucesso!");
    } catch (err) {
      console.error("Erro ao aplicar ajuste salarial:", err);
      showError("Não foi possível aplicar o ajuste salarial.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertWageAdjustment = async (item: TransferItem) => {
    if (readOnly) return;
    setIsLoading(true);
    try {
      const restoredSalary = await PlayersContractService.revertRenewalWageAdjustment(
        career.id,
        season.id,
        item.player.id,
        item.contractIndex,
      );

      const wageAdj =
        item.contract.contractClauses?.wageAdjustment ||
        item.contract.contractDetails?.wageAdjustment;
      if (wageAdj) {
        wageAdj.applied = false;
        wageAdj.status = "pending";
        wageAdj.baseSalary = restoredSalary;
        delete wageAdj.appliedAt;
        delete wageAdj.preAdjustmentSalary;
      }
      item.contract.salary = restoredSalary;
      item.player.salary = restoredSalary;
      if (item.contract.contractDetails) {
        item.contract.contractDetails.weeklyWage = restoredSalary;
        if (wageAdj) item.contract.contractDetails.wageAdjustment = wageAdj;
      }
      if (item.player.contractDetails) {
        item.player.contractDetails.weeklyWage = restoredSalary;
        if (wageAdj) item.player.contractDetails.wageAdjustment = wageAdj;
      }
      setLocalVersion((v) => v + 1);
      showSuccess("Ajuste salarial revertido com sucesso!");
    } catch (err) {
      console.error("Erro ao reverter ajuste salarial:", err);
      showError("Não foi possível reverter o ajuste salarial.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSellOn = async (item: TransferItem) => {
    if (readOnly) return;
    const totalVal = parseValue(sellOnTotalInput || "0");
    if (totalVal <= 0) {
      showWarning("Informe um valor total de venda válido maior que zero.");
      return;
    }
    if (!isValidShortDate(sellOnDateInput)) {
      showWarning("Informe uma data válida no formato DD/MM (ex: 01/07).");
      return;
    }

    setIsLoading(true);
    try {
      await PlayersContractService.settleSellOnClause(
        career.id,
        season.id,
        item.player.id,
        item.contractIndex,
        totalVal,
        sellOnDateInput,
      );

      if (item.contract.transferClauses) {
        delete item.contract.transferClauses.sellOnPercentage;
        if (
          !item.contract.transferClauses.buybackValue &&
          !item.contract.transferClauses.firstRefusal &&
          !item.contract.transferClauses.loanBackDuration
        ) {
          delete item.contract.transferClauses;
        }
      }

      showSuccess("Venda com mais-valia confirmada com sucesso!");
      setSellOnActiveCardKey(null);
      setSellOnTotalInput("");
    } catch (err) {
      console.error("Erro ao liquidar taxa de revenda:", err);
      showError("Não foi possível liquidar a taxa de revenda.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRenewal = async (item: TransferItem) => {
    if (readOnly) return;
    const confirmed = await confirm(
      "Deseja realmente reverter esta renovação de contrato? O contrato anterior será restaurado.",
      { tone: "danger", confirmLabel: "Reverter" },
    );
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const updatedPlayer = await PlayersContractService.deletePlayerRenewal({
        careerId: career.id,
        seasonId: season.id,
        playerId: item.player.id,
        contractIndex: item.contractIndex,
      });

      const cardKey = `${item.player.id}_${item.contractIndex}_${item.direction}`;
      setDeletedRenewalKeys((prev) => new Set(prev).add(cardKey));

      if (season.players) {
        const targetPlayer = season.players.find(
          (p) => p.id === item.player.id,
        );
        if (targetPlayer) {
          targetPlayer.contract = [...updatedPlayer.contract];
          Object.assign(targetPlayer, updatedPlayer);
        }
      }

      if (item.player && item.player.contract) {
        item.player.contract = [...updatedPlayer.contract];
        Object.assign(item.player, updatedPlayer);
      }

      if (activeInline && activeInline.cardKey === cardKey) {
        setActiveInline(null);
      }

      setLocalVersion((v) => v + 1);
      showSuccess("Renovação revertida com sucesso!");
    } catch (error) {
      console.error("Erro ao reverter renovação:", error);
      showError("Ocorreu um erro ao reverter a renovação de contrato.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerReleaseClause = (item: TransferItem) => {
    if (readOnly || !onOpenScreen) return;
    const rawVal =
      item.contract.releaseClause ||
      item.contract.contractClauses?.releaseClause ||
      item.contract.contractDetails?.releaseClause;
    if (!rawVal) return;
    const numericVal =
      typeof rawVal === "number" ? rawVal : parseValue(String(rawVal));
    const formattedVal =
      numericVal > 0
        ? formatCompactNumber(numericVal).toLowerCase()
        : String(rawVal);

    onOpenScreen({
      key: "transferPlayer",
      playerId: item.player.id,
      mode: "transfer",
      prefill: {
        sellValue: formattedVal,
        lockSellValue: true,
      },
    });
  };

  const handleExerciseBuyback = (item: TransferItem) => {
    if (readOnly || !onOpenScreen) return;
    const buybackVal = item.contract.transferClauses?.buybackValue;
    if (!buybackVal || buybackVal <= 0) return;

    if (item.direction === "arrivals" && !item.player.sell) {
      onOpenScreen({
        key: "transferPlayer",
        playerId: item.player.id,
        seasonId: season.id,
        mode: "transfer",
        prefill: {
          sellValue: formatTransferValue(buybackVal),
          lockSellValue: true,
          toClub: item.contract.fromClub || "",
          lockToClub: true,
          lockTransferType: true,
          sourceSeasonId: season.id,
          sourcePlayerId: item.player.id,
          sourceContractIndex: item.contractIndex,
          mode: "buyback",
        },
      });
      return;
    }

    onOpenScreen({
      key: "addTransferPlayer",
      seasonId: season.id,
      prefill: {
        player: item.player,
        fromClub: item.contract.leftClub || "",
        buyValue: String(buybackVal),
        mode: "buyback",
        sourceSeasonId: season.id,
        sourcePlayerId: item.player.id,
        sourceContractIndex: item.contractIndex,
      },
    });
  };

  const handleExerciseFirstRefusal = (item: TransferItem) => {
    if (readOnly || !onOpenScreen) return;
    onOpenScreen({
      key: "addTransferPlayer",
      seasonId: season.id,
      prefill: {
        player: item.player,
        fromClub: item.contract.leftClub || "",
        mode: "firstRefusal",
        sourceSeasonId: season.id,
        sourcePlayerId: item.player.id,
        sourceContractIndex: item.contractIndex,
      },
    });
  };

  return {
    sellOnActiveCardKey,
    setSellOnActiveCardKey,
    sellOnTotalInput,
    setSellOnTotalInput,
    sellOnDateInput,
    setSellOnDateInput,
    handleSettleInstallment,
    handleSettleBonus,
    handleUnsettleInstallment,
    handleApplyWageAdjustment,
    handleRevertWageAdjustment,
    handleConfirmSellOn,
    handleDeleteRenewal,
    handleRevertRenewal: handleDeleteRenewal,
    handleTriggerReleaseClause,
    handleExerciseBuyback,
    handleExerciseFirstRefusal,
  };
};

export default useManageClausesSettlementActions;
