import { useRef, useState } from "react";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import Styles from "./TransferPlayerScreen.module.css";
import { buildTransferSections } from "../../constants/buildTransfersFormSections";
import { buildLoanSections } from "../../constants/buildLoadFormSections";
import { useTransferPlayerContext } from "../../contexts/context";
import { Form } from "react-router-dom";
import FormSection from "../../../../../../../../../components/FormSection";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Load from "../../../../../../../../../components/Load";
import Navbar from "../../../../../../../../../ui/Navbar";
import Modal from "../../../../../../../../../components/Modal";
import DeleteConfirmModal from "../../../../../../../../../ui/modals/DeleteConfirmModal";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";

export const TransferPlayerScreen = () => {
  const formRef = useRef<HTMLFormElement>(null);
  const [isConfirmRevertOpen, setIsConfirmRevertOpen] = useState(false);

  const {
    career,
    player,
    onClose,
    activeTab,
    isLoading,
    formValues,
    booleanValues,
    mergedFormValues,
    navText,
    handleSave,
    handleSaveProposal,
    handleRevertTransfer,
    proposalId,
    editTransfer,
    handleCustomInputChange,
    handleBooleanChangeWrapper,
    filteredTeamOptions,
    isSellValueLocked,
    isToClubLocked,
    isTransferTypeLocked,
  } = useTransferPlayerContext();

  const typeSection = {
    title: "Tipo de Transferência",
    fields: [
      [
        {
          id: "transferType",
          name: "Qual o tipo da transferência?",
          icon: <FaMoneyBillTransfer />,
          inputType: "segmented" as const,
          options: ["Venda", "Emprestar"] as const,
          disabled: isTransferTypeLocked,
        },
      ],
    ],
  };

  const currentSections =
    activeTab === 1
      ? buildTransferSections(
          booleanValues,
          filteredTeamOptions,
          formValues,
          isSellValueLocked,
          isToClubLocked,
          isTransferTypeLocked,
          Boolean(editTransfer),
        )
      : buildLoanSections(
          booleanValues,
          player,
          filteredTeamOptions,
          Boolean(proposalId),
          Boolean(editTransfer),
        );

  const sections = [typeSection, ...currentSections];

  const isDirectExit =
    Boolean(editTransfer) ||
    (!proposalId &&
      ((activeTab === 1 &&
        (booleanValues.isRetirement || booleanValues.isEndContract)) ||
        (activeTab === 2 && (booleanValues.isReturnLoan || Boolean(player.loan)))));

  const onConfirmAction = isDirectExit
    ? handleSave
    : () => void handleSaveProposal(true);

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        isPlayer={true}
        player={player}
        titleText={
          editTransfer
            ? (player.name || "Editar Transferência")
            : proposalId
              ? "Editar Proposta"
              : activeTab === 1
                ? "Venda de Jogador"
                : "Empréstimo de Jogador"
        }
        backSeasons={onClose}
      />
      <Navbar
        save={onConfirmAction}
        options={["", navText, ""]}
        activeOption={1}
        onOptionClick={(index) => {
          if (index === 1) onConfirmAction();
        }}
      />
      <div className={Styles.container}>
        <Form
          className={Styles.form}
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            onConfirmAction();
          }}
        >
          {sections.map((section, index) => (
            <div key={index}>
              <FormSection
                isMatch
                title={section.title}
                rows={section.fields}
                formValues={mergedFormValues}
                onInputChange={handleCustomInputChange}
                onBooleanChange={handleBooleanChangeWrapper}
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

      {isLoading && <Load isTransfers />}
      <Modal
        isOpen={isConfirmRevertOpen}
        closeModal={() => setIsConfirmRevertOpen(false)}
        animationContainer="grow"
        text="Reverter Transferência?"
      >
        <DeleteConfirmModal
          onConfirm={handleRevertTransfer}
          closeModal={() => setIsConfirmRevertOpen(false)}
        />
      </Modal>
    </>
  );
};
