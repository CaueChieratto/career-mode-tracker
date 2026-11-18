import { useMemo, useState } from "react";
import { MatchForm } from "../../forms/components/MatchForm";
import Styles from "./CreateAcademyMatchForm.module.css";
import Button from "../../../../../../../../../../components/Button";
import Modal from "../../../../../../../../../../components/Modal";
import DeleteConfirmModal from "../../../../../../../../../../ui/modals/DeleteConfirmModal";
import { useAcademyContext } from "../../../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { AcademyMatches } from "../../../../../../../../../../common/interfaces/AcademyData";
import { buildTeamOptions } from "./helpers/buildTeamOptions";
import { useAcademyMatchMutations } from "./hooks/useAcademyMatchMutations";

type CreateAcademyMatchFormProps = {
  onMatchAdded?: () => void;
  initialData?: Partial<AcademyMatches>;
};

export const CreateAcademyMatchForm = ({
  onMatchAdded,
  initialData,
}: CreateAcademyMatchFormProps) => {
  const { allCareers, selectedTournament, tournamentsAcademy } =
    useAcademyContext();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { formKey, handleSubmitMatch, handleDeleteMatch } =
    useAcademyMatchMutations(initialData, onMatchAdded);

  const texts = {
    dateLabel: "Data da Partida",
    datePlaceholder: "DD/MM",
    opponentLabel: "Adversário",
    opponentPlaceholder: "Nome da equipe...",
    statusLabel: "Status / Fase",
    statusPlaceholder: "Ex: Final, Quartas",
    submitText: initialData?.id ? "Salvar Alterações" : "Adicionar Partida",
    loadingText: initialData?.id ? "Salvando..." : "Adicionando...",
  };

  const teamOptions = useMemo(() => {
    const allTeams = buildTeamOptions(allCareers);
    const existingOpponents =
      selectedTournament?.matches?.map((m) => m.opponentTeam) || [];

    return allTeams.filter((team) => {
      if (initialData?.opponentTeam === team) return true;

      return !existingOpponents.includes(team);
    });
  }, [allCareers, selectedTournament, initialData]);

  const statusOptions = useMemo(() => {
    const defaultPhases = ["Quartas de Final", "Semifinal", "Final"];
    const allPhases = new Set(defaultPhases);

    tournamentsAcademy?.forEach((t) => {
      t.matches?.forEach((m) => {
        if (m.status) allPhases.add(m.status.trim());
      });
    });

    const existingTournamentStatuses =
      selectedTournament?.matches?.map((m) => m.status?.trim()) || [];

    return Array.from(allPhases).filter((phase) => {
      if (initialData?.status?.trim() === phase) return true;
      return !existingTournamentStatuses.includes(phase);
    });
  }, [tournamentsAcademy, selectedTournament, initialData]);

  const handleConfirmDelete = async () => {
    await handleDeleteMatch();
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsDeleteModalOpen(false);
    document.body.classList.remove("modal-open");
  };

  return (
    <div className={Styles.detailsContainer}>
      <MatchForm
        key={formKey}
        texts={texts}
        teamOptions={teamOptions}
        statusOptions={statusOptions}
        onSubmitData={handleSubmitMatch}
        initialData={initialData}
      />

      {initialData?.id && (
        <>
          <Button
            type="button"
            className={Styles.deleteBtn}
            onClick={() => setIsDeleteModalOpen(true)}
          >
            Apagar Partida
          </Button>

          {isDeleteModalOpen && (
            <Modal
              isOpen
              closeModal={handleCloseModal}
              animationContainer="grow"
              text="Deletar Partida?"
            >
              <DeleteConfirmModal
                onConfirm={handleConfirmDelete}
                closeModal={handleCloseModal}
              />
            </Modal>
          )}
        </>
      )}
    </div>
  );
};
