import { useState, useCallback } from "react";
import { TransferBonus } from "../../../../common/interfaces/playersInfo/transferTerms";

export interface UseTransferBonusesFormResult {
  bonuses: TransferBonus[];
  editingBonusIndex: number | null;
  handleAddOrEditBonus: (newBonus: TransferBonus) => boolean;
  handleEditBonus: (index: number) => void;
  handleDeleteBonus: (index: number) => void;
  resetBonuses: (initial?: TransferBonus[]) => void;
  setBonuses: React.Dispatch<React.SetStateAction<TransferBonus[]>>;
  setEditingBonusIndex: React.Dispatch<React.SetStateAction<number | null>>;
}

export const useTransferBonusesForm = (
  initialBonuses: TransferBonus[] = [],
): UseTransferBonusesFormResult => {
  const [bonuses, setBonuses] = useState<TransferBonus[]>(initialBonuses);
  const [editingBonusIndex, setEditingBonusIndex] = useState<number | null>(null);

  const resetBonuses = useCallback((initial: TransferBonus[] = []) => {
    setBonuses(initial);
    setEditingBonusIndex(null);
  }, []);

  const handleEditBonus = useCallback((index: number) => {
    setEditingBonusIndex(index);
  }, []);

  const handleDeleteBonus = useCallback((index: number) => {
    setBonuses((prev) => prev.filter((_, idx) => idx !== index));
    setEditingBonusIndex((prev) =>
      prev === index ? null : prev !== null && prev > index ? prev - 1 : prev,
    );
  }, []);

  const handleAddOrEditBonus = useCallback(
    (newBonus: TransferBonus): boolean => {
      const objective = (
        newBonus.bonusTarget ||
        newBonus.targetObjective ||
        newBonus.name ||
        ""
      )
        .trim()
        .toLowerCase();

      // Validação estrita de objetivo único por categoria
      if (objective) {
        const isPerf =
          newBonus.bonusCategory === "Desempenho" ||
          newBonus.category === "performance" ||
          Boolean(newBonus.metric);

        const duplicateIndex = bonuses.findIndex((b, idx) => {
          if (idx === editingBonusIndex) return false;
          const bIsPerf =
            b.bonusCategory === "Desempenho" ||
            b.category === "performance" ||
            Boolean(b.metric);
          const bObj = (
            b.bonusTarget ||
            b.targetObjective ||
            b.name ||
            ""
          )
            .trim()
            .toLowerCase();

          if (isPerf && bIsPerf) {
            return bObj === objective;
          }
          if (!isPerf && !bIsPerf) {
            return bObj === objective;
          }
          return false;
        });
        if (duplicateIndex !== -1) {
          return false;
        }
      }

      if (editingBonusIndex !== null) {
        setBonuses((prev) => {
          const next = [...prev];
          next[editingBonusIndex] = newBonus;
          return next;
        });
        setEditingBonusIndex(null);
      } else {
        setBonuses((prev) => [...prev, newBonus]);
      }
      return true;
    },
    [bonuses, editingBonusIndex],
  );

  return {
    bonuses,
    editingBonusIndex,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
    resetBonuses,
    setBonuses,
    setEditingBonusIndex,
  };
};

export default useTransferBonusesForm;

