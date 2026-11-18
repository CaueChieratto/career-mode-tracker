import { useCallback, useState } from "react";
import { TransferBonus } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { toast } from "../../../../../../../../../common/services/ToastService";
import {
  formatTransferValue,
  parseValue,
} from "../../../../../../../../../common/utils/FormatValue";

export const isObjectiveAchievedBonus = (bonus: {
  bonusCategory?: string;
  category?: string;
}): boolean =>
  bonus.bonusCategory
    ? bonus.bonusCategory === "Objetivo atingido"
    : bonus.category === "objective";

const PERFORMANCE_METRIC_MAP: Record<string, TransferBonus["metric"]> = {
  Partidas: "matches",
  "Jogos disputados": "matches",
  "Gols marcados": "goals",
  Assistências: "assists",
  "Partidas sem sofrer gols": "cleanSheets",
  "Jogos sem sofrer gols": "cleanSheets",
};

const scrollBonusDrawerToTop = () => {
  setTimeout(() => {
    const drawerBody = document.getElementById("clauseSectionDrawerBody");
    if (drawerBody && typeof drawerBody.scrollTo === "function") {
      drawerBody.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, 0);
};

export interface UseTransferBonusesDraftOptions<
  TFormValues extends Record<string, string | undefined> = Record<
    string,
    string
  >,
> {
  formValues: TFormValues;
  setFormValues: React.Dispatch<React.SetStateAction<TFormValues>>;
  initialBonuses?: TransferBonus[];
  getDirection?: () => "receivable" | "payable";
  getPartnerClub?: () => string;
  requireValueSuffix?: boolean;
  validateSingleObjective?: boolean;
  hasPerformanceCountInput?: boolean;
  includeBonusStatus?: boolean;
  getNextCategoryAfterSave?: (nextHasObjective: boolean) => string;
  clearFormOnDeleteEditing?: boolean;
  onWarning?: (message: string) => void;
}

export const useTransferBonusesDraft = <
  TFormValues extends Record<string, string | undefined> = Record<
    string,
    string
  >,
>({
  formValues,
  setFormValues,
  initialBonuses = [],
  getDirection,
  getPartnerClub,
  requireValueSuffix = false,
  validateSingleObjective = true,
  hasPerformanceCountInput = true,
  includeBonusStatus = false,
  getNextCategoryAfterSave,
  clearFormOnDeleteEditing = true,
  onWarning,
}: UseTransferBonusesDraftOptions<TFormValues>) => {
  const [bonuses, setBonuses] = useState<TransferBonus[]>(() => [
    ...initialBonuses,
  ]);
  const [editingBonusIndex, setEditingBonusIndex] = useState<number | null>(
    null,
  );

  const notifyWarning = useCallback(
    (message: string) => {
      if (onWarning) {
        onWarning(message);
      } else {
        toast.warning(message);
      }
    },
    [onWarning],
  );

  const resetBonuses = useCallback((nextBonuses: TransferBonus[] = []) => {
    setBonuses([...nextBonuses]);
    setEditingBonusIndex(null);
  }, []);

  const handleAddOrEditBonus = useCallback(
    (directBonus?: TransferBonus) => {
      if (
        directBonus &&
        typeof directBonus === "object" &&
        "value" in directBonus &&
        !("nativeEvent" in directBonus)
      ) {
        setBonuses((prev) => {
          if (editingBonusIndex !== null) {
            return prev.map((item, idx) =>
              idx === editingBonusIndex ? directBonus : item,
            );
          }
          return [...prev, directBonus];
        });
        setEditingBonusIndex(null);
        return true;
      }

      const category = (
        formValues.bonusCategory || "Objetivo atingido"
      ).trim();
      const objective = (formValues.bonusObjective || "").trim();
      const targetLeague = (formValues.bonusLeague || "").trim();
      const bonusVal = (formValues.bonusValue || "").trim();
      const bonusCountRaw = (formValues.bonusCount || "").trim();

      if (requireValueSuffix) {
        if (!objective) {
          notifyWarning(
            "Por favor, selecione ou informe o objetivo do bônus.",
          );
          return false;
        }
        if (!bonusVal) {
          notifyWarning("Por favor, informe o valor do bônus.");
          return false;
        }
        if (!/[kmb]$/i.test(bonusVal) && bonusVal !== "0") {
          notifyWarning("O valor do bônus deve terminar com 'k', 'm' ou 'b'.");
          return false;
        }
      } else if (!objective || !bonusVal) {
        notifyWarning("Por favor, preencha o objetivo e valor do bônus.");
        return false;
      }

      const previousBonus =
        editingBonusIndex !== null ? bonuses[editingBonusIndex] : undefined;

      let countNum: number | undefined;
      if (category === "Desempenho" && hasPerformanceCountInput) {
        const parsedCount = parseInt(bonusCountRaw, 10);
        if (
          !bonusCountRaw ||
          isNaN(parsedCount) ||
          parsedCount < 1 ||
          parsedCount > 100
        ) {
          notifyWarning(
            requireValueSuffix
              ? "A contagem de desempenho do bônus deve ser entre 1 e 100."
              : "Informe uma quantidade válida (1 a 100) para a meta de desempenho.",
          );
          return false;
        }
        countNum = parsedCount;
      }

      if (validateSingleObjective && category === "Objetivo atingido") {
        const alreadyHas = bonuses.some(
          (b, idx) =>
            isObjectiveAchievedBonus(b) && idx !== editingBonusIndex,
        );
        if (alreadyHas) {
          notifyWarning(
            "O bônus de 'Objetivo atingido' só pode ser adicionado uma única vez.",
          );
          return false;
        }
      }

      if (category === "Desempenho") {
        const alreadyHasPerf = bonuses.some((b, idx) => {
          if (idx === editingBonusIndex) return false;
          const isPerf =
            b.bonusCategory === "Desempenho" ||
            b.category === "performance" ||
            Boolean(b.metric);
          if (!isPerf) return false;
          const bObj = (b.bonusTarget || b.targetObjective || b.name || "")
            .trim()
            .toLowerCase();
          return bObj === objective.toLowerCase();
        });
        if (alreadyHasPerf) {
          notifyWarning(
            "O objetivo de desempenho já foi selecionado em outro bônus.",
          );
          return false;
        }
      }

      const bonusCatType: "objective" | "award" | "performance" =
        category === "Prêmio"
          ? "award"
          : category === "Desempenho"
            ? "performance"
            : "objective";

      const isPaid = includeBonusStatus
        ? formValues.bonusStatus === "Liquidado"
        : false;

      const wasPaid = Boolean(
        previousBonus && (previousBonus.status === "paid" || previousBonus.paid),
      );
      const prevObjective = (
        previousBonus?.bonusTarget ||
        previousBonus?.targetObjective ||
        previousBonus?.name ||
        ""
      ).trim();
      const prevLeague = (previousBonus?.targetLeague || "").trim();
      const changedGoalOrLeague =
        prevObjective !== objective || prevLeague !== targetLeague;
      const shouldDisableAutoSettlement =
        !isPaid &&
        ((wasPaid && includeBonusStatus) ||
          (Boolean(previousBonus?.autoSettlementDisabled) &&
            !changedGoalOrLeague));

      const updatedBonus: TransferBonus = {
        id:
          editingBonusIndex !== null && bonuses[editingBonusIndex]?.id
            ? bonuses[editingBonusIndex].id
            : `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        direction: getDirection ? getDirection() : "receivable",
        category: bonusCatType,
        bonusCategory: category as TransferBonus["bonusCategory"],
        name: objective,
        description: objective,
        targetObjective: objective,
        bonusTarget: objective,
        ...(category === "Objetivo atingido" && targetLeague
          ? { targetLeague }
          : {}),
        value: parseValue(bonusVal),
        partnerClub: getPartnerClub ? getPartnerClub() : formValues.toClub || "",
        status: isPaid ? "paid" : "pending",
        paid: isPaid,
        ...(isPaid && previousBonus?.paidSeasonId
          ? { paidSeasonId: previousBonus.paidSeasonId }
          : {}),
        ...(isPaid && previousBonus?.paidSeasonNumber !== undefined
          ? { paidSeasonNumber: previousBonus.paidSeasonNumber }
          : {}),
        ...(shouldDisableAutoSettlement
          ? { autoSettlementDisabled: true }
          : {}),
        ...(category === "Desempenho" && countNum !== undefined
          ? {
              metricTarget: countNum,
              targetCount: countNum,
              metric: PERFORMANCE_METRIC_MAP[objective],
            }
          : {}),
      };

      const nextBonuses =
        editingBonusIndex !== null
          ? bonuses.map((b, idx) =>
              idx === editingBonusIndex ? updatedBonus : b,
            )
          : [...bonuses, updatedBonus];

      setBonuses(nextBonuses);

      const nextHasObjective = nextBonuses.some(isObjectiveAchievedBonus);
      const nextDefaultCategory = getNextCategoryAfterSave
        ? getNextCategoryAfterSave(nextHasObjective)
        : nextHasObjective
          ? "Prêmio"
          : "Objetivo atingido";

      setFormValues((prev) => ({
        ...prev,
        bonusCategory: nextDefaultCategory,
        bonusObjective: "",
        bonusLeague: "",
        bonusCount: "",
        bonusValue: "",
        ...(includeBonusStatus ? { bonusStatus: "Pendente" } : {}),
      }));
      setEditingBonusIndex(null);
      return true;
    },
    [
      bonuses,
      editingBonusIndex,
      formValues,
      getDirection,
      getNextCategoryAfterSave,
      getPartnerClub,
      hasPerformanceCountInput,
      includeBonusStatus,
      notifyWarning,
      requireValueSuffix,
      setFormValues,
      validateSingleObjective,
    ],
  );

  const handleEditBonus = useCallback(
    (index: number) => {
      const item = bonuses[index];
      if (!item) return;

      const countVal =
        item.targetCount !== undefined
          ? item.targetCount
          : item.metricTarget !== undefined
            ? item.metricTarget
            : undefined;

      setFormValues((prev) => ({
        ...prev,
        bonusCategory: item.bonusCategory || "Objetivo atingido",
        bonusObjective: item.bonusTarget || item.name || item.description || "",
        bonusLeague: item.targetLeague || "",
        bonusCount: countVal !== undefined ? String(countVal) : "",
        bonusValue: formatTransferValue(item.value).toLowerCase(),
        ...(includeBonusStatus
          ? {
              bonusStatus:
                item.status === "paid" || item.paid ? "Liquidado" : "Pendente",
            }
          : {}),
      }));
      setEditingBonusIndex(index);
      scrollBonusDrawerToTop();
    },
    [bonuses, includeBonusStatus, setFormValues],
  );

  const handleDeleteBonus = useCallback(
    (index: number) => {
      setBonuses((prev) => prev.filter((_, idx) => idx !== index));
      if (editingBonusIndex === index) {
        setEditingBonusIndex(null);
        if (clearFormOnDeleteEditing) {
          setFormValues((prev) => ({
            ...prev,
            bonusCategory: "",
            bonusObjective: "",
            bonusLeague: "",
            bonusCount: "",
            bonusValue: "",
          }));
        }
      }
    },
    [clearFormOnDeleteEditing, editingBonusIndex, setFormValues],
  );

  return {
    bonuses,
    editingBonusIndex,
    setBonuses,
    setEditingBonusIndex,
    resetBonuses,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
  };
};

export default useTransferBonusesDraft;
