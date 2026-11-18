import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ManageClausesProps } from "../../index";
import { ManageClausesContext, ManageClausesContextValue } from "../context";
import { useSeasonTheme } from "../../../../../../../../../common/hooks/Seasons/UseSeasonTheme";
import { mergeFormValues } from "../../../../../../../../../common/hooks/UseForm";
import { useManageClausesTransfers } from "../../hooks/useManageClausesTransfers";
import { useManageClausesActions } from "../../hooks/useManageClausesActions";
import { usePartnerClubBadges } from "../../hooks/usePartnerClubBadges";
import { buildSaleClausesSections } from "../../../../../SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import {
  buildRenewalBonusSection,
  buildRenewalSpecialClausesSection,
} from "../../../../../SquadTab/views/RenewPlayer/constants/buildRenewalFormSections";
import { buildProposalContractSection } from "../../../ProposalPlayerTerms/constants/buildProposalContractSection";
import { checkIsFromLoanBuyOption } from "../../helpers/clauseEditHelpers";
import { RenewalFormValues } from "../../../../../SquadTab/views/RenewPlayer/types";
import { findAchievedObjectiveBonusesToSettle } from "../../../../../../../../../common/services/ServiceFinance/clauseAutoEvaluator";
import { PlayersContractService } from "../../../../../../../../../common/services/ServicePlayers/PlayersContractService";

export interface ManageClausesProviderProps extends ManageClausesProps {
  children: React.ReactNode;
}

export const ManageClausesProvider: React.FC<ManageClausesProviderProps> = ({
  career,
  season,
  onClose,
  readOnly = false,
  onOpenScreen,
  initialTab,
  selectedPlayerName,
  selectedProposalId,
  children,
}) => {
  const { clubColor } = useSeasonTheme();
  const [isLoading, setIsLoading] = useState(false);
  const highlightCardRef = useRef<(cardKey: string) => void>(() => {});

  // Transferencias e abas
  const transfers = useManageClausesTransfers({
    career,
    season,
    initialTab,
    selectedPlayerName,
    selectedProposalId,
    onHighlightCard: useCallback((cardKey: string) => {
      highlightCardRef.current(cardKey);
    }, []),
    onOpenScreen,
  });

  // Ações de negócio e formulário inline
  const actions = useManageClausesActions({
    career,
    season,
    onOpenScreen,
    allTransfers: transfers.allTransfers,
    setIsLoading,
    setLocalVersion: transfers.setLocalVersion,
    setDeletedRenewalKeys: transfers.setDeletedRenewalKeys,
    readOnly,
    activeTab: transfers.activeTab,
  });

  highlightCardRef.current = (cardKey: string) => {
    actions.setHighlightedCardKey(cardKey);
    setTimeout(() => {
      actions.setHighlightedCardKey(null);
    }, 1800);
  };

  // Escudos dos parceiros comerciais (incluindo clubes de propostas pendentes)
  const badges = usePartnerClubBadges(
    career,
    season,
    transfers.allTransfers,
    transfers.proposals,
  );

  const isArrivals =
    actions.activeTransferItem?.direction === "arrivals" ||
    actions.activeProposal?.type === "compra" ||
    actions.activeProposal?.type === "emprestimo_entrada";
  const isProposal = Boolean(actions.activeProposal);
  const clubPlayerOptions = useMemo(() => {
    return (season.players || [])
      .filter((p) => !p.sell && !p.incomingLoan)
      .map((p) => p.name);
  }, [season.players]);

  const { setLocalVersion } = transfers;

  // Auto-liquidação reativa de bônus de "Objetivo atingido" cumpridos na liga selecionada
  useEffect(() => {
    if (readOnly || !career?.id || !season?.id || season.id === "geral") return;
    const candidates = findAchievedObjectiveBonusesToSettle(career, season);
    if (candidates.length === 0) return;

    let cancelled = false;
    void PlayersContractService.autoSettleAchievedObjectiveBonuses(
      career.id,
      season.id,
      career,
      season,
    ).then((result) => {
      if (!cancelled && result.settledCount > 0) {
        setLocalVersion((v) => v + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [readOnly, career, season, setLocalVersion]);

  // Seções dinâmicas para edição inline
  const clausesSections = useMemo(
    () =>
      buildSaleClausesSections(
        actions.editingBooleans,
        actions.editingValues,
        career.customBonusObjectives,
        actions.editingBonuses,
        actions.editingBonusItemIndex,
        isArrivals,
        clubPlayerOptions,
        isProposal,
        career.nation,
        true,
      ),
    [
      actions.editingBooleans,
      actions.editingValues,
      career.customBonusObjectives,
      actions.editingBonuses,
      actions.editingBonusItemIndex,
      isArrivals,
      clubPlayerOptions,
      isProposal,
      career.nation,
    ],
  );

  const isRenewalItem = actions.activeTransferItem?.direction === "renewals";
  const isFromLoanBuyOptionItem = actions.activeTransferItem
    ? checkIsFromLoanBuyOption(actions.activeTransferItem)
    : false;

  const renewalContractSection = useMemo(
    () =>
      buildProposalContractSection({
        hideAgentFee: isRenewalItem || isFromLoanBuyOptionItem,
        isRenewal: isRenewalItem,
      }),
    [isRenewalItem, isFromLoanBuyOptionItem],
  );

  const renewalBonusSection = useMemo(() => {
    return buildRenewalBonusSection(
      actions.editingBonuses,
      actions.editingBonusItemIndex,
      actions.editingValues as unknown as RenewalFormValues,
      career.customBonusObjectives,
      true,
      career.nation,
    );
  }, [
    actions.editingBonuses,
    actions.editingBonusItemIndex,
    actions.editingValues,
    career.customBonusObjectives,
    career.nation,
  ]);

  const renewalSpecialClausesSection = useMemo(() => {
    return buildRenewalSpecialClausesSection(
      actions.editingValues as unknown as RenewalFormValues,
      career.customBonusObjectives,
      true,
      career.nation,
    );
  }, [actions.editingValues, career.customBonusObjectives, career.nation]);

  const mergedFormValues = useMemo(
    () =>
      mergeFormValues(
        actions.editingValues,
        actions.editingBooleans as unknown as Record<string, boolean>,
      ),
    [actions.editingValues, actions.editingBooleans],
  );

  const value: ManageClausesContextValue = {
    career,
    season,
    onClose,
    readOnly,
    onOpenScreen,
    clubColor,
    selectedPlayerName,
    selectedProposalId,

    proposals: transfers.proposals,
    setProposals: transfers.setProposals,
    activeProposals: transfers.activeProposals,
    currentProposals: transfers.currentProposals,
    arrivalProposals: transfers.arrivalProposals,
    exitProposals: transfers.exitProposals,
    renewalProposals: transfers.renewalProposals,

    isLoading,
    setIsLoading,
    localVersion: transfers.localVersion,
    setLocalVersion: transfers.setLocalVersion,

    activeTab: transfers.activeTab,
    setActiveTab: transfers.setActiveTab,
    deletedRenewalKeys: transfers.deletedRenewalKeys,
    setDeletedRenewalKeys: transfers.setDeletedRenewalKeys,
    exitTransfers: transfers.exitTransfers,
    arrivalTransfers: transfers.arrivalTransfers,
    renewalTransfers: transfers.renewalTransfers,
    currentList: transfers.currentList,
    allTransfers: transfers.allTransfers,
    searchPlayerQuery: transfers.searchPlayerQuery,
    setSearchPlayerQuery: transfers.setSearchPlayerQuery,
    playerSearchOptions: transfers.playerSearchOptions,
    handlePlayerSearchChange: transfers.handlePlayerSearchChange,

    pendingDraft: transfers.pendingDraft,
    handleResumeDraft: transfers.handleResumeDraft,
    handleCancelDraft: transfers.handleCancelDraft,

    dbBadges: badges.dbBadges,
    getClubBadgeUrl: badges.getClubBadgeUrl,

    activeInline: actions.activeInline,
    setActiveInline: actions.setActiveInline,
    activeProposal: actions.activeProposal,
    startEditProposalClub: actions.startEditProposalClub,
    startManageProposalLoan: actions.startManageProposalLoan,
    activeTransferItem: actions.activeTransferItem,
    highlightedCardKey: actions.highlightedCardKey,
    setHighlightedCardKey: actions.setHighlightedCardKey,
    startEditCard: actions.startEditCard,
    startEditCardWithScope: actions.startEditCardWithScope,
    startManageCard: actions.startManageCard,
    cancelInline: actions.cancelInline,
    handleBackFromEdit: actions.handleBackFromEdit,
    resetScrollState: actions.resetScrollState,

    editingValues: actions.editingValues,
    setEditingValues: actions.setEditingValues,
    editingBooleans: actions.editingBooleans,
    setEditingBooleans: actions.setEditingBooleans,
    editingBonuses: actions.editingBonuses,
    setEditingBonuses: actions.setEditingBonuses,
    editingBonusItemIndex: actions.editingBonusItemIndex,
    setEditingBonusItemIndex: actions.setEditingBonusItemIndex,
    activeSectionDrawer: actions.activeSectionDrawer,
    setActiveSectionDrawer: actions.setActiveSectionDrawer,
    loanBuyOptionDateInput: actions.loanBuyOptionDateInput,
    setLoanBuyOptionDateInput: actions.setLoanBuyOptionDateInput,
    sellOnActiveCardKey: actions.sellOnActiveCardKey,
    setSellOnActiveCardKey: actions.setSellOnActiveCardKey,
    sellOnTotalInput: actions.sellOnTotalInput,
    setSellOnTotalInput: actions.setSellOnTotalInput,
    sellOnDateInput: actions.sellOnDateInput,
    setSellOnDateInput: actions.setSellOnDateInput,

    handleOpenSectionDrawer: actions.handleOpenSectionDrawer,
    handleCommitSectionDrawer: actions.handleCommitSectionDrawer,
    handleCancelSectionDrawer: actions.handleCancelSectionDrawer,
    handleCustomInputChange: actions.handleCustomInputChange,
    handleBooleanChangeWrapper: actions.handleBooleanChangeWrapper,
    handleAddOrEditBonus: actions.handleAddOrEditBonus,
    handleEditBonus: actions.handleEditBonus,
    handleDeleteBonus: actions.handleDeleteBonus,
    handleSaveInline: actions.handleSaveInline,
    handleSettleInstallment: actions.handleSettleInstallment,
    handleSettleBonus: actions.handleSettleBonus,
    handleUnsettleInstallment: actions.handleUnsettleInstallment,
    handleApplyWageAdjustment: actions.handleApplyWageAdjustment,
    handleRevertWageAdjustment: actions.handleRevertWageAdjustment,
    handleRevertWageAdjustmentInDrawer:
      actions.handleRevertWageAdjustmentInDrawer,
    handleConfirmSellOn: actions.handleConfirmSellOn,
    handleDeleteRenewal: actions.handleDeleteRenewal,
    handleTriggerReleaseClause: actions.handleTriggerReleaseClause,
    handleExerciseBuyback: actions.handleExerciseBuyback,
    handleExerciseFirstRefusal: actions.handleExerciseFirstRefusal,
    handleExerciseLoanBuyOption: actions.handleExerciseLoanBuyOption,
    handleExerciseArrivalLoanBuyOption:
      actions.handleExerciseArrivalLoanBuyOption,

    clausesSections,
    renewalContractSection,
    renewalBonusSection,
    renewalSpecialClausesSection,
    mergedFormValues,
  };

  return (
    <ManageClausesContext.Provider value={value}>
      {children}
    </ManageClausesContext.Provider>
  );
};

export default ManageClausesProvider;
