import React, { useState } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import {
  TransferItem,
  DrawerSection,
  ActiveInlineState,
  ClauseEditScope,
} from "../types";
import {
  TransferBonus,
  TransferClauses,
  PlayerSwapTerm,
  TransferInstallments,
  createTransferInstallments,
  TransferTiming,
} from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { PlayersContractService } from "../../../../../../../../common/services/ServicePlayers/PlayersContractService";
import { ServiceFinance } from "../../../../../../../../common/services/ServiceFinance";
import {
  parseValue,
  formatTransferValue,
} from "../../../../../../../../common/utils/FormatValue";
import {
  calculateContractYears,
  calculateContractUntilFromYears,
  getPlayerOriginalContractYears,
} from "../../../../../../../../common/utils/calculateContractYears";
import {
  WageAdjustmentClause,
  ContractDetails,
  SquadRole,
} from "../../../../../../../../common/interfaces/playersInfo/contractClauses";
import {
  BooleanValues,
  FormValues,
} from "../../../../SquadTab/views/TransferPlayer/types";
import { useTransferBonusesDraft } from "../../../../SquadTab/views/TransferPlayer/hooks/useTransferBonusesDraft";
import {
  safeScrollToTop,
  getContractFormattedDate,
} from "../helpers/manageClausesFormatters";
import {
  resolveContractPlayerClauses,
  splitClubAndPlayerBonuses,
} from "../../../../../../../../common/helpers/contractPlayerClauses";
import { ServiceProposals } from "../../../../../../../../common/services/ServiceProposals";
import { NavigationSessionStore } from "../../../../../../../../common/services/NavigationSessionStore";
import {
  TransferProposal,
  ClubNegotiationStage,
} from "../../../../../../../../common/interfaces/proposals/transferProposal";
import {
  isObjectiveBonus,
  checkIsFromLoanBuyOption,
  checkIsIncomingSwapArrival,
  shouldChooseArrivalScope,
  buildPlayerTermsInitialState,
  buildClubClausesInitialState,
} from "../helpers/clauseEditHelpers";

export interface UseManageClausesInlineActionsProps {
  career: Career;
  season: ClubData;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setLocalVersion: React.Dispatch<React.SetStateAction<number>>;
  readOnly?: boolean;
  activeTab?: "renewals" | "arrivals" | "exit";
  activeInline: ActiveInlineState | null;
  setActiveInline: React.Dispatch<
    React.SetStateAction<ActiveInlineState | null>
  >;
  activeProposal: TransferProposal | null;
  setActiveProposal: React.Dispatch<
    React.SetStateAction<TransferProposal | null>
  >;
  setLoanBuyOptionDateInput: React.Dispatch<React.SetStateAction<string>>;
  setHighlightedCardKey: React.Dispatch<React.SetStateAction<string | null>>;
  lastClickedCardKeyRef: React.MutableRefObject<string | null>;
  isMountedRef: React.MutableRefObject<boolean>;
  drawerSnapshotRef: React.MutableRefObject<{
    values: FormValues;
    booleans: BooleanValues;
    bonuses: TransferBonus[];
    bonusItemIndex: number | null;
  } | null>;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showSuccess: (message: string) => void;
}

export const useManageClausesInlineActions = ({
  career,
  season,
  setIsLoading,
  setLocalVersion,
  readOnly = false,
  activeTab = "renewals",
  activeInline,
  setActiveInline,
  activeProposal,
  setActiveProposal,
  setLoanBuyOptionDateInput,
  setHighlightedCardKey,
  lastClickedCardKeyRef,
  isMountedRef,
  drawerSnapshotRef,
  showError,
  showWarning,
  showSuccess,
}: UseManageClausesInlineActionsProps) => {
  const [editingValues, setEditingValues] = useState<FormValues>({});
  const [editingTransferItem, setEditingTransferItem] =
    useState<TransferItem | null>(null);
  const [editingBooleans, setEditingBooleans] = useState<BooleanValues>({
    isRetirement: false,
    isEndContract: false,
    isReturnLoan: false,
    hasInstallments: false,
    hasPlayerSwap: false,
    hasBonus: false,
    hasOtherClauses: false,
    firstRefusal: false,
  });
  const [activeSectionDrawer, setActiveSectionDrawer] =
    useState<DrawerSection>(null);

  const isPlayerScope =
    activeInline?.scope === "player" ||
    activeTab === "renewals" ||
    Boolean(
      activeInline?.cardKey && activeInline.cardKey.endsWith("_renewals"),
    );

  const isPlayerOrRenewalDrawer =
    isPlayerScope || activeSectionDrawer === "playerBonus";

  const {
    bonuses: editingBonuses,
    editingBonusIndex: editingBonusItemIndex,
    setBonuses: setEditingBonuses,
    setEditingBonusIndex: setEditingBonusItemIndex,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
  } = useTransferBonusesDraft<FormValues>({
    formValues: editingValues,
    setFormValues: setEditingValues,
    getDirection: () =>
      isPlayerScope
        ? "payable"
        : activeTab === "exit" ||
            editingTransferItem?.direction === "exit" ||
            activeProposal?.type === "venda" ||
            activeProposal?.type === "emprestimo_saida"
          ? "receivable"
          : "payable",
    getPartnerClub: () =>
      isPlayerOrRenewalDrawer
        ? ""
        : activeTab === "arrivals" ||
            editingTransferItem?.direction === "arrivals"
          ? editingValues.fromClub || editingValues.toClub || "Clube Vendedor"
          : editingValues.toClub || "",
    requireValueSuffix: false,
    validateSingleObjective: true,
    hasPerformanceCountInput: !isPlayerOrRenewalDrawer,
    includeBonusStatus: !activeProposal,
    getNextCategoryAfterSave: (nextHasObjective) =>
      nextHasObjective
        ? isPlayerOrRenewalDrawer
          ? "Desempenho"
          : "Prêmio"
        : "Objetivo atingido",
    clearFormOnDeleteEditing: false,
    onWarning: showWarning,
  });

  const handleOpenSectionDrawer = (drawer: Exclude<DrawerSection, null>) => {
    drawerSnapshotRef.current = {
      values: { ...editingValues },
      booleans: { ...editingBooleans },
      bonuses: [...editingBonuses],
      bonusItemIndex: editingBonusItemIndex,
    };

    if (drawer === "installments") {
      setEditingValues((prev) => {
        const hasInst = editingBooleans.hasInstallments;
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
          installmentsYears: isPctNone ? "Nenhum" : currentYears || "Nenhum",
        };
      });
    } else if (drawer === "swap") {
      setEditingBooleans((prev: BooleanValues) => ({
        ...prev,
        hasPlayerSwap: Boolean(editingValues.swapPlayerName?.trim()),
      }));
    }

    setActiveSectionDrawer(drawer);
  };

  const handleCancelSectionDrawer = () => {
    if (drawerSnapshotRef.current) {
      const snap = drawerSnapshotRef.current;
      const snapHasObjective = snap.bonuses.some(isObjectiveBonus);
      setEditingValues({
        ...snap.values,
        bonusCategory: snapHasObjective
          ? isPlayerOrRenewalDrawer
            ? "Desempenho"
            : "Prêmio"
          : "Objetivo atingido",
        bonusObjective: "",
        bonusLeague: "",
        bonusValue: "",
        bonusCount: "",
      });
      setEditingBooleans(snap.booleans);
      setEditingBonuses(snap.bonuses);
      setEditingBonusItemIndex(snap.bonusItemIndex);
      drawerSnapshotRef.current = null;
    }
    setActiveSectionDrawer(null);
  };

  const handleCommitSectionDrawer = (drawer?: DrawerSection) => {
    const targetKey = drawer || activeSectionDrawer;

    if (targetKey === "transferDetails") {
      const isExit =
        editingTransferItem?.direction === "exit" ||
        activeProposal?.type === "venda" ||
        activeProposal?.type === "emprestimo_saida";
      const fee = isExit ? editingValues.sellValue : editingValues.buyValue;
      const timing = editingValues.timing;
      setEditingValues((prev) => ({
        ...prev,
        ...(fee !== undefined
          ? { transferFee: fee, [isExit ? "sellValue" : "buyValue"]: fee }
          : {}),
        ...(timing ? { timing } : {}),
      }));
    } else if (targetKey === "installments") {
      const isWithoutInst =
        editingValues.installmentsPercentage === "Sem parcelas" ||
        editingValues.installmentsPercentage === "Nenhum" ||
        !editingValues.installmentsPercentage ||
        editingValues.installmentsYears === "Nenhum" ||
        !editingValues.installmentsYears;
      const hasInst = !isWithoutInst;
      setEditingBooleans((prev) => ({ ...prev, hasInstallments: hasInst }));
      if (!hasInst) {
        setEditingValues((prev) => ({
          ...prev,
          installmentsPercentage: "Nenhum",
          installmentsYears: "Nenhum",
        }));
      }
    } else if (targetKey === "swap") {
      const hasSwap = Boolean(editingValues.swapPlayerName?.trim());
      setEditingBooleans((prev) => ({ ...prev, hasPlayerSwap: hasSwap }));
    } else if (targetKey === "bonus" || targetKey === "playerBonus") {
      const objective = (editingValues.bonusObjective || "").trim();
      const bonusVal = (editingValues.bonusValue || "").trim();
      if (objective || bonusVal || editingBonusItemIndex !== null) {
        const added = handleAddOrEditBonus();
        if (!added) return;
      }
      setEditingBooleans((prev) => ({
        ...prev,
        hasBonus: editingBonuses.length > 0 || Boolean(objective && bonusVal),
      }));
    } else if (targetKey === "playerOther") {
      const isWageAdjActive =
        editingValues.wageAdjustmentType === "Aumentar" ||
        editingValues.wageAdjustmentType === "Diminuir";
      if (isWageAdjActive && !editingValues.wageAdjustmentObjective?.trim()) {
        showWarning(
          "Por favor, selecione um critério para o ajuste automático de salário.",
        );
        return;
      }
      setEditingBooleans((prev) => ({
        ...prev,
        hasOtherClauses: Boolean(
          editingValues.releaseClause?.trim() || isWageAdjActive,
        ),
      }));
    } else if (targetKey === "other") {
      const isRefusal = Boolean(
        editingBooleans.firstRefusal || editingValues.firstRefusal === "true",
      );
      const hasOther = Boolean(
        (editingValues.sellOnPercentage &&
          editingValues.sellOnPercentage !== "Nenhum") ||
        Boolean(editingValues.buybackValue?.trim()) ||
        isRefusal ||
        (editingValues.loanBackDuration &&
          editingValues.loanBackDuration !== "Nenhum"),
      );
      setEditingBooleans((prev) => ({
        ...prev,
        firstRefusal: isRefusal,
        hasOtherClauses: hasOther,
      }));
      setEditingValues((prev) => ({
        ...prev,
        firstRefusal: String(isRefusal),
      }));
    }

    drawerSnapshotRef.current = null;
    setEditingBonusItemIndex(null);
    setActiveSectionDrawer(null);
  };

  const startEditCardWithScope = (
    item: TransferItem,
    scope: ClauseEditScope,
    returnToChooseScope = false,
  ) => {
    drawerSnapshotRef.current = null;
    setActiveProposal(null);
    setEditingTransferItem(item);
    const cardKey = `${item.player.id}_${item.contractIndex}_${item.direction}`;
    lastClickedCardKeyRef.current = cardKey;

    const isPassesLivres =
      item.direction === "arrivals" &&
      (item.contract.fromClub?.trim().toLowerCase() === "passes livres" ||
        item.contract.fromClub?.trim().toLowerCase() === "passe livre");
    const resolvedScope: ClauseEditScope =
      isPassesLivres && scope === "club" ? "player" : scope;

    const initial =
      resolvedScope === "player"
        ? buildPlayerTermsInitialState(item, career, season)
        : buildClubClausesInitialState(item, season);

    setEditingValues(initial.values);
    setEditingBooleans(initial.booleans);
    setEditingBonuses(initial.bonuses);
    setEditingBonusItemIndex(null);
    setActiveSectionDrawer(null);
    setActiveInline({ cardKey, mode: "edit", scope: resolvedScope, returnToChooseScope });
    safeScrollToTop();
  };

  const startEditCard = (item: TransferItem) => {
    if (shouldChooseArrivalScope(item)) {
      drawerSnapshotRef.current = null;
      setActiveProposal(null);
      setEditingTransferItem(item);
      const cardKey = `${item.player.id}_${item.contractIndex}_${item.direction}`;
      lastClickedCardKeyRef.current = cardKey;
      setActiveSectionDrawer(null);
      setActiveInline({ cardKey, mode: "chooseScope" });
      safeScrollToTop();
      return;
    }

    const scope: ClauseEditScope =
      item.direction === "renewals" ||
      checkIsFromLoanBuyOption(item) ||
      checkIsIncomingSwapArrival(item)
        ? "player"
        : "club";

    startEditCardWithScope(item, scope, false);
  };

  const startEditProposalClub = (proposal: TransferProposal) => {
    drawerSnapshotRef.current = null;
    lastClickedCardKeyRef.current = proposal.id;
    setActiveProposal(proposal);

    const feeValue =
      proposal.clubNegotiation?.transferFee ??
      proposal.clubNegotiation?.loanTerms?.buyOptionFee ??
      proposal.playerValue ??
      0;
    const partner = proposal.clubNegotiation?.partnerClub || "";
    const isExit =
      proposal.type === "venda" || proposal.type === "emprestimo_saida";

    const loanDurationStr =
      proposal.clubNegotiation?.loanBackDuration === 1
        ? "1 temporada"
        : proposal.clubNegotiation?.loanBackDuration === 2
          ? "2 temporadas"
          : "Nenhum";

    const totalInst =
      proposal.clubNegotiation?.installments?.totalInstallments || 2;
    const remainingInst =
      proposal.clubNegotiation?.installments?.remainingInstallments ??
      totalInst;
    const paidInst = Math.max(0, totalInst - remainingInst);
    const paidInstStr =
      paidInst === 0
        ? "0 parcelas pagas"
        : paidInst === totalInst
          ? `${paidInst} parcelas pagas (Quitado)`
          : `${paidInst} ${paidInst === 1 ? "parcela paga" : "parcelas pagas"}`;

    const feeFormatted =
      feeValue > 0 ? formatTransferValue(feeValue).toLowerCase() : "";

    const swapPlayerName =
      proposal.clubNegotiation?.swapPlayer?.playerName || "";
    let swapPlayerValue = proposal.clubNegotiation?.swapPlayer?.playerValue
      ? formatTransferValue(
          proposal.clubNegotiation.swapPlayer.playerValue,
        ).toLowerCase()
      : "";
    let swapPlayerSector = proposal.clubNegotiation?.swapPlayer?.sector || "";
    let swapPlayerPosition =
      proposal.clubNegotiation?.swapPlayer?.position || "";

    if (
      swapPlayerName &&
      (!swapPlayerValue || !swapPlayerSector || !swapPlayerPosition)
    ) {
      const foundSwap = (season.players || []).find(
        (p) =>
          (proposal.clubNegotiation?.swapPlayer?.playerId &&
            p.id === proposal.clubNegotiation.swapPlayer.playerId) ||
          p.name.trim().toLowerCase() === swapPlayerName.trim().toLowerCase(),
      );
      if (foundSwap) {
        if (!swapPlayerValue && foundSwap.playerValue) {
          swapPlayerValue = formatTransferValue(
            foundSwap.playerValue,
          ).toLowerCase();
        }
        if (!swapPlayerSector && foundSwap.sector) {
          swapPlayerSector = foundSwap.sector;
        }
        if (!swapPlayerPosition && foundSwap.position) {
          swapPlayerPosition = foundSwap.position;
        }
      }
    }

    const proposalBonuses = proposal.clubNegotiation?.bonuses
      ? [...proposal.clubNegotiation.bonuses]
      : [];
    const hasObjective = proposalBonuses.some(isObjectiveBonus);

    setEditingValues({
      sellValue: isExit ? feeFormatted : "",
      buyValue: !isExit ? feeFormatted : "",
      transferFee: feeFormatted,
      buyOption: feeFormatted,
      buyOptionValue: feeFormatted,
      toClub: partner,
      fromClub: partner,
      dateExit: proposal.agreementDate || "",
      timing: proposal.timing || "Imediata",
      installmentsPercentage: proposal.clubNegotiation?.installments?.percentage
        ? `${proposal.clubNegotiation.installments.percentage}% do total`
        : "Nenhum",
      installmentsYears: proposal.clubNegotiation?.installments
        ?.totalInstallments
        ? proposal.clubNegotiation.installments.totalInstallments === 1
          ? "1 Parcela"
          : `${proposal.clubNegotiation.installments.totalInstallments} Parcelas`
        : "Nenhum",
      paidInstallments: paidInstStr,
      swapPlayerName,
      swapPlayerValue,
      swapPlayerSector,
      swapPlayerPosition,
      loanBackDuration: loanDurationStr,
      buybackValue: proposal.clubNegotiation?.buybackValue
        ? formatTransferValue(
            proposal.clubNegotiation.buybackValue,
          ).toLowerCase()
        : "",
      sellOnPercentage: proposal.clubNegotiation?.sellOnPercentage
        ? `${proposal.clubNegotiation.sellOnPercentage}%`
        : "Nenhum",
      firstRefusal: String(Boolean(proposal.clubNegotiation?.firstRefusal)),
      bonusCategory: hasObjective ? "Prêmio" : "Objetivo atingido",
      bonusObjective: "",
      bonusLeague: "",
      bonusCount: "",
      bonusValue: "",
      bonusStatus: "Pendente",
    });

    setEditingBooleans({
      isRetirement: false,
      isEndContract: false,
      isReturnLoan: false,
      hasInstallments: Boolean(proposal.clubNegotiation?.installments),
      hasPlayerSwap: Boolean(
        swapPlayerName &&
        proposal.clubNegotiation?.swapPlayer &&
        proposal.clubNegotiation.swapPlayer.playerName,
      ),
      hasBonus: proposalBonuses.length > 0,
      hasOtherClauses: Boolean(
        proposal.clubNegotiation?.loanBackDuration ||
        proposal.clubNegotiation?.buybackValue ||
        proposal.clubNegotiation?.firstRefusal ||
        proposal.clubNegotiation?.sellOnPercentage,
      ),
      firstRefusal: Boolean(proposal.clubNegotiation?.firstRefusal),
      hasBuyOption: Boolean(
        proposal.clubNegotiation?.loanTerms?.hasBuyOption ||
        (proposal.clubNegotiation?.loanTerms?.buyOptionFee &&
          proposal.clubNegotiation.loanTerms.buyOptionFee > 0),
      ),
    });

    setEditingBonuses(proposalBonuses);
    setEditingBonusItemIndex(null);
    setActiveSectionDrawer(null);
    setActiveInline({ cardKey: proposal.id, mode: "edit", scope: "club" });
    safeScrollToTop();
  };

  const startManageCard = (item: TransferItem) => {
    const cardKey = `${item.player.id}_${item.contractIndex}_${item.direction}`;
    lastClickedCardKeyRef.current = cardKey;
    setActiveInline({ cardKey, mode: "manage" });
    setActiveSectionDrawer(null);
    setLoanBuyOptionDateInput("");
    safeScrollToTop();
  };

  const cancelInline = (options?: { restoreScroll?: boolean }) => {
    drawerSnapshotRef.current = null;
    const shouldRestore = options?.restoreScroll ?? true;
    const cardKeyToScroll = shouldRestore
      ? lastClickedCardKeyRef.current
      : null;
    lastClickedCardKeyRef.current = null;
    setActiveInline(null);
    setActiveProposal(null);
    setEditingTransferItem(null);
    setEditingBonusItemIndex(null);
    setActiveSectionDrawer(null);
    if (!shouldRestore) {
      setHighlightedCardKey(null);
    }

    if (cardKeyToScroll) {
      setTimeout(() => {
        if (!isMountedRef.current) return;
        const element =
          document.getElementById(`transfer-card-${cardKeyToScroll}`) ||
          document.getElementById(`proposal-card-${cardKeyToScroll}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedCardKey(cardKeyToScroll);
          setTimeout(() => {
            if (isMountedRef.current) {
              setHighlightedCardKey(null);
            }
          }, 1800);
        }
      }, 50);
    }
  };

  const handleBackFromEdit = () => {
    if (activeInline?.returnToChooseScope) {
      drawerSnapshotRef.current = null;
      setEditingBonusItemIndex(null);
      setActiveSectionDrawer(null);
      setActiveInline({
        cardKey: activeInline.cardKey,
        mode: "chooseScope",
      });
      safeScrollToTop();
      return;
    }
    cancelInline();
  };

  const resetScrollState = () => {
    lastClickedCardKeyRef.current = null;
    setHighlightedCardKey(null);
    try {
      NavigationSessionStore.consumeClickAnchor("clauses");
      NavigationSessionStore.consumeClickAnchor("last_click");
    } catch {
      // ignore in test/restricted environments
    }
    safeScrollToTop();
  };

  const handleCustomInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: { id: string },
  ) => {
    const fieldId = field?.id || e.target.name;
    const val = e.target.value;

    setEditingValues((prev: FormValues) => {
      const next = { ...prev, [fieldId]: val };

      if (fieldId === "sellValue" || fieldId === "buyValue") {
        next.transferFee = val;
      }
      if (fieldId === "transferFee") {
        const isExit =
          editingTransferItem?.direction === "exit" ||
          activeProposal?.type === "venda" ||
          activeProposal?.type === "emprestimo_saida";
        if (isExit) {
          next.sellValue = val;
        } else {
          next.buyValue = val;
        }
      }

      if (fieldId === "contractTime") {
        const num = parseInt(val, 10);
        const isRenewalMode =
          editingTransferItem?.direction === "renewals" ||
          (activeInline && activeInline.cardKey.endsWith("_renewals"));

        if (isRenewalMode && editingTransferItem) {
          const originalYears = getPlayerOriginalContractYears(
            editingTransferItem.player,
            career.createdAt,
            season.seasonNumber,
            career.nation,
            editingTransferItem.contractIndex,
          );
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
          next.contractTime = val;
          if (calcUntil) {
            next.contractUntil = calcUntil;
          }
          return next;
        }

        const totalYears = !isNaN(num) && num > 0 ? num : 0;
        const calcUntil =
          totalYears > 0
            ? calculateContractUntilFromYears(
                totalYears,
                career.createdAt,
                season.seasonNumber,
                career.nation,
              )
            : "";
        next.contractTime = val;
        next.contractUntil = calcUntil;
        return next;
      }

      if (fieldId === "bonusCategory") {
        next.bonusObjective = "";
        next.bonusLeague = "";
        next.bonusCount = "";
      }

      if (fieldId === "installmentsPercentage") {
        if (val === "Sem parcelas" || val === "Nenhum") {
          next.installmentsPercentage = "Nenhum";
          next.installmentsYears = "Nenhum";
          setEditingBooleans((bPrev) => ({ ...bPrev, hasInstallments: false }));
        } else if (val) {
          if (next.installmentsYears === "Nenhum" || !next.installmentsYears) {
            next.installmentsYears = "2 Parcelas";
          }
          setEditingBooleans((bPrev) => ({ ...bPrev, hasInstallments: true }));
        }
      }

      if (fieldId === "installmentsYears") {
        if (val === "Nenhum") {
          next.installmentsPercentage = "Nenhum";
          setEditingBooleans((bPrev) => ({ ...bPrev, hasInstallments: false }));
        }
      }

      if (fieldId === "swapPlayerName") {
        const isArrivals =
          activeTab === "arrivals" ||
          editingTransferItem?.direction === "arrivals" ||
          Boolean(activeInline?.cardKey.endsWith("_arrivals")) ||
          activeProposal?.type === "compra" ||
          activeProposal?.type === "emprestimo_entrada";
        if (isArrivals) {
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
            setEditingBooleans((bPrev) => ({ ...bPrev, hasPlayerSwap: true }));
          } else if (!val.trim()) {
            next.swapPlayerName = "";
            next.swapPlayerValue = "";
            next.swapPlayerSector = "";
            next.swapPlayerPosition = "";
            setEditingBooleans((bPrev) => ({ ...bPrev, hasPlayerSwap: false }));
          }
        }
      }

      return next;
    });
  };

  const handleBooleanChangeWrapper = (id: string, value: boolean) => {
    setEditingBooleans((prev: BooleanValues) => ({ ...prev, [id]: value }));
    setEditingValues((prev: FormValues) => ({ ...prev, [id]: String(value) }));
  };

  const handleSaveInline = async (item: TransferItem) => {
    if (readOnly) {
      cancelInline();
      return;
    }

    const isFromLoanBuyOption = checkIsFromLoanBuyOption(item);
    const isCounterpartArrival = checkIsIncomingSwapArrival(item);
    const savingPlayerScope =
      !activeProposal &&
      (activeInline?.scope === "player" ||
        item.direction === "renewals" ||
        isFromLoanBuyOption ||
        isCounterpartArrival);

    if (savingPlayerScope) {
      const rawSal = parseValue(editingValues.salary || "0");
      if (!editingValues.salary || rawSal <= 0) {
        showWarning("Por favor, informe o salário semanal do atleta.");
        return;
      }
    }

    setIsLoading(true);
    try {
      // 1. Proposta ativa (caso acionado via startEditProposalClub)
      if (activeProposal) {
        const isExitProposal =
          activeProposal.type === "venda" ||
          activeProposal.type === "emprestimo_saida";
        const formFeeRaw = isExitProposal
          ? editingValues.sellValue || editingValues.transferFee
          : editingValues.buyValue || editingValues.transferFee;
        const feeVal = parseValue(formFeeRaw || "0");
        const totalFee =
          feeVal > 0
            ? feeVal
            : (activeProposal.clubNegotiation?.transferFee ??
              activeProposal.playerValue ??
              0);

        let installmentsData: TransferInstallments | undefined;
        const isWithoutInstallments =
          editingValues.installmentsPercentage === "Sem parcelas" ||
          editingValues.installmentsPercentage === "Nenhum" ||
          !editingValues.installmentsPercentage;
        if (editingBooleans.hasInstallments && !isWithoutInstallments) {
          const pct =
            parseInt(editingValues.installmentsPercentage || "20", 10) || 20;
          const totalInstallments =
            parseInt(editingValues.installmentsYears || "2", 10) || 2;
          let paidCount = 0;
          if (editingValues.paidInstallments) {
            const match = editingValues.paidInstallments.match(/^(\d+)/);
            if (match) {
              paidCount = parseInt(match[1], 10);
            }
          }
          installmentsData = createTransferInstallments({
            totalValue: totalFee,
            percentage: pct,
            totalInstallments,
            paidInstallments: paidCount,
            currentSeasonNumber: season.seasonNumber,
            direction: isExitProposal ? "receivable" : "payable",
            partnerClub:
              editingValues.toClub ||
              activeProposal.clubNegotiation?.partnerClub ||
              "",
          });
        }

        let swapData: PlayerSwapTerm | undefined;
        if (editingBooleans.hasPlayerSwap && editingValues.swapPlayerName) {
          const foundSwap = (season.players || []).find(
            (p) =>
              p.name.trim().toLowerCase() ===
              editingValues.swapPlayerName.trim().toLowerCase(),
          );
          const swapValNum =
            parseValue(editingValues.swapPlayerValue || "0") ||
            foundSwap?.playerValue ||
            0;
          swapData = {
            playerId: foundSwap?.id,
            playerName: editingValues.swapPlayerName,
            playerValue: swapValNum,
            estimatedValue: swapValNum,
            sector: editingValues.swapPlayerSector || foundSwap?.sector || "",
            position:
              editingValues.swapPlayerPosition || foundSwap?.position || "",
            incomingSwap: isExitProposal,
          };
        }

        const loanYears =
          editingValues.loanBackDuration === "1 temporada"
            ? (1 as const)
            : editingValues.loanBackDuration === "2 temporadas"
              ? (2 as const)
              : undefined;

        const buybackVal = editingValues.buybackValue
          ? parseValue(editingValues.buybackValue)
          : undefined;

        const sellOnPct =
          editingValues.sellOnPercentage &&
          editingValues.sellOnPercentage !== "Nenhum"
            ? parseInt(editingValues.sellOnPercentage.replace("%", ""), 10)
            : undefined;

        const updatedClubNegotiation: ClubNegotiationStage = {
          ...activeProposal.clubNegotiation,
          partnerClub:
            editingValues.toClub ||
            activeProposal.clubNegotiation?.partnerClub ||
            "",
          status: activeProposal.clubNegotiation?.status || "em_negociacao",
          transferFee:
            totalFee > 0
              ? totalFee
              : activeProposal.clubNegotiation?.transferFee,
          installments: installmentsData,
          swapPlayer: swapData,
          bonuses: editingBonuses.length > 0 ? editingBonuses : [],
          loanBackDuration: loanYears,
          buybackValue: buybackVal,
          firstRefusal: Boolean(editingBooleans.firstRefusal),
          sellOnPercentage: sellOnPct,
        };

        const updatedProposalData = {
          clubNegotiation: updatedClubNegotiation,
          timing:
            (editingValues.timing as TransferTiming) || activeProposal.timing,
          agreementDate: editingValues.dateExit || activeProposal.agreementDate,
        };

        await ServiceProposals.updateProposal(
          career.id,
          season.id,
          activeProposal.id,
          updatedProposalData,
        );

        setLocalVersion((v) => v + 1);
        showSuccess("Cláusulas do clube salvas com sucesso!");
        cancelInline();
        return;
      }

      // 2. Termos do Atleta (Renovações, Opção de Compra, Contrapartida de Troca, ou Chegada -> Termos do Atleta)
      if (savingPlayerScope) {
        const finalPlayerBonuses = [...editingBonuses];
        const isRenewal = item.direction === "renewals";
        const releaseClauseVal = parseValue(editingValues.releaseClause || "");
        const existingAdj =
          item.contract.contractClauses?.wageAdjustment ||
          item.contract.contractDetails?.wageAdjustment;
        const wasWageApplied = Boolean(
          existingAdj?.applied ||
          existingAdj?.status === "applied" ||
          existingAdj?.status === "paid",
        );
        const hasValidWageType =
          editingValues.wageAdjustmentType === "Aumentar" ||
          editingValues.wageAdjustmentType === "Diminuir";
        const isNowWageApplied =
          hasValidWageType && editingValues.wageAdjustmentStatus === "Aplicado";

        const isLatestContract =
          item.contractIndex === (item.player.contract?.length ?? 1) - 1;
        let finalSalaryStr = editingValues.salary;

        if (wasWageApplied && !isNowWageApplied) {
          try {
            const revertedSalary =
              await PlayersContractService.revertRenewalWageAdjustment(
                career.id,
                season.id,
                item.player.id,
                item.contractIndex,
              );
            if (isLatestContract) {
              item.player.salary = revertedSalary;
            }
            item.contract.salary = revertedSalary;
            finalSalaryStr =
              revertedSalary % 1000 === 0
                ? formatTransferValue(revertedSalary).toLowerCase()
                : String(revertedSalary);
          } catch (err) {
            console.error("Erro ao reverter ajuste salarial:", err);
          }
        }

        let wageAdjustmentClause: WageAdjustmentClause | undefined;
        if (hasValidWageType && editingValues.wageAdjustmentObjective) {
          const pct =
            parseInt(
              (editingValues.wageAdjustmentPercentage || "5%").replace("%", ""),
              10,
            ) || 5;
          const directionSign =
            editingValues.wageAdjustmentType === "Diminuir" ? -1 : 1;
          const currentContractSalary = Number(item.contract.salary || 0);

          const resolvedBaseSalary =
            existingAdj?.baseSalary !== undefined &&
            Number(existingAdj.baseSalary) > 0
              ? Number(existingAdj.baseSalary)
              : existingAdj?.preAdjustmentSalary !== undefined &&
                  Number(existingAdj.preAdjustmentSalary) > 0
                ? Number(existingAdj.preAdjustmentSalary)
                : wasWageApplied && currentContractSalary > 0
                  ? Math.round(
                      currentContractSalary / (1 + (directionSign * pct) / 100),
                    )
                  : parseValue(finalSalaryStr || "") ||
                    currentContractSalary ||
                    undefined;

          wageAdjustmentClause = {
            enabled: true,
            targetObjective: editingValues.wageAdjustmentObjective,
            targetLeague:
              editingValues.wageAdjustmentLeague ||
              existingAdj?.targetLeague ||
              undefined,
            percentage: pct,
            direction: editingValues.wageAdjustmentType as
              | "Aumentar"
              | "Diminuir",
            applied: isNowWageApplied,
            status: isNowWageApplied ? "applied" : "pending",
            baseSalary: resolvedBaseSalary,
            autoSettlementDisabled:
              wasWageApplied && !isNowWageApplied
                ? true
                : existingAdj?.autoSettlementDisabled,
            ...(isNowWageApplied
              ? {
                  appliedAt: existingAdj?.appliedAt || new Date().toISOString(),
                  preAdjustmentSalary: resolvedBaseSalary,
                }
              : {}),
          };
        }

        const contractClauses = {
          ...(releaseClauseVal ? { releaseClause: releaseClauseVal } : {}),
          ...(wageAdjustmentClause
            ? { wageAdjustment: wageAdjustmentClause }
            : {}),
        };
        const hasAnySpecial = Boolean(releaseClauseVal || wageAdjustmentClause);

        const parsedSigningBonus = editingValues.signingBonus
          ? parseValue(editingValues.signingBonus)
          : undefined;
        const parsedAgentFee =
          !isRenewal && !isFromLoanBuyOption && editingValues.agentFee
            ? parseValue(editingValues.agentFee)
            : undefined;

        const parsedTimeInput = editingValues.contractTime
          ? parseInt(editingValues.contractTime, 10)
          : undefined;

        let parsedContractTime: number;
        if (isRenewal) {
          const originalYears = getPlayerOriginalContractYears(
            item.player,
            career.createdAt,
            season.seasonNumber,
            career.nation,
            item.contractIndex,
          );
          const hasExtension =
            parsedTimeInput !== undefined &&
            !isNaN(parsedTimeInput) &&
            parsedTimeInput >= 0;
          if (hasExtension) {
            parsedContractTime = Math.max(1, originalYears + parsedTimeInput);
          } else if (editingValues.contractUntil) {
            parsedContractTime = calculateContractYears(
              editingValues.contractUntil,
              career.createdAt,
              season.seasonNumber,
              career.nation,
            );
          } else {
            parsedContractTime =
              item.contract.contractTime || item.player.contractTime || 1;
          }
        } else {
          parsedContractTime =
            parsedTimeInput !== undefined &&
            !isNaN(parsedTimeInput) &&
            parsedTimeInput > 0
              ? parsedTimeInput
              : editingValues.contractUntil
                ? calculateContractYears(
                    editingValues.contractUntil,
                    career.createdAt,
                    season.seasonNumber,
                    career.nation,
                  )
                : item.contract.contractTime || item.player.contractTime || 1;
        }

        let calculatedUntil = editingValues.contractUntil;
        if (!calculatedUntil && parsedContractTime > 0) {
          calculatedUntil = calculateContractUntilFromYears(
            parsedContractTime,
            career.createdAt,
            season.seasonNumber,
            career.nation,
          );
        }

        const wageAdjustmentForUpdate =
          !wasWageApplied && isNowWageApplied && wageAdjustmentClause
            ? {
                ...wageAdjustmentClause,
                applied: false,
                status: "pending" as const,
              }
            : wageAdjustmentClause;

        if (isRenewal || isFromLoanBuyOption) {
          await PlayersContractService.updateRenewalClauses({
            careerId: career.id,
            seasonId: season.id,
            playerId: item.player.id,
            contractIndex: item.contractIndex,
            salary: finalSalaryStr || undefined,
            signingBonus: editingValues.signingBonus || undefined,
            contractTime: parsedContractTime,
            contractUntil: calculatedUntil || undefined,
            bonuses: finalPlayerBonuses,
            releaseClause: releaseClauseVal
              ? editingValues.releaseClause
              : undefined,
            wageAdjustment: wageAdjustmentForUpdate,
          });
        } else {
          // Chegada normal ou contrapartida de troca: preserva 100% das cláusulas do clube
          const existingClubBonuses = isCounterpartArrival
            ? []
            : splitClubAndPlayerBonuses(
                resolveContractPlayerClauses(item.contract).allBonuses,
              ).clubBonuses;
          const combinedBonuses = [
            ...existingClubBonuses,
            ...finalPlayerBonuses,
          ];
          const updatedSalaryNumPre = finalSalaryStr
            ? parseValue(finalSalaryStr)
            : Number(item.contract.salary || item.player.salary || 0);

          const existingDetails = item.contract.contractDetails;
          const nextArrivalDetails: ContractDetails = {
            ...existingDetails,
            weeklyWage: updatedSalaryNumPre,
            durationYears: parsedContractTime,
            squadRole: (existingDetails?.squadRole || item.player.squadRole) as
              | SquadRole
              | undefined,
            signingBonus:
              parsedSigningBonus && parsedSigningBonus > 0
                ? parsedSigningBonus
                : undefined,
            agentFee:
              parsedAgentFee && parsedAgentFee > 0 ? parsedAgentFee : undefined,
            releaseClause:
              releaseClauseVal && releaseClauseVal > 0
                ? releaseClauseVal
                : undefined,
            wageAdjustment: wageAdjustmentForUpdate,
            performanceBonuses: finalPlayerBonuses,
          };

          const numericBuyVal = Number(item.contract.buyValue || 0);
          const preservedTransferValue = isCounterpartArrival
            ? "0"
            : numericBuyVal > 0
              ? formatTransferValue(numericBuyVal).toLowerCase()
              : "0";

          await PlayersContractService.editTransferInSeason({
            careerId: career.id,
            seasonId: season.id,
            playerId: item.player.id,
            contractIndex: item.contractIndex,
            direction: "arrivals",
            transferType: "Compra",
            transferValue: preservedTransferValue,
            clubName: item.contract.fromClub || "",
            date: getContractFormattedDate(item.contract),
            timing: item.contract.timing || "Imediata",
            salary: finalSalaryStr || undefined,
            contractTime: parsedContractTime,
            contractUntil: calculatedUntil || undefined,
            signingBonus: editingValues.signingBonus || "",
            agentFee: editingValues.agentFee || "",
            bonuses: combinedBonuses,
            releaseClause: editingValues.releaseClause || "",
            wageAdjustment: wageAdjustmentForUpdate,
            contractDetails: nextArrivalDetails,
          });
        }

        if (!wasWageApplied && isNowWageApplied) {
          try {
            const appliedSalary =
              await PlayersContractService.applyRenewalWageAdjustment(
                career.id,
                season.id,
                item.player.id,
                item.contractIndex,
              );
            if (isLatestContract) {
              item.player.salary = appliedSalary;
            }
            item.contract.salary = appliedSalary;
            finalSalaryStr =
              appliedSalary % 1000 === 0
                ? formatTransferValue(appliedSalary).toLowerCase()
                : String(appliedSalary);
          } catch (err) {
            console.error("Erro ao aplicar ajuste salarial:", err);
          }
        }

        for (const b of finalPlayerBonuses) {
          if (b.status === "pending" || !b.paid) {
            try {
              await ServiceFinance.deleteEntry(
                career.id,
                season.id,
                `bonus_${b.id}`,
              );
            } catch {
              // ignore
            }
          }
        }

        const updatedSalaryNum = finalSalaryStr
          ? parseValue(finalSalaryStr)
          : Number(item.contract.salary || 0);
        const existingClubBonusesLocal =
          isRenewal || isFromLoanBuyOption || isCounterpartArrival
            ? []
            : splitClubAndPlayerBonuses(
                resolveContractPlayerClauses(item.contract).allBonuses,
              ).clubBonuses;
        const allLocalBonuses = [
          ...existingClubBonusesLocal,
          ...finalPlayerBonuses,
        ];

        const existingDetails = item.contract.contractDetails;
        const updatedDetails: ContractDetails = {
          ...existingDetails,
          weeklyWage: updatedSalaryNum,
          durationYears: parsedContractTime,
          squadRole: (existingDetails?.squadRole || item.player.squadRole) as
            | SquadRole
            | undefined,
          signingBonus:
            parsedSigningBonus && parsedSigningBonus > 0
              ? parsedSigningBonus
              : undefined,
          agentFee:
            parsedAgentFee && parsedAgentFee > 0 ? parsedAgentFee : undefined,
          isRenewal: item.contract.isRenewal ?? isRenewal,
          wageAdjustment: wageAdjustmentClause,
          releaseClause: releaseClauseVal || undefined,
          ...(!isRenewal && !isFromLoanBuyOption
            ? { performanceBonuses: finalPlayerBonuses }
            : {}),
        };

        item.contract.bonuses = allLocalBonuses;
        item.contract.contractClauses = hasAnySpecial
          ? contractClauses
          : undefined;
        item.contract.salary = updatedSalaryNum;
        if (isLatestContract && updatedSalaryNum > 0) {
          item.player.salary = updatedSalaryNum;
        }
        item.contract.contractTime = parsedContractTime;
        if (calculatedUntil) item.contract.contractUntil = calculatedUntil;
        item.contract.signingBonus = editingValues.signingBonus || undefined;
        item.contract.contractDetails = updatedDetails;
        item.contract.releaseClause = releaseClauseVal
          ? editingValues.releaseClause
          : undefined;

        const targetPlayer = (season.players || []).find(
          (p) => p.id === item.player.id,
        );
        if (
          targetPlayer?.contract &&
          targetPlayer.contract[item.contractIndex]
        ) {
          const targetContract = targetPlayer.contract[item.contractIndex];
          targetContract.bonuses = allLocalBonuses;
          targetContract.contractClauses = hasAnySpecial
            ? contractClauses
            : undefined;
          targetContract.salary = updatedSalaryNum;
          targetContract.contractTime = parsedContractTime;
          if (calculatedUntil) targetContract.contractUntil = calculatedUntil;
          targetContract.signingBonus = editingValues.signingBonus || undefined;
          targetContract.contractDetails = { ...updatedDetails };
          targetContract.releaseClause = releaseClauseVal
            ? editingValues.releaseClause
            : undefined;

          const isLatest =
            item.contractIndex === targetPlayer.contract.length - 1;
          if (isLatest) {
            if (updatedSalaryNum > 0) targetPlayer.salary = updatedSalaryNum;
            if (parsedContractTime > 0)
              targetPlayer.contractTime = parsedContractTime;
            if (calculatedUntil) targetPlayer.contractUntil = calculatedUntil;
            targetPlayer.contractDetails = { ...updatedDetails };
          }
        }

        setLocalVersion((v) => v + 1);
        showSuccess("Termos do atleta salvos com sucesso!");
        cancelInline();
        return;
      }

      // 3. Cláusulas do Clube (Saídas ou Chegadas -> Cláusulas do Clube)
      const isExit = item.direction === "exit";
      const formFeeRaw = isExit
        ? editingValues.sellValue || editingValues.transferFee
        : editingValues.buyValue || editingValues.transferFee;
      const totalFeeNum = parseValue(formFeeRaw || "0");
      const finalClubBonuses = [...editingBonuses];

      let installmentsData: TransferInstallments | undefined;
      const isWithoutInstallments =
        editingValues.installmentsPercentage === "Sem parcelas" ||
        editingValues.installmentsPercentage === "Nenhum" ||
        !editingValues.installmentsPercentage ||
        editingValues.installmentsYears === "Nenhum" ||
        !editingValues.installmentsYears;
      if (editingBooleans.hasInstallments && !isWithoutInstallments) {
        const pct =
          parseInt(editingValues.installmentsPercentage || "20", 10) || 20;
        const totalInstallments =
          parseInt(editingValues.installmentsYears || "2", 10) || 2;
        let paidCount = 0;
        if (editingValues.paidInstallments) {
          const match = editingValues.paidInstallments.match(/^(\d+)/);
          if (match) {
            paidCount = parseInt(match[1], 10);
          }
        }
        installmentsData = createTransferInstallments({
          totalValue: totalFeeNum,
          percentage: pct,
          totalInstallments,
          paidInstallments: paidCount,
          currentSeasonNumber: season.seasonNumber,
          direction: isExit ? "receivable" : "payable",
          partnerClub: editingValues.toClub || editingValues.fromClub || "",
        });
      }

      let swapData: PlayerSwapTerm | undefined;
      if (editingBooleans.hasPlayerSwap && editingValues.swapPlayerName) {
        const foundSwap = (season.players || []).find(
          (p) =>
            p.name.trim().toLowerCase() ===
            editingValues.swapPlayerName.trim().toLowerCase(),
        );
        const swapValNum =
          parseValue(editingValues.swapPlayerValue || "0") ||
          foundSwap?.playerValue ||
          0;
        swapData = {
          playerId: foundSwap?.id,
          playerName: editingValues.swapPlayerName,
          playerValue: swapValNum,
          estimatedValue: swapValNum,
          sector: editingValues.swapPlayerSector || foundSwap?.sector || "",
          position:
            editingValues.swapPlayerPosition || foundSwap?.position || "",
          incomingSwap: isExit,
        };
      }

      const loanYears =
        editingValues.loanBackDuration === "1 temporada"
          ? (1 as const)
          : editingValues.loanBackDuration === "2 temporadas"
            ? (2 as const)
            : undefined;
      const buybackNum = editingValues.buybackValue
        ? parseValue(editingValues.buybackValue)
        : 0;
      const sellOnNum =
        editingValues.sellOnPercentage &&
        editingValues.sellOnPercentage !== "Nenhum"
          ? parseInt(editingValues.sellOnPercentage.replace("%", ""), 10)
          : 0;
      const hasFirstRefusal = Boolean(
        editingBooleans.firstRefusal || editingValues.firstRefusal === "true",
      );

      let clausesData: TransferClauses | undefined;
      if (loanYears || buybackNum > 0 || hasFirstRefusal || sellOnNum > 0) {
        clausesData = {
          ...(loanYears ? { loanBackDuration: loanYears } : {}),
          ...(buybackNum > 0 ? { buybackValue: buybackNum } : {}),
          ...(hasFirstRefusal ? { firstRefusal: true } : {}),
          ...(sellOnNum > 0 ? { sellOnPercentage: sellOnNum } : {}),
        };
      }

      const existingPlayerBonuses = !isExit
        ? resolveContractPlayerClauses(item.contract).playerBonuses
        : [];
      const combinedBonuses = !isExit
        ? [...finalClubBonuses, ...existingPlayerBonuses]
        : finalClubBonuses;

      const nextTiming = (editingValues.timing ||
        item.contract.timing ||
        "Imediata") as TransferTiming;

      await PlayersContractService.editTransferInSeason({
        careerId: career.id,
        seasonId: season.id,
        playerId: item.player.id,
        contractIndex: item.contractIndex,
        direction: item.direction === "exit" ? "exit" : "arrivals",
        transferType: isExit ? "Venda" : "Compra",
        transferValue: formFeeRaw || "0",
        clubName: editingValues.toClub || editingValues.fromClub || "",
        date: editingValues.dateExit || getContractFormattedDate(item.contract),
        timing: nextTiming,
        installments: installmentsData,
        swapPlayer: swapData,
        bonuses: combinedBonuses,
        transferClauses: clausesData,
      });

      for (const b of finalClubBonuses) {
        if (b.status === "pending" || !b.paid) {
          try {
            await ServiceFinance.deleteEntry(
              career.id,
              season.id,
              `bonus_${b.id}`,
            );
          } catch {
            // ignore
          }
        }
      }

      // Sincroniza contrato em memória
      if (isExit) {
        item.contract.sellValue = totalFeeNum;
      } else {
        item.contract.buyValue = totalFeeNum;
      }
      item.contract.timing = nextTiming;
      item.contract.installments = installmentsData;
      item.contract.swapPlayer = swapData;
      item.contract.bonuses = combinedBonuses;
      item.contract.transferClauses = clausesData;

      const targetPlayer = (season.players || []).find(
        (p) => p.id === item.player.id,
      );
      if (targetPlayer?.contract && targetPlayer.contract[item.contractIndex]) {
        const targetContract = targetPlayer.contract[item.contractIndex];
        if (isExit) {
          targetContract.sellValue = totalFeeNum;
        } else {
          targetContract.buyValue = totalFeeNum;
        }
        targetContract.timing = nextTiming;
        targetContract.installments = installmentsData;
        targetContract.swapPlayer = swapData;
        targetContract.bonuses = combinedBonuses;
        targetContract.transferClauses = clausesData;
      }

      setLocalVersion((v) => v + 1);
      showSuccess("Cláusulas do clube salvas com sucesso!");
      cancelInline();
    } catch (err) {
      console.error("Erro ao salvar cláusulas:", err);
      showError("Ocorreu um erro ao salvar as alterações das cláusulas.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertWageAdjustmentInDrawer = (item: TransferItem) => {
    if (readOnly) return;
    try {
      const wageAdj =
        item.contract.contractClauses?.wageAdjustment ||
        item.contract.contractDetails?.wageAdjustment;

      const pct =
        parseInt(
          (
            editingValues.wageAdjustmentPercentage ||
            (wageAdj?.percentage ? `${wageAdj.percentage}%` : "10%")
          ).replace("%", ""),
          10,
        ) || 10;
      const direction =
        (editingValues.wageAdjustmentType || wageAdj?.direction) === "Diminuir"
          ? -1
          : 1;
      const factor = 1 + (direction * pct) / 100;

      const currentSalaryNum =
        parseValue(editingValues.salary || "") ||
        Number(item.contract.salary ?? item.player.salary ?? 0);

      const restoredSalary =
        wageAdj?.baseSalary !== undefined &&
        typeof wageAdj.baseSalary === "number" &&
        !isNaN(wageAdj.baseSalary) &&
        wageAdj.baseSalary > 0
          ? Number(wageAdj.baseSalary)
          : wageAdj?.preAdjustmentSalary !== undefined &&
              typeof wageAdj.preAdjustmentSalary === "number" &&
              !isNaN(wageAdj.preAdjustmentSalary) &&
              wageAdj.preAdjustmentSalary > 0
            ? Number(wageAdj.preAdjustmentSalary)
            : factor > 0
              ? Math.round(currentSalaryNum / factor)
              : currentSalaryNum;

      const formattedSalary =
        restoredSalary % 1000 === 0
          ? formatTransferValue(restoredSalary).toLowerCase()
          : String(restoredSalary);

      setEditingValues((prev) => ({
        ...prev,
        salary: formattedSalary,
        wageAdjustmentStatus: "Pendente",
      }));

      setLocalVersion((v) => v + 1);
      showSuccess(
        "Ajuste salarial revertido no formulário. Salve para confirmar.",
      );
    } catch (err) {
      console.error("Erro ao reverter ajuste salarial no drawer:", err);
      showError("Não foi possível reverter o ajuste salarial.");
    }
  };

  return {
    editingValues,
    setEditingValues,
    editingBooleans,
    setEditingBooleans,
    editingBonuses,
    setEditingBonuses,
    editingBonusItemIndex,
    setEditingBonusItemIndex,
    activeSectionDrawer,
    setActiveSectionDrawer,
    handleOpenSectionDrawer,
    handleCommitSectionDrawer,
    handleCancelSectionDrawer,
    startEditCard,
    startEditCardWithScope,
    startEditProposalClub,
    startManageCard,
    cancelInline,
    handleBackFromEdit,
    resetScrollState,
    handleCustomInputChange,
    handleBooleanChangeWrapper,
    handleAddOrEditBonus,
    handleEditBonus,
    handleDeleteBonus,
    handleSaveInline,
    handleRevertWageAdjustmentInDrawer,
  };
};

export default useManageClausesInlineActions;
