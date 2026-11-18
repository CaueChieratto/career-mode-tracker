import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { TransferBonus } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { parseValue, formatDisplayValue } from "../../../../../../../../../common/utils/FormatValue";
import { formatDateInput } from "../../../../../../../../../common/utils/Date";
import {
  calculateContractUntilFromYears,
  getPlayerOriginalContractYears,
} from "../../../../../../../../../common/utils/calculateContractYears";
import { Field } from "../../../../../../../../../components/FormSection";
import { RenewalDrawerKey, RenewalFormValues } from "../../types";
import { OptimisticUpdateData } from "../../../../../../../helpers/updateSectionCareer";
import { toast } from "../../../../../../../../../common/services/ToastService";
import { ServiceProposals } from "../../../../../../../../../common/services/ServiceProposals";
import {
  NegotiationStageStatus,
  TransferProposal,
} from "../../../../../../../../../common/interfaces/proposals/transferProposal";
import { SectionScreen } from "../../../../../../../config/screens";
import { useTransferBonusesForm } from "../../../../../../../hooks/useTransferBonusesForm";
import { useRenewPlayerActions } from "../useRenewPlayerActions";

interface RenewalSessionDraft {
  bonuses: TransferBonus[];
  releaseClause?: string;
  wageAdjustmentType?: string;
  wageAdjustmentObjective?: string;
  wageAdjustmentLeague?: string;
  wageAdjustmentPercentage?: string;
}

interface UseRenewPlayerFormParams {
  career: Career;
  season: ClubData;
  playerId: string;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
  proposalId?: string;
  initialProposal?: TransferProposal;
}

const isObjectiveAtingidoBonus = (b: { bonusCategory?: string; category?: string }) =>
  b.bonusCategory
    ? b.bonusCategory === "Objetivo atingido"
    : b.category === "objective";

export const useRenewPlayerForm = ({
  career,
  season,
  playerId,
  onClose,
  onOpenScreen,
  proposalId,
  initialProposal,
}: UseRenewPlayerFormParams) => {
  const player = useMemo(
    () => (season.players || []).find((p: Players) => p.id === playerId),
    [season.players, playerId],
  );

  const originalYears = useMemo(() => {
    return getPlayerOriginalContractYears(
      player,
      career.createdAt,
      season.seasonNumber,
      career.nation,
    );
  }, [player, career.createdAt, career.nation, season.seasonNumber]);

  const draftKey = useMemo(
    () => `renewal_draft_${career.id}_${season.id}_${playerId}`,
    [career.id, season.id, playerId],
  );

  const initialDraft = useMemo((): RenewalSessionDraft | null => {
    try {
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem(draftKey);
        return stored ? JSON.parse(stored) : null;
      }
      return null;
    } catch {
      return null;
    }
  }, [draftKey]);

  const [formValues, setFormValues] = useState<RenewalFormValues>(() => ({
    salary: "",
    contractTime: "",
    contractUntil: "",
    signingBonus: "",
    releaseClause: initialDraft?.releaseClause || "",
    wageAdjustmentType: initialDraft?.wageAdjustmentType || "N/D",
    wageAdjustmentObjective: initialDraft?.wageAdjustmentObjective || "",
    wageAdjustmentLeague: initialDraft?.wageAdjustmentLeague || "",
    wageAdjustmentPercentage: initialDraft?.wageAdjustmentPercentage || "5%",
    bonusCategory: "Objetivo atingido",
    bonusObjective: "",
    bonusLeague: "",
    bonusValue: "",
  }));

  // Consome a abstração canônica de bônus contratuais
  const defaultPlayerBonuses =
    initialDraft?.bonuses ||
    player?.contractDetails?.performanceBonuses ||
    (player?.contract && player.contract.length > 0
      ? player.contract[player.contract.length - 1]?.bonuses
      : undefined) ||
    [];
  const bonusesForm = useTransferBonusesForm(defaultPlayerBonuses);
  const {
    bonuses,
    editingBonusIndex,
    handleAddOrEditBonus: addOrEditBonusInForm,
    handleEditBonus: setFormEditingBonusIndex,
    handleDeleteBonus: deleteBonusFromForm,
    setBonuses,
    setEditingBonusIndex,
  } = bonusesForm;

  const [activeDrawerKey, setActiveDrawerKey] = useState<RenewalDrawerKey>(null);
  const [playerNegotiationStatus, setPlayerNegotiationStatus] =
    useState<NegotiationStageStatus>("em_negociacao");

  const proposalRestoredRef = useRef(false);
  useEffect(() => {
    if (initialProposal) {
      if (initialProposal.formState?.formValues) {
        setFormValues((prev) => ({
          ...prev,
          ...initialProposal.formState?.formValues,
        }));
      } else if (initialProposal.playerNegotiation) {
        setFormValues((prev) => ({
          ...prev,
          salary: initialProposal.playerNegotiation?.weeklyWage
            ? String(initialProposal.playerNegotiation.weeklyWage)
            : "",
          contractTime: initialProposal.playerNegotiation?.durationYears
            ? String(initialProposal.playerNegotiation.durationYears)
            : "",
          contractUntil: initialProposal.playerNegotiation?.contractUntil || "",
          signingBonus: initialProposal.playerNegotiation?.signingBonus
            ? String(initialProposal.playerNegotiation.signingBonus)
            : "",
          releaseClause: initialProposal.playerNegotiation?.releaseClause
            ? String(initialProposal.playerNegotiation.releaseClause)
            : "",
        }));
      }
      if (initialProposal.playerNegotiation?.performanceBonuses?.length) {
        setBonuses(initialProposal.playerNegotiation.performanceBonuses);
      }
      if (initialProposal.playerNegotiation?.status) {
        setPlayerNegotiationStatus(initialProposal.playerNegotiation.status);
      }
      return;
    }

    if (!proposalId || proposalRestoredRef.current) return;
    proposalRestoredRef.current = true;
    ServiceProposals.getProposalById(career.id, season.id, proposalId)
      .then((proposal) => {
        if (!proposal) return;
        if (proposal.formState?.formValues) {
          setFormValues((prev) => ({
            ...prev,
            ...proposal.formState?.formValues,
          }));
        } else if (proposal.playerNegotiation) {
          setFormValues((prev) => ({
            ...prev,
            salary: proposal.playerNegotiation?.weeklyWage
              ? String(proposal.playerNegotiation.weeklyWage)
              : "",
            contractTime: proposal.playerNegotiation?.durationYears
              ? String(proposal.playerNegotiation.durationYears)
              : "",
            contractUntil: proposal.playerNegotiation?.contractUntil || "",
            signingBonus: proposal.playerNegotiation?.signingBonus
              ? String(proposal.playerNegotiation.signingBonus)
              : "",
            releaseClause: proposal.playerNegotiation?.releaseClause
              ? String(proposal.playerNegotiation.releaseClause)
              : "",
          }));
        }
        if (proposal.playerNegotiation?.performanceBonuses?.length) {
          setBonuses(proposal.playerNegotiation.performanceBonuses);
        }
        if (proposal.playerNegotiation?.status) {
          setPlayerNegotiationStatus(proposal.playerNegotiation.status);
        }
      })
      .catch((err) => {
        console.error("Erro ao restaurar proposta em RenewPlayer:", err);
      });
  }, [initialProposal, proposalId, career.id, season.id, setBonuses]);

  const persistDraft = useCallback(
    (
      draftBonuses: TransferBonus[],
      specialClauses: {
        releaseClause?: string;
        wageAdjustmentType?: string;
        wageAdjustmentObjective?: string;
        wageAdjustmentLeague?: string;
        wageAdjustmentPercentage?: string;
      },
    ) => {
      try {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            draftKey,
            JSON.stringify({
              bonuses: draftBonuses,
              ...specialClauses,
            }),
          );
        }
      } catch (err) {
        console.warn("Falha ao salvar rascunho de renovação no sessionStorage:", err);
      }
    },
    [draftKey],
  );

  const handleInputChange = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
        | { target: { name: string; value: string } },
      field?: Field,
    ) => {
      const fieldId = field?.id || e.target.name;
      let val = e.target.value;

      if (fieldId === "contractTime") {
        const num = parseInt(val, 10);
        const hasExtension = !isNaN(num) && num >= 0;
        const totalYears = hasExtension ? originalYears + num : 0;
        const calcUntil =
          totalYears > 0
            ? calculateContractUntilFromYears(
                totalYears,
                career.createdAt,
                season.seasonNumber,
                career.nation,
              )
            : "";
        setFormValues((prev) => ({
          ...prev,
          contractTime: val,
          contractUntil: calcUntil,
        }));
        return;
      }

      if (fieldId === "contractUntil") {
        val = formatDateInput(val);
      }

      setFormValues((prev) => {
        const next = { ...prev, [fieldId]: val };
        if (fieldId === "bonusCategory") {
          next.bonusObjective = "";
          next.bonusLeague = "";
        }
        return next;
      });
    },
    [career.createdAt, career.nation, season.seasonNumber, originalYears],
  );

  const [drawerSnapshot, setDrawerSnapshot] = useState<{
    bonuses: TransferBonus[];
    formValues: Record<string, string>;
  } | null>(null);

  const openDrawer = useCallback(
    (key: RenewalDrawerKey) => {
      setDrawerSnapshot({
        bonuses: [...bonuses],
        formValues: { ...(formValues as Record<string, string>) },
      });
      setActiveDrawerKey(key);
    },
    [bonuses, formValues],
  );

  const closeDrawer = useCallback(() => {
    setActiveDrawerKey(null);
    setEditingBonusIndex(null);
    setDrawerSnapshot(null);
    setFormValues((prev) => ({
      ...prev,
      bonusObjective: "",
      bonusLeague: "",
      bonusValue: "",
    }));
  }, [setEditingBonusIndex]);

  const handleCancelDrawer = useCallback(() => {
    if (drawerSnapshot) {
      setBonuses(drawerSnapshot.bonuses);
      setFormValues((prev) => ({
        ...prev,
        ...drawerSnapshot.formValues,
        bonusObjective: "",
        bonusLeague: "",
        bonusValue: "",
      }));
    }
    setActiveDrawerKey(null);
    setEditingBonusIndex(null);
    setDrawerSnapshot(null);
  }, [drawerSnapshot, setBonuses, setEditingBonusIndex]);

  const handleAddOrEditBonus = useCallback((): boolean => {
    const category = formValues.bonusCategory || "Objetivo atingido";
    const objective = (formValues.bonusObjective || "").trim();
    const targetLeague = (formValues.bonusLeague || "").trim();
    const bonusVal = (formValues.bonusValue || "").trim();

    if (!objective) {
      toast.warning("Por favor, selecione ou informe o objetivo do bônus.");
      return false;
    }

    if (!bonusVal) {
      toast.warning("Por favor, informe o valor do bônus.");
      return false;
    }

    const cleanBonus = bonusVal.toLowerCase();
    if (
      !cleanBonus.endsWith("k") &&
      !cleanBonus.endsWith("m") &&
      !cleanBonus.endsWith("b")
    ) {
      toast.warning("O valor do bônus deve terminar com 'k', 'm' ou 'b'.");
      return false;
    }

    if (category === "Objetivo atingido") {
      const alreadyHas = bonuses.some(
        (b, idx) =>
          isObjectiveAtingidoBonus(b) &&
          idx !== editingBonusIndex,
      );
      if (alreadyHas) {
        toast.warning("O bônus de 'Objetivo atingido' só pode ser adicionado uma única vez.");
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
        toast.warning(
          "O objetivo de desempenho já foi selecionado em outro bônus.",
        );
        return false;
      }
    }

    const updatedBonus: TransferBonus = {
      id:
        editingBonusIndex !== null && bonuses[editingBonusIndex]?.id
          ? bonuses[editingBonusIndex].id
          : `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      direction: "payable",
      category: category === "Desempenho" ? "performance" : "objective",
      bonusCategory: category,
      name: objective,
      bonusTarget: objective,
      targetObjective: objective,
      ...(category === "Objetivo atingido" && targetLeague
        ? { targetLeague }
        : {}),
      description: objective,
      value: parseValue(bonusVal),
      status: "pending",
    };

    const added = addOrEditBonusInForm(updatedBonus);
    if (!added) {
      toast.warning("Este objetivo de bônus já foi adicionado.");
      return false;
    }

    const nextBonuses = editingBonusIndex !== null
      ? bonuses.map((b, idx) => idx === editingBonusIndex ? updatedBonus : b)
      : [...bonuses, updatedBonus];
    const nextHasObjective = nextBonuses.some(isObjectiveAtingidoBonus);
    const nextDefaultCategory = nextHasObjective ? "Desempenho" : "Objetivo atingido";

    setFormValues((prev) => ({
      ...prev,
      bonusCategory: nextDefaultCategory,
      bonusObjective: "",
      bonusLeague: "",
      bonusValue: "",
    }));
    return true;
  }, [formValues, bonuses, editingBonusIndex, addOrEditBonusInForm]);

  const handleSaveBonusDrawer = useCallback(() => {
    const category = formValues.bonusCategory || "Objetivo atingido";
    const objective = (formValues.bonusObjective || "").trim();
    const targetLeague = (formValues.bonusLeague || "").trim();
    const bonusVal = (formValues.bonusValue || "").trim();
    const finalBonuses = [...bonuses];

    if (objective || bonusVal || editingBonusIndex !== null) {
      if (!objective) {
        toast.warning("Por favor, selecione ou informe o objetivo do bônus.");
        return;
      }

      if (!bonusVal) {
        toast.warning("Por favor, informe o valor do bônus.");
        return;
      }

      const cleanBonus = bonusVal.toLowerCase();
      if (
        !cleanBonus.endsWith("k") &&
        !cleanBonus.endsWith("m") &&
        !cleanBonus.endsWith("b")
      ) {
        toast.warning("O valor do bônus deve terminar com 'k', 'm' ou 'b'.");
        return;
      }

      if (category === "Objetivo atingido") {
        const alreadyHas = bonuses.some(
          (b, idx) =>
            isObjectiveAtingidoBonus(b) &&
            idx !== editingBonusIndex,
        );
        if (alreadyHas) {
          toast.warning("O bônus de 'Objetivo atingido' só pode ser adicionado uma única vez.");
          return;
        }
      }

      const updatedBonus: TransferBonus = {
        id:
          editingBonusIndex !== null && bonuses[editingBonusIndex]?.id
            ? bonuses[editingBonusIndex].id
            : `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        direction: "payable",
        category: category === "Desempenho" ? "performance" : "objective",
        bonusCategory: category,
        name: objective,
        bonusTarget: objective,
        targetObjective: objective,
        ...(category === "Objetivo atingido" && targetLeague
          ? { targetLeague }
          : {}),
        description: objective,
        value: parseValue(bonusVal),
        status: "pending",
      };

      if (editingBonusIndex !== null) {
        finalBonuses[editingBonusIndex] = updatedBonus;
      } else {
        finalBonuses.push(updatedBonus);
      }
      setBonuses(finalBonuses);
    }

    const nextHasObjective = finalBonuses.some(isObjectiveAtingidoBonus);
    const nextDefaultCategory = nextHasObjective ? "Desempenho" : "Objetivo atingido";

    persistDraft(finalBonuses, {
      releaseClause: formValues.releaseClause,
      wageAdjustmentType: formValues.wageAdjustmentType,
      wageAdjustmentObjective: formValues.wageAdjustmentObjective,
      wageAdjustmentLeague: formValues.wageAdjustmentLeague,
      wageAdjustmentPercentage: formValues.wageAdjustmentPercentage,
    });

    setActiveDrawerKey(null);
    setEditingBonusIndex(null);
    setDrawerSnapshot(null);
    setFormValues((prev) => ({
      ...prev,
      bonusCategory: nextDefaultCategory,
      bonusObjective: "",
      bonusLeague: "",
      bonusValue: "",
    }));
  }, [
    bonuses,
    editingBonusIndex,
    formValues,
    persistDraft,
    setBonuses,
    setEditingBonusIndex,
  ]);

  const handleSaveSpecialClausesDrawer = useCallback(() => {
    const isWageAdjActive =
      formValues.wageAdjustmentType === "Aumentar" ||
      formValues.wageAdjustmentType === "Diminuir";

    if (isWageAdjActive && !formValues.wageAdjustmentObjective?.trim()) {
      toast.warning("Por favor, selecione um critério para o ajuste automático de salário.");
      return;
    }

    persistDraft(bonuses, {
      releaseClause: formValues.releaseClause,
      wageAdjustmentType: formValues.wageAdjustmentType,
      wageAdjustmentObjective: formValues.wageAdjustmentObjective,
      wageAdjustmentLeague: formValues.wageAdjustmentLeague,
      wageAdjustmentPercentage: formValues.wageAdjustmentPercentage,
    });

    setActiveDrawerKey(null);
    setDrawerSnapshot(null);
  }, [bonuses, formValues, persistDraft]);

  const handleEditBonus = useCallback(
    (index: number) => {
      const b = bonuses[index];
      if (!b) return;
      setFormEditingBonusIndex(index);
      setFormValues((prev) => ({
        ...prev,
        bonusCategory:
          b.bonusCategory === "Desempenho" || b.category === "performance"
            ? "Desempenho"
            : "Objetivo atingido",
        bonusObjective: b.bonusTarget || b.name || "",
        bonusLeague: b.targetLeague || "",
        bonusValue: formatDisplayValue(b.value, career.currency),
      }));
    },
    [bonuses, career.currency, setFormEditingBonusIndex],
  );

  const handleDeleteBonus = useCallback(
    (index: number) => {
      const nextBonuses = bonuses.filter((_, idx) => idx !== index);
      deleteBonusFromForm(index);
      persistDraft(nextBonuses, {
        releaseClause: formValues.releaseClause,
        wageAdjustmentType: formValues.wageAdjustmentType,
        wageAdjustmentObjective: formValues.wageAdjustmentObjective,
        wageAdjustmentLeague: formValues.wageAdjustmentLeague,
        wageAdjustmentPercentage: formValues.wageAdjustmentPercentage,
      });
      if (editingBonusIndex === index) {
        setFormValues((prev) => ({
          ...prev,
          bonusObjective: "",
          bonusLeague: "",
          bonusValue: "",
        }));
      }
    },
    [bonuses, deleteBonusFromForm, editingBonusIndex, formValues, persistDraft],
  );

  // Isola as mutações assíncronas no hook especializado
  const actions = useRenewPlayerActions({
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
  });

  return {
    player,
    formValues,
    bonuses,
    editingBonusIndex,
    activeDrawerKey,
    proposalId,
    playerNegotiationStatus,
    setPlayerNegotiationStatus,
    handleInputChange,
    openDrawer,
    closeDrawer,
    handleCancelDrawer,
    handleSaveBonusDrawer,
    handleSaveSpecialClausesDrawer,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
    ...actions,
  };
};

export default useRenewPlayerForm;
