import Styles from "./TournamentEditor.module.css";
import { TournamentForm } from "../../forms/components/TournamentForm";
import Button from "../../../../../../../../components/Button";
import Modal from "../../../../../../../../components/Modal";
import DeleteConfirmModal from "../../../../../../../../ui/modals/DeleteConfirmModal";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { useState } from "react";
import { TournamentDataPayload } from "../../forms/types/TournamentDataPayload";
import { getSeasonStartYear } from "../../../../utils/getSeasonStartYear";
import { isEuropeanSeason } from "../../../../utils/isEuropeanSeason";

export const TournamentEditor = () => {
  const {
    selectedTournament,
    onUpdateTournament,
    onDeleteTournament,
    career,
    seasonId,
  } = useAcademyContext();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!selectedTournament) return null;

  const handleUpdate = async (data: TournamentDataPayload) => {
    if (!onUpdateTournament) return;

    let finalDate = selectedTournament.date;

    if (data.date) {
      const [day, month] = data.date.split("/");
      let year = getSeasonStartYear(career, seasonId);
      const isEurope = isEuropeanSeason(career);

      if (isEurope && Number(month) < 7) {
        year += 1;
      }
      finalDate = `${day}/${month}/${year}`;
    }

    const updatedTournament = {
      ...selectedTournament,
      date: finalDate,
    };

    await onUpdateTournament(updatedTournament);
  };

  const texts = {
    dateLabel: "Nova Data de Início",
    datePlaceholder: "DD/MM",
    submitText: "Salvar Alterações",
    loadingText: "Salvando...",
  };

  const handleCloseModal = () => {
    setIsDeleteModalOpen(false);
  };

  return (
    <div className={Styles.detailsContainer}>
      <TournamentForm
        isEdit
        initialData={selectedTournament}
        texts={texts}
        onSubmitData={handleUpdate}
      />

      <Button
        type="button"
        className={Styles.deleteBtn}
        onClick={() => setIsDeleteModalOpen(true)}
      >
        Apagar Torneio
      </Button>

      {isDeleteModalOpen && (
        <Modal
          isOpen
          closeModal={handleCloseModal}
          animationContainer="grow"
          text="Deletar Torneio?"
        >
          <DeleteConfirmModal
            onConfirm={() => {
              if (onDeleteTournament) {
                onDeleteTournament(selectedTournament.id);
              }
              handleCloseModal();
            }}
            closeModal={handleCloseModal}
          />
        </Modal>
      )}
    </div>
  );
};
