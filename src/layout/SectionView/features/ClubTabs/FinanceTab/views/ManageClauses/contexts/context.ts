import { createContext, useContext } from "react";
import { Career } from "../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { SectionScreen } from "../../../../../../config/screens";
import {
  TransferItem,
  ActiveInlineState,
  DrawerSection,
  ClauseEditScope,
} from "../types";
import { TransferBonus } from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { BooleanValues, FormValues } from "../../../../SquadTab/views/TransferPlayer/types";
import { Field } from "../../../../../../../../components/FormSection";
import { buildSaleClausesSections } from "../../../../SquadTab/views/TransferPlayer/constants/buildTransfersFormSections";
import { PendingTransferDraft } from "../../../../../../../../common/services/TransferDraftService";
import { TransferProposal } from "../../../../../../../../common/interfaces/proposals/transferProposal";

export interface ManageClausesContextValue {
  career: Career;
  season: ClubData;
  onClose: () => void;
  readOnly: boolean;
  onOpenScreen?: (screen: SectionScreen) => void;
  clubColor: string;
  selectedPlayerName?: string;
  selectedProposalId?: string;

  // Proposals
  proposals: TransferProposal[];
  setProposals: React.Dispatch<React.SetStateAction<TransferProposal[]>>;
  activeProposals: TransferProposal[];
  currentProposals: TransferProposal[];
  arrivalProposals: TransferProposal[];
  exitProposals: TransferProposal[];
  renewalProposals: TransferProposal[];

  // Loading
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  localVersion: number;
  setLocalVersion: React.Dispatch<React.SetStateAction<number>>;

  // Transfers navigation & filter
  activeTab: "renewals" | "arrivals" | "exit";
  setActiveTab: (tab: "renewals" | "arrivals" | "exit") => void;
  deletedRenewalKeys: Set<string>;
  setDeletedRenewalKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  exitTransfers: TransferItem[];
  arrivalTransfers: TransferItem[];
  renewalTransfers: TransferItem[];
  currentList: TransferItem[];
  allTransfers: TransferItem[];
  searchPlayerQuery: string;
  setSearchPlayerQuery: (q: string) => void;
  playerSearchOptions: string[];
  handlePlayerSearchChange: (event: {
    target: { name: string; value: string };
  }) => void;

  // Pending Draft (Backup)
  pendingDraft: PendingTransferDraft | null;
  handleResumeDraft: () => void;
  handleCancelDraft: () => void;

  // Badges
  dbBadges: Record<string, string>;
  getClubBadgeUrl: (clubName?: string) => string | undefined;

  // Actions & Inline state
  activeInline: ActiveInlineState | null;
  setActiveInline: React.Dispatch<
    React.SetStateAction<ActiveInlineState | null>
  >;
  activeProposal: TransferProposal | null;
  startEditProposalClub: (proposal: TransferProposal) => void;
  startManageProposalLoan: (proposal: TransferProposal) => void;
  activeTransferItem: TransferItem | null;
  highlightedCardKey: string | null;
  setHighlightedCardKey: React.Dispatch<React.SetStateAction<string | null>>;
  startEditCard: (item: TransferItem) => void;
  startEditCardWithScope: (
    item: TransferItem,
    scope: ClauseEditScope,
    returnToChooseScope?: boolean,
  ) => void;
  startManageCard: (item: TransferItem) => void;
  cancelInline: (options?: { restoreScroll?: boolean }) => void;
  handleBackFromEdit: () => void;
  resetScrollState: (options?: { scrollToTop?: boolean }) => void;

  // Inline form state
  editingValues: FormValues;
  setEditingValues: React.Dispatch<React.SetStateAction<FormValues>>;
  editingBooleans: BooleanValues;
  setEditingBooleans: React.Dispatch<React.SetStateAction<BooleanValues>>;
  editingBonuses: TransferBonus[];
  setEditingBonuses: React.Dispatch<React.SetStateAction<TransferBonus[]>>;
  editingBonusItemIndex: number | null;
  setEditingBonusItemIndex: React.Dispatch<React.SetStateAction<number | null>>;
  activeSectionDrawer: DrawerSection;
  setActiveSectionDrawer: React.Dispatch<React.SetStateAction<DrawerSection>>;
  loanBuyOptionDateInput: string;
  setLoanBuyOptionDateInput: React.Dispatch<React.SetStateAction<string>>;
  sellOnActiveCardKey: string | null;
  setSellOnActiveCardKey: React.Dispatch<React.SetStateAction<string | null>>;
  sellOnTotalInput: string;
  setSellOnTotalInput: React.Dispatch<React.SetStateAction<string>>;
  sellOnDateInput: string;
  setSellOnDateInput: React.Dispatch<React.SetStateAction<string>>;

  // Handlers
  handleOpenSectionDrawer: (
    drawer: Exclude<DrawerSection, null>,
  ) => void;
  handleCommitSectionDrawer: (drawer?: DrawerSection) => void;
  handleCancelSectionDrawer: () => void;
  handleCustomInputChange: (
    event:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: { id: string },
  ) => void;
  handleBooleanChangeWrapper: (id: string, value: boolean) => void;
  handleAddOrEditBonus: () => void;
  handleEditBonus: (index: number) => void;
  handleDeleteBonus: (index: number) => void;
  handleSaveInline: (item: TransferItem) => Promise<void>;
  handleSettleInstallment: (item: TransferItem) => Promise<void>;
  handleSettleBonus: (item: TransferItem, bonusId: string) => Promise<void>;
  handleUnsettleInstallment: (item: TransferItem) => Promise<void>;
  handleApplyWageAdjustment: (item: TransferItem) => Promise<void>;
  handleRevertWageAdjustment: (item: TransferItem) => Promise<void>;
  handleRevertWageAdjustmentInDrawer: (item: TransferItem) => Promise<void> | void;
  handleConfirmSellOn: (item: TransferItem) => Promise<void>;
  handleDeleteRenewal: (item: TransferItem) => Promise<void>;
  handleTriggerReleaseClause: (item: TransferItem) => void;
  handleExerciseBuyback: (item: TransferItem) => void;
  handleExerciseFirstRefusal: (item: TransferItem) => void;
  handleExerciseLoanBuyOption: (item: TransferItem) => Promise<void>;
  handleExerciseArrivalLoanBuyOption: (item: TransferItem) => void;

  // Form sections & merged values
  clausesSections: ReturnType<typeof buildSaleClausesSections>;
  renewalContractSection: {
    title?: string;
    rows: readonly (readonly Field[])[];
  };
  renewalBonusSection: {
    title?: string;
    rows: readonly (readonly Field[])[];
  };
  renewalSpecialClausesSection: {
    title?: string;
    rows: readonly (readonly Field[])[];
  };
  mergedFormValues: FormValues;
}

export const ManageClausesContext =
  createContext<ManageClausesContextValue | null>(null);

export const useManageClausesContext = (): ManageClausesContextValue => {
  const ctx = useContext(ManageClausesContext);
  if (!ctx) {
    throw new Error(
      "useManageClausesContext deve ser usado dentro de ManageClausesProvider",
    );
  }
  return ctx;
};
