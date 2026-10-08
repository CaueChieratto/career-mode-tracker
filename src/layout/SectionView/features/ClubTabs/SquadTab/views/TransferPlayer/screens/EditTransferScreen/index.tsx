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
import { buildEditTransferFormSections } from "../../constants/buildEditTransferFormSections";
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
    isLoading,
    formValues,
    filteredTeamOptions,
    handleInputChange,
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

  const sections = buildEditTransferFormSections(
    direction,
    formValues.transferType,
    filteredTeamOptions,
    contract,
    player,
  );

  return (
    <>
      <HeaderSeason
        careerId={career.id}
        career={career}
        backSeasons={onClose}
        titleText={player.name}
      />
      <Navbar
        save={handleSave}
        options={["", "Editar Transferência", ""]}
        activeOption={1}
        onOptionClick={(index) => {
          if (index === 1) handleSave();
        }}
      />
      <div className={Styles.container}>
        <Form className={Styles.form}>
          {sections.map((section, index) => (
            <FormSection
              key={index}
              title={section.title}
              rows={section.fields}
              formValues={formValues}
              onInputChange={handleInputChange}
              onActionClick={(action) => {
                if (
                  action === "REVERT_TRANSFER_CONFIRM" ||
                  action === ModalType.REVERT_TRANSFER_CONFIRM
                ) {
                  setIsConfirmRevertOpen(true);
                }
              }}
            />
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
}
