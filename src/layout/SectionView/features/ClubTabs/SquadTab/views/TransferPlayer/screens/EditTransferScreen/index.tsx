import { useState } from "react";
import { Form } from "react-router-dom";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import FormSection from "../../../../../../../../../components/FormSection";
import HeaderSeason from "../../../../../../../../../components/HeaderSeason";
import Load from "../../../../../../../../../components/Load";
import Modal from "../../../../../../../../../components/Modal";
import Navbar from "../../../../../../../../../ui/Navbar";
import DeleteConfirmModal from "../../../../../../../../../ui/modals/DeleteConfirmModal";
import { ModalType } from "../../../../../../../../../common/types/enums/ModalType";
import {
  buildEditTransferStep1Sections,
  buildEditTransferStep2Sections,
} from "../../constants/buildEditTransferFormSections";
import { useEditTransferForm } from "../../hooks/useEditTransferForm";
import Styles from "./EditTransferScreen.module.css";

type EditTransferScreenProps = {
  career: Career;
  season: ClubData;
  player: Players;
  contract: NonNullable<Players["contract"]>[number];
  contractIndex: number;
  direction: "arrivals" | "exit";
  onClose: () => void;
};

export default function EditTransferScreen({
  career,
  season,
  player,
  contract,
  contractIndex,
  direction,
  onClose,
}: EditTransferScreenProps) {
  const [isConfirmRevertOpen, setIsConfirmRevertOpen] = useState(false);

  const {
    currentStep,
    handleProceedToStep2,
    handleReturnToStep1,
    isLoading,
    formValues,
    booleanValues,
    mergedFormValues,
    filteredTeamOptions,
    handleCustomInputChange,
    handleBooleanChangeWrapper,
    handleSave,
    handleRevertTransfer,
  } = useEditTransferForm({
    career,
    season,
    player,
    contract,
    contractIndex,
    direction,
    onClose,
  });

  const isLoan =
    formValues.transferType === "Emprestar" ||
    formValues.transferType === "Empréstimo" ||
    Boolean(contract.isLoan);

  const isLoanSingleScreen = isLoan;

  const step1Sections = buildEditTransferStep1Sections(
    direction,
    formValues.transferType,
    filteredTeamOptions,
    contract,
    player,
    booleanValues,
  );

  const step2Sections = buildEditTransferStep2Sections(
    direction,
    formValues.transferType,
  );

  const sections =
    isLoanSingleScreen || currentStep === 1 ? step1Sections : step2Sections;

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        backSeasons={
          !isLoanSingleScreen && currentStep === 2 ? handleReturnToStep1 : onClose
        }
        titleText={player.name}
      />
      <Navbar
        save={
          isLoanSingleScreen || currentStep === 2 ? handleSave : handleProceedToStep2
        }
        options={[
          "",
          isLoanSingleScreen || currentStep === 2
            ? "Salvar Alterações"
            : "Próximo",
          "",
        ]}
        activeOption={1}
        onOptionClick={(index) => {
          if (index === 1) {
            if (isLoanSingleScreen || currentStep === 2) {
              handleSave();
            } else {
              handleProceedToStep2();
            }
          }
        }}
      />
      <div className={Styles.container}>
        <Form className={Styles.form}>
          {sections.map((section, index) => (
            <div key={index}>
              <FormSection
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
          {currentStep === 2 && (
            <div className={Styles.noticeContainer}>
              <p className={Styles.noticeText}>
                As cláusulas contratuais e metas deste atleta são administradas na tela de Cláusulas Contratuais.
              </p>
            </div>
          )}
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
}
