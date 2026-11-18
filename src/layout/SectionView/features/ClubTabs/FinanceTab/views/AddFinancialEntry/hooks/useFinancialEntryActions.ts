import { useState, useCallback } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { FinancialEntry } from "../../../../../../../../common/interfaces/finance";
import { ServiceFinance } from "../../../../../../../../common/services/ServiceFinance";
import { SectionScreen } from "../../../../../../config/screens";
import { OptimisticUpdateData } from "../../../../../../helpers/updateSectionCareer";
import { toast } from "../../../../../../../../common/services/ToastService";

export interface UseFinancialEntryActionsProps {
  career: Career;
  season: ClubData;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  onOpenTransfers?: (type: "arrivals" | "exit") => void;
  notSeason?: boolean;
  type: "revenue" | "expense";
  category: string;
  parsedAmount: number;
  editingEntry: FinancialEntry | null;
  setEditingEntry: (entry: FinancialEntry | null) => void;
  resetForm: () => void;
  addOrUpdateEntryLocal: (entry: FinancialEntry) => void;
  removeEntryLocal: (entryId: string) => void;
  refreshCustomCategories?: () => void;
}

export const useFinancialEntryActions = ({
  career,
  season,
  onClose,
  onOpenScreen,
  onOpenTransfers,
  notSeason,
  type,
  category,
  parsedAmount,
  editingEntry,
  setEditingEntry,
  resetForm,
  addOrUpdateEntryLocal,
  removeEntryLocal,
  refreshCustomCategories,
}: UseFinancialEntryActionsProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setErrorMessage(null);

    if (notSeason) {
      setErrorMessage(
        "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
      );
      return;
    }

    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      setErrorMessage("Por favor, selecione ou informe uma categoria.");
      return;
    }

    if (parsedAmount <= 0) {
      setErrorMessage(
        "Por favor, informe um valor monetário válido maior que zero.",
      );
      return;
    }

    try {
      if (editingEntry) {
        const updatedEntry = await ServiceFinance.updateEntry(
          career.id,
          season.id,
          editingEntry.id,
          {
            type,
            category: trimmedCategory,
            amount: parsedAmount,
          },
          notSeason,
          career.groupId,
        );

        addOrUpdateEntryLocal(updatedEntry);
        setEditingEntry(null);
        resetForm();
        refreshCustomCategories?.();
        toast.success("Lançamento financeiro atualizado com sucesso!");
      } else {
        const newEntry = await ServiceFinance.addEntry(
          career.id,
          season.id,
          {
            type,
            category: trimmedCategory,
            amount: parsedAmount,
            isAutomatic: false,
            source: "manual",
          },
          notSeason,
          career.groupId,
        );

        addOrUpdateEntryLocal(newEntry);
        resetForm();
        refreshCustomCategories?.();
        toast.success("Lançamento financeiro registrado com sucesso!");
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro ao salvar lançamento financeiro.",
      );
    }
  };

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      setErrorMessage(null);
      if (notSeason) {
        setErrorMessage(
          "Mutações financeiras não são permitidas no modo somente leitura (Geral).",
        );
        return;
      }

      try {
        await ServiceFinance.deleteEntry(
          career.id,
          season.id,
          entryId,
          notSeason,
        );
        removeEntryLocal(entryId);
        if (editingEntry?.id === entryId) {
          setEditingEntry(null);
          resetForm();
        }
        toast.success("Lançamento financeiro excluído com sucesso!");
      } catch (error: unknown) {
        toast.error("Erro ao excluir lançamento financeiro.");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro ao excluir lançamento financeiro.",
        );
      }
    },
    [career.id, season.id, notSeason, editingEntry, removeEntryLocal, setEditingEntry, resetForm],
  );

  const handleRedirectToSource = useCallback(
    (entry: FinancialEntry) => {
      const isTransfer =
        entry.source === "transfer" ||
        (!entry.source && entry.isAutomatic && entry.id.startsWith("transfer_"));
      const isClause =
        entry.source === "clause" ||
        (!entry.source &&
          entry.isAutomatic &&
          (entry.id.startsWith("bonus_") ||
            entry.id.startsWith("inst_") ||
            entry.id.startsWith("sellon_") ||
            entry.id.startsWith("signing_bonus_") ||
            entry.id.startsWith("agent_fee_")));

      if (isTransfer) {
        onClose();
        const direction =
          entry.transferDirection ||
          (entry.type === "revenue" ? "exit" : "arrivals");
        onOpenTransfers?.(direction);
      } else if (isClause) {
        const isSigning =
          entry.clauseType === "signingBonus" ||
          entry.id.startsWith("signing_bonus_");
        const targetTab: "renewals" | "arrivals" | "exit" = isSigning
          ? "renewals"
          : entry.transferDirection === "arrivals" || entry.type === "expense"
            ? "arrivals"
            : "exit";

        onOpenScreen?.({ key: "manageClauses", initialTab: targetTab });
      }
    },
    [onClose, onOpenTransfers, onOpenScreen],
  );

  return {
    errorMessage,
    setErrorMessage,
    handleSave,
    handleDeleteEntry,
    handleRedirectToSource,
  };
};

export default useFinancialEntryActions;
