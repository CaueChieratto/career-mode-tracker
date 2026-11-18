import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { SectionScreen } from "../../../../../config/screens";
import { BooleanValues, FormValues } from "../../../SquadTab/views/TransferPlayer/types";
import { TransferBonus } from "../../../../../../../common/interfaces/playersInfo/transferTerms";
import { TransferProposal } from "../../../../../../../common/interfaces/proposals/transferProposal";

export interface ProposalClubClausesProps {
  career: Career;
  season: ClubData;
  proposalId: string;
  onClose: () => void;
  onOpenScreen?: (screen: SectionScreen) => void;
}

export type ProposalClubDrawerKey =
  | "transferDetails"
  | "installments"
  | "swap"
  | "bonus"
  | "other"
  | null;

export interface ProposalClubClausesContextType {
  career: Career;
  season: ClubData;
  proposal: TransferProposal | null;
  isLoading: boolean;
  isSaving: boolean;
  clubColor: string;
  formValues: FormValues;
  booleanValues: BooleanValues;
  bonuses: TransferBonus[];
  editingBonusIndex: number | null;
  activeDrawerKey: ProposalClubDrawerKey;
  openDrawer: (key: Exclude<ProposalClubDrawerKey, null>) => void;
  closeDrawer: () => void;
  commitDrawer: (key?: ProposalClubDrawerKey) => void;
  cancelDrawer: () => void;
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: { id: string },
  ) => void;
  handleBooleanChange: (name: string, value: boolean) => void;
  handleAddOrEditBonus: () => boolean;
  handleEditBonus: (index: number) => void;
  handleDeleteBonus: (index: number) => void;
  handleSaveClubClauses: () => Promise<void>;
  onClose: () => void;
}

