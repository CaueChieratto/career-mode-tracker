import { createContext, useContext } from "react";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { TransferBonus } from "../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { Field } from "../../../../../../../../components/FormSection";
import { RenewalDrawerKey, RenewalFormValues } from "../types";
import { TransferProposal } from "../../../../../../../../common/interfaces/proposals/transferProposal";

export interface RenewPlayerContextData {
  player?: Players;
  formValues: RenewalFormValues;
  bonuses: TransferBonus[];
  editingBonusIndex: number | null;
  activeDrawerKey: RenewalDrawerKey;
  isSaving: boolean;
  proposalId?: string;
  isConfirmationOpen: boolean;
  setIsConfirmationOpen: React.Dispatch<React.SetStateAction<boolean>>;
  confirmationProposal: TransferProposal | null;
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      | { target: { name: string; value: string } },
    field?: Field,
  ) => void;
  openDrawer: (key: RenewalDrawerKey) => void;
  closeDrawer: () => void;
  handleCancelDrawer: () => void;
  handleSaveBonusDrawer: () => void;
  handleSaveSpecialClausesDrawer: () => void;
  handleAddOrEditBonus: () => boolean;
  handleEditBonus: (index: number) => void;
  handleDeleteBonus: (index: number) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  handleSaveProposal: (asAccepted?: boolean) => Promise<TransferProposal | null>;
  handleReviewAndFinalize: () => Promise<void>;
  executeFinalRenewal: (confirmedProposal: TransferProposal) => Promise<void>;
  handleClose: () => void;
}

export const RenewPlayerContext = createContext<RenewPlayerContextData | null>(
  null,
);

export const useRenewPlayerContext = (): RenewPlayerContextData => {
  const context = useContext(RenewPlayerContext);
  if (!context) {
    throw new Error(
      "useRenewPlayerContext must be used within a RenewPlayerProvider",
    );
  }
  return context;
};

