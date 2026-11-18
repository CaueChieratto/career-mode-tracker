import { useState, useRef } from "react";
import { Form } from "react-router-dom";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Navbar from "../../../../../../../../../ui/Navbar";
import Load from "../../../../../../../../../components/Load";
import FormSection, { Field } from "../../../../../../../../../components/FormSection";
import Modal from "../../../../../../../../../components/Modal";
import DeleteConfirmModal from "../../../../../../../../../ui/modals/DeleteConfirmModal";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";
import Styles from "../../AddTransferPlayer.module.css";

interface AddTransferPlayerSectionType {
  title: string;
  fields: Field[][];
}

export interface AddTransferPlayerScreenProps {
  career: Career;
  onClose: () => void;
  proposalId?: string;
  editTransfer?: {
    player: Players;
    contract: NonNullable<Players["contract"]>[number];
    contractIndex: number;
  };
  handleSaveTransfer?: () => void;
  handleRevertTransfer?: () => void;
  handleProceedToStep2?: () => void;
  handleSaveProposal?: () => void;
  handleSendProposal?: () => void;
  sections: AddTransferPlayerSectionType[];
  mergedFormValues: Record<string, string>;
  booleanValues: Record<string, boolean>;
  formValues: Record<string, string>;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: Field,
  ) => void;
  handleBooleanChange: (id: string, value: boolean) => void;
  isLoading: boolean;
}

export const AddTransferPlayerScreen = ({
  career,
  onClose,
  proposalId,
  editTransfer,
  handleSaveTransfer,
  handleRevertTransfer,
  handleProceedToStep2,
  handleSaveProposal,
  handleSendProposal,
  sections,
  mergedFormValues,
  booleanValues,
  formValues,
  handleInputChange,
  handleBooleanChange,
  isLoading,
}: AddTransferPlayerScreenProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [isConfirmRevertOpen, setIsConfirmRevertOpen] = useState(false);
  const onSend = editTransfer
    ? (handleSaveTransfer || (() => {}))
    : (handleSendProposal || handleSaveProposal || handleSaveTransfer || handleProceedToStep2 || (() => {}));

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        backSeasons={onClose}
        titleText={
          editTransfer
            ? (formValues.playerName || editTransfer.player.name || "Editar Transferência")
            : proposalId
              ? "Editar Proposta"
              : "Nova Transferência"
        }
      />
      <Navbar
        save={onSend}
        options={["", editTransfer || proposalId ? "Salvar Alterações" : "Enviar Proposta", ""]}
        activeOption={1}
        onOptionClick={(index) => {
          if (index === 1) onSend();
        }}
      />
      <div className={Styles.container}>
        <div className={Styles.form_container}>
          <Form className={Styles.form} ref={formRef}>
            {booleanValues.isKnownPlayer && formValues.globalId && (
              <input type="hidden" name="globalId" value={formValues.globalId} />
            )}
            <input
              type="hidden"
              name="playedWithUs"
              value={
                booleanValues.isKnownPlayer
                  ? formValues.playedWithUs || ""
                  : ""
              }
            />
            {sections.map((section, index) => (
              <div key={index}>
                <FormSection
                  isMatch
                  title={section.title}
                  rows={section.fields}
                  formValues={mergedFormValues}
                  onInputChange={handleInputChange}
                  onBooleanChange={handleBooleanChange}
                  onActionClick={(action) => {
                    if (
                      action === "REVERT_TRANSFER_CONFIRM" ||
                      action === ModalType.REVERT_TRANSFER_CONFIRM
                    ) {
                      setIsConfirmRevertOpen(true);
                    }
                  }}
                />
              </div>
            ))}
          </Form>
        </div>
      </div>
      {isLoading && <Load isTransfers />}
      <Modal
        isOpen={isConfirmRevertOpen}
        closeModal={() => setIsConfirmRevertOpen(false)}
        animationContainer="grow"
        text="Desfazer Transferência?"
      >
        <DeleteConfirmModal
          onConfirm={() => {
            setIsConfirmRevertOpen(false);
            handleRevertTransfer?.();
          }}
          closeModal={() => setIsConfirmRevertOpen(false)}
        />
      </Modal>
    </>
  );
};

export default AddTransferPlayerScreen;
