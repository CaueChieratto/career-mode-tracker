import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { SectionScreen } from "../../../../../config/screens";
import { ServiceProposals } from "../../../../../../../common/services/ServiceProposals";
import {
  TransferProposal,
  PlayerNegotiationStage,
} from "../../../../../../../common/interfaces/proposals/transferProposal";
import { TransferBonus } from "../../../../../../../common/interfaces/playersInfo/transferTerms";
import { WageAdjustmentClause } from "../../../../../../../common/interfaces/playersInfo/contractClauses";
import { toast } from "../../../../../../../common/services/ToastService";
import { calculateOverallProposalStatus } from "../../../../../../../common/helpers/proposals/proposalStatusHelper";
import { useClubColors } from "../../../../../../../common/hooks/Colors/UseClubColors";
import Load from "../../../../../../../components/Load";
import { Field } from "../../../../../../../components/FormSection";
import { PlayerTermsEditorView } from "../../components/PlayerTermsEditorView";
import {
  buildRenewalBonusSection,
  buildRenewalSpecialClausesSection,
} from "../../../SquadTab/views/RenewPlayer/constants/buildRenewalFormSections";
import {
  RenewalFormValues,
} from "../../../SquadTab/views/RenewPlayer/types";
import { formatDateInput } from "../../../../../../../common/utils/Date";
import {
  calculateContractUntilFromYears,
  getPlayerOriginalContractYears,
} from "../../../../../../../common/utils/calculateContractYears";
import {
  parseValue,
  formatDisplayValue,
} from "../../../../../../../common/utils/FormatValue";
import { buildProposalContractSection } from "./constants/buildProposalContractSection";

export interface ProposalPlayerTermsProps {
  career: Career;
  season: ClubData;
  proposalId: string;
  onClose: () => void;
  onOpenScreen?: (screen: SectionScreen) => void;
}

export interface ProposalPlayerTermsFormValues extends RenewalFormValues {
  agentFee?: string;
  [key: string]: string | undefined;
}

const isObjectiveAtingidoBonus = (b: { bonusCategory?: string; category?: string }) =>
  b.bonusCategory
    ? b.bonusCategory === "Objetivo atingido"
    : b.category === "objective";

export const ProposalPlayerTerms: React.FC<ProposalPlayerTermsProps> = ({
  career,
  season,
  proposalId,
  onClose,
  onOpenScreen,
}) => {
  const { clubColor } = useClubColors(career.colorsTeams?.[0] || "#000000");

  const [proposal, setProposal] = useState<TransferProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formValues, setFormValues] = useState<ProposalPlayerTermsFormValues>({
    salary: "",
    contractTime: "1",
    contractUntil: "",
    signingBonus: "",
    agentFee: "",
    releaseClause: "",
    wageAdjustmentType: "N/D",
    wageAdjustmentObjective: "",
    wageAdjustmentLeague: "",
    wageAdjustmentPercentage: "5%",
    bonusCategory: "Objetivo atingido",
    bonusObjective: "",
    bonusLeague: "",
    bonusValue: "",
  });

  const [bonuses, setBonuses] = useState<TransferBonus[]>([]);
  const [editingBonusIndex, setEditingBonusIndex] = useState<number | null>(
    null,
  );
  const [activeDrawerKey, setActiveDrawerKey] =
    useState<"contract" | "bonuses" | "special" | null>(null);
  const [drawerSnapshot, setDrawerSnapshot] = useState<{
    bonuses: TransferBonus[];
    formValues: ProposalPlayerTermsFormValues;
  } | null>(null);

  const playerInSeason = useMemo(
    () => (season.players || []).find((p) => p.id === proposal?.playerId),
    [season.players, proposal?.playerId],
  );

  const originalYears = useMemo(() => {
    if (!playerInSeason) return 0;
    return getPlayerOriginalContractYears(
      playerInSeason,
      career.createdAt,
      season.seasonNumber,
      career.nation,
    );
  }, [playerInSeason, career.createdAt, season.seasonNumber, career.nation]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    ServiceProposals.getProposalById(career.id, season.id, proposalId)
      .then((data) => {
        if (!isMounted) return;
        if (!data) {
          toast.error("Proposta não encontrada.");
          onClose();
          return;
        }
        setProposal(data);

        const pNeg = data.playerNegotiation;
        const fState = data.formState?.formValues;

        if (
          pNeg?.performanceBonuses &&
          Array.isArray(pNeg.performanceBonuses)
        ) {
          setBonuses(pNeg.performanceBonuses);
        }

        const isRenewal = data.type === "renovacao";
        const foundPlayer = (season.players || []).find(
          (p) => p.id === data.playerId,
        );
        const origYears = foundPlayer
          ? getPlayerOriginalContractYears(
              foundPlayer,
              career.createdAt,
              season.seasonNumber,
              career.nation,
            )
          : 0;

        let durationYears: string;
        if (isRenewal) {
          if (fState?.contractTime !== undefined && fState.contractTime !== "") {
            durationYears = fState.contractTime;
          } else if (pNeg?.durationYears !== undefined && origYears > 0) {
            durationYears = String(Math.max(0, pNeg.durationYears - origYears));
          } else {
            durationYears = "0";
          }
        } else {
          durationYears =
            fState?.contractTime ||
            (pNeg?.durationYears ? String(pNeg.durationYears) : "1");
        }

        const extNum = parseInt(durationYears, 10);
        const totalDuration = isRenewal
          ? Math.max(1, origYears + (isNaN(extNum) ? 0 : Math.max(0, extNum)))
          : Math.max(1, isNaN(extNum) ? 1 : extNum);

        const calculatedContractUntil =
          fState?.contractUntil ||
          pNeg?.contractUntil ||
          calculateContractUntilFromYears(
            totalDuration,
            career.createdAt,
            season.seasonNumber,
            career.nation,
          );

        setFormValues({
          salary:
            fState?.salary ||
            (pNeg?.weeklyWage
              ? formatDisplayValue(pNeg.weeklyWage, career.currency)
              : ""),
          contractTime: durationYears,
          contractUntil: calculatedContractUntil,
          signingBonus:
            fState?.signingBonus ||
            (pNeg?.signingBonus
              ? formatDisplayValue(pNeg.signingBonus, career.currency)
              : ""),
          agentFee:
            fState?.agentFee ||
            (pNeg?.agentFee
              ? formatDisplayValue(pNeg.agentFee, career.currency)
              : ""),
          releaseClause:
            fState?.releaseClause ||
            (pNeg?.releaseClause
              ? formatDisplayValue(pNeg.releaseClause, career.currency)
              : ""),
          wageAdjustmentType:
            fState?.wageAdjustmentType ||
            pNeg?.wageAdjustment?.direction ||
            (pNeg?.wageAdjustment?.percentage ? "Aumentar" : "N/D"),
          wageAdjustmentObjective:
            fState?.wageAdjustmentObjective ||
            pNeg?.wageAdjustment?.targetObjective ||
            "",
          wageAdjustmentLeague:
            fState?.wageAdjustmentLeague ||
            pNeg?.wageAdjustment?.targetLeague ||
            "",
          wageAdjustmentPercentage:
            fState?.wageAdjustmentPercentage ||
            (pNeg?.wageAdjustment?.percentage
              ? `${pNeg.wageAdjustment.percentage}%`
              : "5%"),
          bonusCategory: "Objetivo atingido",
          bonusObjective: "",
          bonusLeague: "",
          bonusValue: "",
        });
      })
      .catch((err) => {
        console.error("Erro ao carregar proposta:", err);
        toast.error("Erro ao carregar proposta.");
        onClose();
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    career.id,
    career.createdAt,
    career.nation,
    career.currency,
    season.id,
    season.seasonNumber,
    season.players,
    proposalId,
    onClose,
  ]);

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
        const isRenewal = proposal?.type === "renovacao";
        const hasExtension = !isNaN(num) && num >= 0;
        const totalYears = isRenewal
          ? (hasExtension ? originalYears + num : 0)
          : (!isNaN(num) && num > 0 ? num : 0);
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
    [career.createdAt, career.nation, season.seasonNumber, originalYears, proposal?.type],
  );

  const openDrawer = useCallback(
    (key: "contract" | "bonuses" | "special") => {
      setDrawerSnapshot({
        bonuses: [...bonuses],
        formValues: { ...formValues },
      });
      setActiveDrawerKey(key);
    },
    [bonuses, formValues],
  );

  const handleCancelDrawer = useCallback(() => {
    if (drawerSnapshot) {
      const snapHasObjective = (drawerSnapshot.bonuses || []).some(isObjectiveAtingidoBonus);
      setBonuses(drawerSnapshot.bonuses);
      setFormValues({
        ...drawerSnapshot.formValues,
        bonusCategory: snapHasObjective ? "Desempenho" : "Objetivo atingido",
        bonusObjective: "",
        bonusLeague: "",
        bonusValue: "",
      });
    }
    setActiveDrawerKey(null);
    setEditingBonusIndex(null);
    setDrawerSnapshot(null);
  }, [drawerSnapshot]);

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
        toast.warning(
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

    let nextBonuses: TransferBonus[];
    if (editingBonusIndex !== null) {
      nextBonuses = [...bonuses];
      nextBonuses[editingBonusIndex] = updatedBonus;
      setBonuses(nextBonuses);
      setEditingBonusIndex(null);
    } else {
      nextBonuses = [...bonuses, updatedBonus];
      setBonuses(nextBonuses);
    }

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
  }, [formValues, bonuses, editingBonusIndex]);

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
          toast.warning(
            "O bônus de 'Objetivo atingido' só pode ser adicionado uma única vez.",
          );
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
        bonusOrigin: "player",
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
  }, [bonuses, editingBonusIndex, formValues]);

  const handleSaveSpecialClausesDrawer = useCallback(() => {
    const isWageAdjActive =
      formValues.wageAdjustmentType === "Aumentar" ||
      formValues.wageAdjustmentType === "Diminuir";

    if (isWageAdjActive && !formValues.wageAdjustmentObjective?.trim()) {
      toast.warning(
        "Por favor, selecione um critério para o ajuste automático de salário.",
      );
      return;
    }

    setActiveDrawerKey(null);
    setDrawerSnapshot(null);
  }, [formValues]);

  const handleEditBonus = useCallback(
    (index: number) => {
      const b = bonuses[index];
      if (!b) return;
      setEditingBonusIndex(index);
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
    [bonuses, career.currency],
  );

  const handleDeleteBonus = useCallback((index: number) => {
    setBonuses((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  const handleSaveTerms = async () => {
    if (!proposal) return;

    const rawSalary = parseValue(formValues.salary || "0");
    if (!formValues.salary || rawSalary <= 0) {
      toast.warning("Por favor, informe o salário semanal do atleta.");
      return;
    }

    setIsSaving(true);
    try {
      const isRenewal = proposal.type === "renovacao";
      const rawExt = formValues.contractTime;
      const parsedNum =
        rawExt !== undefined && rawExt !== "" ? parseInt(rawExt, 10) : NaN;
      const extensionNum = !isNaN(parsedNum) && parsedNum >= 0 ? parsedNum : 0;
      const calculatedDuration = isRenewal
        ? Math.max(1, originalYears + extensionNum)
        : Math.max(1, parseInt(formValues.contractTime || "1", 10) || 1);

      const calculatedContractUntil =
        calculateContractUntilFromYears(
          calculatedDuration,
          career.createdAt,
          season.seasonNumber,
          career.nation,
        ) || formValues.contractUntil;

      const rawSigningBonus = formValues.signingBonus
        ? parseValue(formValues.signingBonus)
        : undefined;
      const rawAgentFee = formValues.agentFee
        ? parseValue(formValues.agentFee)
        : undefined;
      const rawReleaseClause = formValues.releaseClause
        ? parseValue(formValues.releaseClause)
        : undefined;

      let wageAdjustment: WageAdjustmentClause | undefined = undefined;
      if (
        formValues.wageAdjustmentType === "Aumentar" ||
        formValues.wageAdjustmentType === "Diminuir"
      ) {
        const pctNum =
          parseInt(
            formValues.wageAdjustmentPercentage?.replace("%", "") || "5",
            10,
          ) || 5;
        wageAdjustment = {
          enabled: true,
          direction: formValues.wageAdjustmentType as "Aumentar" | "Diminuir",
          targetObjective: formValues.wageAdjustmentObjective || "",
          targetLeague: formValues.wageAdjustmentLeague || undefined,
          percentage: pctNum,
          status: "Pendente",
        };
      }

      const playerBonusesWithOrigin = bonuses.map((b) => ({
        ...b,
        bonusOrigin: "player" as const,
      }));

      const playerStage: PlayerNegotiationStage = {
        status: "aceita",
        weeklyWage: rawSalary,
        durationYears: calculatedDuration,
        contractUntil: calculatedContractUntil || undefined,
        squadRole: proposal.playerNegotiation?.squadRole || "Rodízio",
        signingBonus:
          rawSigningBonus && rawSigningBonus > 0 ? rawSigningBonus : undefined,
        agentFee:
          proposal.originLoanBuyOption || isRenewal
            ? undefined
            : rawAgentFee && rawAgentFee > 0
              ? rawAgentFee
              : undefined,
        releaseClause:
          rawReleaseClause && rawReleaseClause > 0
            ? rawReleaseClause
            : undefined,
        wageAdjustment,
        performanceBonuses:
          playerBonusesWithOrigin.length > 0
            ? playerBonusesWithOrigin
            : undefined,
      };

      const updatedFormValues: Record<string, string> = {
        ...(proposal.formState?.formValues || {}),
        salary: formValues.salary || "",
        contractTime: formValues.contractTime || (isRenewal ? "0" : "1"),
        contractUntil:
          calculatedContractUntil || formValues.contractUntil || "",
        signingBonus: formValues.signingBonus || "",
        agentFee:
          proposal.originLoanBuyOption || isRenewal
            ? ""
            : formValues.agentFee || "",
        releaseClause: formValues.releaseClause || "",
        wageAdjustmentType: formValues.wageAdjustmentType || "N/D",
        wageAdjustmentObjective: formValues.wageAdjustmentObjective || "",
        wageAdjustmentLeague: formValues.wageAdjustmentLeague || "",
        wageAdjustmentPercentage: formValues.wageAdjustmentPercentage || "5%",
      };

      const updatedFormState = {
        formValues: updatedFormValues,
        booleanValues: {
          ...(proposal.formState?.booleanValues || {}),
        },
      };

      const updatedOverall = calculateOverallProposalStatus({
        type: proposal.type,
        clubNegotiation: proposal.clubNegotiation,
        playerNegotiation: playerStage,
      });

      await ServiceProposals.updateProposal(career.id, season.id, proposal.id, {
        playerNegotiation: playerStage,
        formState: updatedFormState,
        overallStatus: updatedOverall,
      });

      toast.success("Termos do atleta salvos com sucesso!");
      onClose();
      if (onOpenScreen) {
        onOpenScreen({
          key: "manageClauses",
          initialTab:
            proposal.type === "renovacao"
              ? "renewals"
              : proposal.type === "venda"
                ? "exit"
                : "arrivals",
          selectedPlayerName: proposal.playerName,
          selectedProposalId: proposal.id,
        });
      }
    } catch (err) {
      console.error("Erro ao salvar termos do atleta:", err);
      toast.error("Erro ao salvar termos do atleta.");
    } finally {
      setIsSaving(false);
    }
  };

  const contractSection = useMemo(
    () =>
      buildProposalContractSection({
        hideAgentFee: Boolean(
          proposal?.originLoanBuyOption || proposal?.type === "renovacao",
        ),
        isRenewal: proposal?.type === "renovacao",
      }),
    [proposal?.originLoanBuyOption, proposal?.type],
  );

  const bonusSection = useMemo(
    () =>
      buildRenewalBonusSection(
        bonuses,
        editingBonusIndex,
        formValues,
        career.customBonusObjectives,
        false,
        career.nation,
      ),
    [
      bonuses,
      editingBonusIndex,
      formValues,
      career.customBonusObjectives,
      career.nation,
    ],
  );

  const specialSection = useMemo(
    () =>
      buildRenewalSpecialClausesSection(
        formValues,
        career.customBonusObjectives,
        false,
        career.nation,
      ),
    [formValues, career.customBonusObjectives, career.nation],
  );

  if (isLoading || !proposal) {
    return <Load isTransfers />;
  }

  const isSwapOnSale =
    proposal.type === "venda" &&
    Boolean(proposal.clubNegotiation?.swapPlayer?.playerName);
  const swapPlayer = isSwapOnSale
    ? proposal.clubNegotiation?.swapPlayer
    : undefined;

  const playerAdapter: Partial<Players> = {
    name: swapPlayer?.playerName || proposal.playerName,
    shirtNumber: swapPlayer ? undefined : proposal.shirtNumber,
    position: swapPlayer?.position || proposal.playerPosition,
    overall: swapPlayer?.overall || proposal.playerOverall,
    age: swapPlayer?.age || proposal.playerAge,
  };

  return (
    <PlayerTermsEditorView
      career={career}
      player={playerAdapter as Players}
      isSaving={isSaving}
      clubColor={clubColor}
      formValues={formValues}
      bonuses={bonuses}
      editingBonusIndex={editingBonusIndex}
      activeDrawerKey={activeDrawerKey}
      contractSection={contractSection}
      bonusSection={bonusSection}
      specialSection={specialSection}
      gridMode="renewal"
      gridDirection="renewals"
      openDrawer={openDrawer}
      onSaveContractDrawer={() => {
        setActiveDrawerKey(null);
        setDrawerSnapshot(null);
      }}
      onCancelContractDrawer={() => {
        setActiveDrawerKey(null);
        setDrawerSnapshot(null);
      }}
      onSaveBonusDrawer={handleSaveBonusDrawer}
      onCancelBonusDrawer={handleCancelDrawer}
      onSaveSpecialDrawer={handleSaveSpecialClausesDrawer}
      onCancelSpecialDrawer={handleCancelDrawer}
      handleInputChange={handleInputChange}
      handleAddOrEditBonus={handleAddOrEditBonus}
      handleEditBonus={handleEditBonus}
      handleDeleteBonus={handleDeleteBonus}
      onSave={handleSaveTerms}
      onBack={onClose}
    />
  );
};

export default ProposalPlayerTerms;
