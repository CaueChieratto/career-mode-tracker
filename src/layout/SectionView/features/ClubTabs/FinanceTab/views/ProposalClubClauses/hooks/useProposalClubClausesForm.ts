import { useState, useEffect, useCallback } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { TransferProposal } from "../../../../../../../../common/interfaces/proposals/transferProposal";
import { TransferBonus } from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { BooleanValues, FormValues } from "../../../../SquadTab/views/TransferPlayer/types";
import { ProposalClubDrawerKey } from "../types";
import { formatTransferValue, parseValue } from "../../../../../../../../common/utils/FormatValue";
import { toast } from "../../../../../../../../common/services/ToastService";

interface UseProposalClubClausesFormParams {
  career: Career;
  season: ClubData;
  proposal: TransferProposal | null;
}

const isObjectiveAtingidoBonus = (b: { bonusCategory?: string; category?: string }) =>
  b.bonusCategory
    ? b.bonusCategory === "Objetivo atingido"
    : b.category === "objective";

export const useProposalClubClausesForm = ({
  career,
  season,
  proposal,
}: UseProposalClubClausesFormParams) => {
  void career;
  const [formValues, setFormValues] = useState<FormValues>({});
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
  const [bonuses, setBonuses] = useState<TransferBonus[]>([]);
  const [editingBonusIndex, setEditingBonusIndex] = useState<number | null>(null);
  const [activeDrawerKey, setActiveDrawerKey] = useState<ProposalClubDrawerKey>(null);
  const [drawerSnapshot, setDrawerSnapshot] = useState<{
    formValues: FormValues;
    booleanValues: BooleanValues;
    bonuses: TransferBonus[];
  } | null>(null);

  useEffect(() => {
    if (!proposal) return;

    const cNeg = proposal.clubNegotiation;
    const fState = proposal.formState?.formValues || {};
    const bState = proposal.formState?.booleanValues || {};

    const instTotal = cNeg?.installments
      ? cNeg.installments.annualInstallmentValue *
          cNeg.installments.totalInstallments +
        (cNeg.installments.upfrontValue || 0)
      : 0;
    const rawFee =
      cNeg?.transferFee ||
      instTotal ||
      parseValue(
        fState.buyValue || fState.sellValue || fState.transferFee || "",
      ) ||
      proposal.playerValue;
    const formattedFee =
      rawFee !== undefined && rawFee > 0 ? formatTransferValue(rawFee) : "";

    const isExit =
      proposal.type === "venda" || proposal.type === "emprestimo_saida";

    // Recompra / Revenda / Empréstimo de Volta
    const sellOnStr = cNeg?.sellOnPercentage
      ? `${cNeg.sellOnPercentage}%`
      : fState.sellOnPercentage || "Nenhum";
    const buybackStr = cNeg?.buybackValue
      ? formatTransferValue(cNeg.buybackValue)
      : fState.buybackValue || "";
    const loanBackStr = cNeg?.loanBackDuration
      ? `${cNeg.loanBackDuration} temporada${cNeg.loanBackDuration > 1 ? "s" : ""}`
      : fState.loanBackDuration || "Nenhum";

    // Parcelamento
    const inst = cNeg?.installments;
    const hasSavedInst = Boolean(
      inst &&
        inst.percentage &&
        inst.totalInstallments &&
        bState.hasInstallments !== false,
    );
    const instPct = inst?.percentage
      ? `${inst.percentage}% do total`
      : hasSavedInst && fState.installmentsPercentage && fState.installmentsPercentage !== "Sem parcelas"
        ? fState.installmentsPercentage
        : "Nenhum";
    const instYears = (instPct === "Nenhum" || instPct === "Sem parcelas" || !hasSavedInst)
      ? "Nenhum"
      : inst?.totalInstallments
        ? (inst.totalInstallments === 1 ? "1 Parcela" : `${inst.totalInstallments} Parcelas`)
        : fState.installmentsYears || "Nenhum";
    const instPaid =
      inst !== undefined
        ? String(Math.max(0, inst.totalInstallments - inst.remainingInstallments))
        : fState.paidInstallments || "0";

    // Troca
    const swapName = cNeg?.swapPlayer?.playerName || fState.swapPlayerName || "";
    const swapNum = cNeg?.swapPlayer?.playerValue ?? cNeg?.swapPlayer?.estimatedValue;
    const swapVal =
      swapNum !== undefined && swapNum > 0
        ? formatTransferValue(swapNum)
        : fState.swapPlayerValue || "";
    const swapPos = cNeg?.swapPlayer?.position || fState.swapPlayerPosition || "";
    const swapSec = cNeg?.swapPlayer?.sector || fState.swapPlayerSector || "";

    // Bônus
    if (cNeg?.bonuses && Array.isArray(cNeg.bonuses)) {
      setBonuses(cNeg.bonuses);
    } else {
      setBonuses([]);
    }

    // Empréstimo
    const loanBuyOpt = cNeg?.loanTerms?.buyOptionFee
      ? formatTransferValue(cNeg.loanTerms.buyOptionFee)
      : fState.buyOption || "";

    const initialFirstRefusal = Boolean(
      cNeg?.firstRefusal ?? bState.firstRefusal,
    );

    setFormValues({
      ...fState,
      timing: proposal.timing || fState.timing || "Imediata",
      sellValue: isExit ? formattedFee || fState.sellValue || "" : "",
      buyValue: !isExit ? formattedFee || fState.buyValue || "" : "",
      transferFee: formattedFee || fState.transferFee || "",
      toClub: cNeg?.partnerClub || fState.toClub || "",
      fromClub: cNeg?.partnerClub || fState.fromClub || "",
      sellOnPercentage: sellOnStr,
      buybackValue: buybackStr,
      loanBackDuration: loanBackStr,
      installmentsPercentage: instPct,
      installmentsYears: instYears,
      paidInstallments: instPaid,
      swapPlayerName: swapName,
      swapPlayerValue: swapVal,
      swapPlayerPosition: swapPos,
      swapPlayerSector: swapSec,
      buyOption: loanBuyOpt,
      firstRefusal: String(initialFirstRefusal),
      bonusCategory: "Objetivo atingido",
      bonusObjective: "",
      bonusLeague: "",
      bonusValue: "",
      bonusCount: "",
    });

    setBooleanValues({
      isRetirement: false,
      isEndContract: false,
      isReturnLoan: false,
      hasInstallments: Boolean(
        (cNeg?.installments || bState.hasInstallments) &&
          instPct !== "Nenhum" &&
          instPct !== "Sem parcelas",
      ),
      hasPlayerSwap: Boolean(
        cNeg?.swapPlayer?.playerName || bState.hasPlayerSwap,
      ),
      hasBonus: Boolean(
        (cNeg?.bonuses && cNeg.bonuses.length > 0) || bState.hasBonus,
      ),
      hasOtherClauses: Boolean(
        cNeg?.sellOnPercentage ||
          cNeg?.buybackValue ||
          initialFirstRefusal ||
          cNeg?.loanBackDuration ||
          bState.hasOtherClauses,
      ),
      firstRefusal: initialFirstRefusal,
      hasBuyOption: Boolean(
        cNeg?.loanTerms?.hasBuyOption ?? bState.hasBuyOption,
      ),
    });
  }, [proposal]);

  const handleInputChange = useCallback(
    (
      e:
        | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
        | { target: { name: string; value: string } },
      field?: { id: string },
    ) => {
      const fieldId = field?.id || e.target.name;
      const val = e.target.value;

      setFormValues((prev: FormValues) => {
        const next = { ...prev, [fieldId]: val };
        const isExit =
          proposal?.type === "venda" || proposal?.type === "emprestimo_saida";

        if (fieldId === "sellValue" || fieldId === "buyValue") {
          next.transferFee = val;
        }
        if (fieldId === "transferFee") {
          if (isExit) {
            next.sellValue = val;
          } else {
            next.buyValue = val;
          }
        }
        if (fieldId === "bonusCategory") {
          next.bonusObjective = "";
          next.bonusLeague = "";
        }
        if (fieldId === "installmentsPercentage") {
          if (val === "Sem parcelas" || val === "Nenhum") {
            next.installmentsPercentage = "Nenhum";
            next.installmentsYears = "Nenhum";
            setBooleanValues((bPrev) => ({ ...bPrev, hasInstallments: false }));
          } else if (val) {
            if (next.installmentsYears === "Nenhum" || !next.installmentsYears) {
              next.installmentsYears = "2 Parcelas";
            }
            setBooleanValues((bPrev) => ({ ...bPrev, hasInstallments: true }));
          }
        }
        if (fieldId === "installmentsYears") {
          if (val === "Nenhum") {
            next.installmentsPercentage = "Nenhum";
            setBooleanValues((bPrev) => ({ ...bPrev, hasInstallments: false }));
          }
        }
        if (fieldId === "swapPlayerName") {
          const isExit =
            proposal?.type === "venda" || proposal?.type === "emprestimo_saida";
          if (!isExit) {
            const foundPlayer = (season.players || []).find(
              (p) => p.name.trim().toLowerCase() === val.trim().toLowerCase(),
            );
            if (foundPlayer) {
              next.swapPlayerName = foundPlayer.name;
              next.swapPlayerValue = foundPlayer.playerValue
                ? formatTransferValue(foundPlayer.playerValue)
                : "";
              next.swapPlayerSector = foundPlayer.sector || "";
              next.swapPlayerPosition = foundPlayer.position || "";
              setBooleanValues((bPrev) => ({ ...bPrev, hasPlayerSwap: true }));
            } else if (!val.trim()) {
              next.swapPlayerName = "";
              next.swapPlayerValue = "";
              next.swapPlayerSector = "";
              next.swapPlayerPosition = "";
              setBooleanValues((bPrev) => ({ ...bPrev, hasPlayerSwap: false }));
            }
          }
        }
        return next;
      });
    },
    [proposal?.type, season.players],
  );

  const handleBooleanChange = useCallback((name: string, value: boolean) => {
    setBooleanValues((prev: BooleanValues) => ({ ...prev, [name]: value }));
    setFormValues((prev: FormValues) => ({ ...prev, [name]: String(value) }));
  }, []);

  const openDrawer = useCallback(
    (key: Exclude<ProposalClubDrawerKey, null>) => {
      setDrawerSnapshot({
        formValues: { ...formValues },
        booleanValues: { ...booleanValues },
        bonuses: [...bonuses],
      });
      if (key === "installments") {
        setFormValues((prev) => {
          const hasInst = booleanValues.hasInstallments;
          const currentPct = prev.installmentsPercentage;
          const currentYears = prev.installmentsYears;
          const isPctNone =
            !hasInst ||
            !currentPct ||
            currentPct === "Nenhum" ||
            currentPct === "Sem parcelas";

          return {
            ...prev,
            installmentsPercentage: isPctNone ? "Nenhum" : currentPct,
            installmentsYears: isPctNone ? "Nenhum" : (currentYears || "Nenhum"),
          };
        });
      }
      setActiveDrawerKey(key);
    },
    [formValues, booleanValues, bonuses],
  );

  const cancelDrawer = useCallback(() => {
    if (drawerSnapshot) {
      const snapHasObjective = (drawerSnapshot.bonuses || []).some(isObjectiveAtingidoBonus);
      setFormValues({
        ...drawerSnapshot.formValues,
        bonusCategory: snapHasObjective ? "Prêmio" : "Objetivo atingido",
        bonusObjective: "",
        bonusLeague: "",
        bonusValue: "",
        bonusCount: "",
      });
      setBooleanValues(drawerSnapshot.booleanValues);
      setBonuses(drawerSnapshot.bonuses);
    }
    setActiveDrawerKey(null);
    setEditingBonusIndex(null);
    setDrawerSnapshot(null);
  }, [drawerSnapshot]);

  const commitDrawer = useCallback(
    (key?: ProposalClubDrawerKey) => {
      const targetKey = key || activeDrawerKey;

      if (targetKey === "transferDetails") {
        const isExit =
          proposal?.type === "venda" || proposal?.type === "emprestimo_saida";
        const fee = isExit ? formValues.sellValue : formValues.buyValue;
        const timing = formValues.timing;
        setFormValues((prev) => ({
          ...prev,
          ...(fee ? { transferFee: fee, [isExit ? "sellValue" : "buyValue"]: fee } : {}),
          ...(timing ? { timing } : {}),
        }));
      } else if (targetKey === "installments") {
        const isWithoutInst =
          formValues.installmentsPercentage === "Sem parcelas" ||
          formValues.installmentsPercentage === "Nenhum" ||
          !formValues.installmentsPercentage ||
          formValues.installmentsYears === "Nenhum" ||
          !formValues.installmentsYears;
        const hasInst = !isWithoutInst;
        setBooleanValues((prev) => ({
          ...prev,
          hasInstallments: hasInst,
        }));
        if (!hasInst) {
          setFormValues((prev) => ({
            ...prev,
            installmentsPercentage: "Nenhum",
            installmentsYears: "Nenhum",
          }));
        }
      } else if (targetKey === "swap") {
        const hasSwap = Boolean(formValues.swapPlayerName?.trim());
        setBooleanValues((prev) => ({
          ...prev,
          hasPlayerSwap: hasSwap,
        }));
      } else if (targetKey === "bonus") {
        setBooleanValues((prev) => ({
          ...prev,
          hasBonus: bonuses.length > 0,
        }));
      } else if (targetKey === "other") {
        const isRefusal = Boolean(
          booleanValues.firstRefusal || formValues.firstRefusal === "true",
        );
        const hasOther = Boolean(
          (formValues.sellOnPercentage &&
            formValues.sellOnPercentage !== "Nenhum") ||
            Boolean(formValues.buybackValue?.trim()) ||
            isRefusal ||
            (formValues.loanBackDuration &&
              formValues.loanBackDuration !== "Nenhum"),
        );
        setBooleanValues((prev) => ({
          ...prev,
          firstRefusal: isRefusal,
          hasOtherClauses: hasOther,
        }));
        setFormValues((prev) => ({
          ...prev,
          firstRefusal: String(isRefusal),
        }));
      }

      setActiveDrawerKey(null);
      setEditingBonusIndex(null);
      setDrawerSnapshot(null);
    },
    [
      activeDrawerKey,
      formValues,
      booleanValues.firstRefusal,
      bonuses.length,
      proposal?.type,
    ],
  );

  const closeDrawer = cancelDrawer;

  const handleAddOrEditBonus = useCallback((): boolean => {
    const category = formValues.bonusCategory || "Objetivo atingido";
    const objective = (formValues.bonusObjective || "").trim();
    const targetLeague = (formValues.bonusLeague || "").trim();
    const bonusVal = (formValues.bonusValue || "").trim();
    const bonusCountStr = (formValues.bonusCount || "").trim();

    if (!objective) {
      toast.warning("Por favor, selecione ou informe o objetivo do bônus.");
      return false;
    }

    let countNum: number | undefined;
    if (category === "Desempenho") {
      countNum = parseInt(bonusCountStr, 10);
      if (isNaN(countNum) || countNum < 1 || countNum > 100) {
        toast.warning(
          "A contagem de desempenho do bônus deve ser entre 1 e 100.",
        );
        return false;
      }
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

    const isExit =
      proposal?.type === "venda" || proposal?.type === "emprestimo_saida";

    const bonusCatType: "objective" | "award" | "performance" =
      category === "Prêmio"
        ? "award"
        : category === "Desempenho"
          ? "performance"
          : "objective";

    const updatedBonus: TransferBonus = {
      id:
        editingBonusIndex !== null && bonuses[editingBonusIndex]?.id
          ? bonuses[editingBonusIndex].id
          : `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      direction: isExit ? "receivable" : "payable",
      category: bonusCatType,
      bonusCategory: category as "Objetivo atingido" | "Prêmio" | "Desempenho",
      partnerClub: proposal?.clubNegotiation?.partnerClub || "",
      name: objective,
      bonusTarget: objective,
      targetObjective: objective,
      ...(category === "Objetivo atingido" && targetLeague
        ? { targetLeague }
        : {}),
      description: objective,
      value: parseValue(bonusVal),
      status: "pending",
      bonusOrigin: "club",
      ...(category === "Desempenho"
        ? {
            metricTarget: countNum,
            targetCount: countNum,
            metric:
              objective === "Partidas"
                ? "matches"
                : objective === "Gols marcados"
                  ? "goals"
                  : objective === "Assistências"
                    ? "assists"
                    : objective === "Partidas sem sofrer gols"
                      ? "cleanSheets"
                      : undefined,
          }
        : {}),
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
    const nextDefaultCategory = nextHasObjective ? "Prêmio" : "Objetivo atingido";

    setFormValues((prev: FormValues) => ({
      ...prev,
      bonusCategory: nextDefaultCategory,
      bonusObjective: "",
      bonusLeague: "",
      bonusValue: "",
      bonusCount: "",
    }));
    return true;
  }, [formValues, bonuses, editingBonusIndex, proposal]);

  const handleEditBonus = useCallback(
    (index: number) => {
      const b = bonuses[index];
      if (!b) return;
      setEditingBonusIndex(index);
      const countVal = b.targetCount ?? b.metricTarget;
      setFormValues((prev: FormValues) => ({
        ...prev,
        bonusCategory:
          b.bonusCategory === "Desempenho" || b.category === "performance"
            ? "Desempenho"
            : b.bonusCategory === "Prêmio"
              ? "Prêmio"
              : "Objetivo atingido",
        bonusObjective: b.bonusTarget || b.name || "",
        bonusLeague: b.targetLeague || "",
        bonusValue: formatTransferValue(b.value),
        bonusCount: countVal !== undefined ? String(countVal) : "",
      }));
    },
    [bonuses],
  );

  const handleDeleteBonus = useCallback((index: number) => {
    setBonuses((prev) => prev.filter((_, idx) => idx !== index));
    if (editingBonusIndex === index) {
      setEditingBonusIndex(null);
    }
  }, [editingBonusIndex]);

  return {
    formValues,
    setFormValues,
    booleanValues,
    setBooleanValues,
    bonuses,
    setBonuses,
    editingBonusIndex,
    activeDrawerKey,
    openDrawer,
    closeDrawer,
    cancelDrawer,
    commitDrawer,
    handleInputChange,
    handleBooleanChange,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
  };
};
