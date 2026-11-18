import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { TransferProposal } from "../../../../../../../common/interfaces/proposals/transferProposal";
import { SectionScreen, TransferClausePrefill } from "../../../../../config/screens";
import { OptimisticUpdateData } from "../../../../../helpers/updateSectionCareer";
import { getAddTransferPlayerFields } from "./constants/transferFormFields";
import { useAddTransferPlayerForm } from "./hooks/useAddTransferPlayerForm";
import AddTransferPlayerScreen from "./screens/AddTransferPlayerScreen";
import ProposalConfirmationModal from "../../../../../../../ui/modals/ProposalConfirmationModal";

interface AddTransferPlayerProps {
  career: Career;
  season: ClubData;
  seasonId?: string;
  onClose: (optimisticData?: OptimisticUpdateData) => void;
  prefill?: TransferClausePrefill;
  restoreDraft?: boolean;
  proposalId?: string;
  initialProposal?: TransferProposal;
  onOpenScreen?: (screen: SectionScreen) => void;
  editTransfer?: {
    player: Players;
    contract: NonNullable<Players["contract"]>[number];
    contractIndex: number;
  };
}

export default function AddTransferPlayer({
  career,
  season,
  seasonId,
  onClose,
  prefill,
  restoreDraft,
  proposalId,
  initialProposal,
  onOpenScreen,
  editTransfer,
}: AddTransferPlayerProps) {
  const {
    formValues,
    mergedFormValues,
    booleanValues,
    transferType,
    isLoading,
    filteredTeamOptions,
    filteredPastPlayerOptions,
    handleInputChange,
    handleBooleanChange,
    handleSaveTransfer,
    handleSaveProposal,
    handleRevertTransfer,
    isConfirmationOpen,
    setIsConfirmationOpen,
    confirmationProposal,
    executeFinalTransfer,
  } = useAddTransferPlayerForm({
    career,
    season,
    seasonId,
    onClose,
    onOpenScreen,
    prefill,
    restoreDraft,
    proposalId,
    initialProposal,
    editTransfer,
  });

  const sections = getAddTransferPlayerFields(
    formValues.nation || "",
    transferType,
    filteredTeamOptions,
    booleanValues,
    filteredPastPlayerOptions,
    prefill,
    Boolean(editTransfer),
    formValues.sector || "",
  );

  return (
    <>
      <AddTransferPlayerScreen
        career={career}
        onClose={onClose}
        proposalId={proposalId}
        editTransfer={editTransfer}
        handleSaveTransfer={handleSaveTransfer}
        handleRevertTransfer={handleRevertTransfer}
        handleSaveProposal={editTransfer ? undefined : () => handleSaveProposal(1, false)}
        handleSendProposal={editTransfer ? undefined : () => handleSaveProposal(1, false)}
        sections={sections}
        mergedFormValues={mergedFormValues}
        booleanValues={booleanValues}
        formValues={formValues}
        handleInputChange={handleInputChange}
        handleBooleanChange={handleBooleanChange}
        isLoading={isLoading}
      />

      {confirmationProposal && (
        <ProposalConfirmationModal
          isOpen={isConfirmationOpen}
          proposal={confirmationProposal}
          onClose={() => setIsConfirmationOpen(false)}
          onConfirm={async () => {
            await executeFinalTransfer(confirmationProposal);
            setIsConfirmationOpen(false);
          }}
          isSubmitting={isLoading}
        />
      )}
    </>
  );
}
