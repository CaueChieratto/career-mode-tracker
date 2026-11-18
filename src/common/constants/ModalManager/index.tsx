import { Dispatch, SetStateAction } from "react";
import Modal from "../../../components/Modal";
import DeleteConfirmModal from "../../../ui/modals/DeleteConfirmModal";
import { Career } from "../../interfaces/Career";
import { ModalType } from "../../types/enums/ModalType";
import SlideUpModal from "../../../ui/modals/SlideUpModal";
import { UseCloseModal } from "../../hooks/Modal/UseCloseModal";
import { Players } from "../../interfaces/playersInfo/players";
import TrophiesPanel from "../../../components/TrophiesPanel";
import { ClubData } from "../../interfaces/club/clubData";
import { SeasonConfigs } from "../../../ui/modals/SeasonConfigs";
import { getSeasonName } from "../../utils/GetSeasonName";
import ReturnLoanConfirmModal from "../../../ui/modals/ReturnLoanConfirmModal";
import { AddBadgeClub } from "../../../ui/modals/AddBadgeClub";
import { EditCareerModal } from "../../../ui/modals/EditCareerModal";
import { EditTeams } from "../../../ui/modals/EditTeams";

type ModalManagerProps = {
  activeModal: ModalType;
  selectedCareer: Career;
  setSelectedCareer: Dispatch<SetStateAction<Career>>;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  onSellConfirm?: (
    sellValue: string,
    toClub: string,
    dateExit: string,
    loanDuration?: string,
    wagePercentage?: string,
  ) => void | Promise<void>;
  onReturnLoanConfirm?: (returnDate: string) => void | Promise<void>;
  saveClick?: number;
  player?: Players;
  clubColor?: string;
  darkClubColor?: string;
  selectedSeason?: ClubData | null;
  onNavigateSeason?: (seasonId: string) => void;
  career?: Career;
  teamName?: string;
};

const ModalManager = ({
  activeModal,
  onClose,
  selectedCareer,
  setSelectedCareer,
  onConfirm,
  onReturnLoanConfirm,
  saveClick,
  onNavigateSeason,
  selectedSeason,
  career,
  teamName,
}: ModalManagerProps) => {
  const closeModal = () => {
    UseCloseModal(saveClick!, onClose);
  };

  switch (activeModal) {
    case ModalType.NEW_CAREER:
      return (
        <Modal
          isOpen
          isNormalTop
          closeModal={closeModal}
          animationContainer="left"
          text="Adicionar Carreira"
        >
          <EditCareerModal mode="create" closeModal={closeModal} />
        </Modal>
      );
    case ModalType.EDIT_TEAMS:
      return (
        <Modal
          isOpen
          isNormalTop
          closeModal={closeModal}
          animationContainer="right"
          text="Editar Times"
        >
          <EditTeams />
        </Modal>
      );
    case ModalType.DELETE_CONFIRM:
      return (
        <Modal
          isOpen
          closeModal={closeModal}
          animationContainer="grow"
          text="Apagar Carreira?"
        >
          <DeleteConfirmModal
            selectedCareer={selectedCareer!}
            closeModal={closeModal}
          ></DeleteConfirmModal>
        </Modal>
      );
    case ModalType.ADD_CLUB_IMG:
      return (
        <Modal
          isOpen
          closeModal={closeModal}
          text="Estilizar Clube"
          animationContainer="right"
        >
          <EditCareerModal
            closeModal={closeModal}
            mode="style"
            setSelectedCareer={setSelectedCareer}
            selectedCareer={selectedCareer!}
          />
        </Modal>
      );
    case ModalType.EDIT_CLUB:
      return (
        <Modal
          isOpen
          isNormalTop
          closeModal={closeModal}
          text="Editar Clube"
          animationContainer="left"
        >
          <EditCareerModal
            closeModal={closeModal}
            mode="edit"
            setSelectedCareer={setSelectedCareer}
            selectedCareer={selectedCareer!}
          />
        </Modal>
      );
    case ModalType.SLIDE_UP_PANEL:
      return (
        <Modal
          slideUp
          isOpen
          closeModal={closeModal}
          text="Editar Clube"
          animationContainer="left"
        >
          <SlideUpModal>
            <TrophiesPanel
              setSelectedCareer={setSelectedCareer}
              selectedCareer={selectedCareer!}
            />
          </SlideUpModal>
        </Modal>
      );
    case ModalType.DELETE_PLAYER_CONFIRM:
      return (
        <Modal
          isOpen
          closeModal={closeModal}
          animationContainer="grow"
          text="Deletar Jogador?"
        >
          <DeleteConfirmModal onConfirm={onConfirm!} closeModal={closeModal} />
        </Modal>
      );
    case ModalType.RETURN_LOAN_CONFIRM:
      return (
        <Modal
          isOpen
          closeModal={closeModal}
          animationContainer="grow"
          text="Retornar Jogador?"
        >
          <ReturnLoanConfirmModal
            onConfirm={onReturnLoanConfirm!}
            closeModal={closeModal}
          />
        </Modal>
      );
    case ModalType.SEASON_CONFIGS: {
      const isGeral = selectedSeason?.id === "geral";
      const formattedSeasonName =
        !isGeral && selectedSeason && career
          ? getSeasonName(
              selectedSeason.seasonNumber,
              career.createdAt,
              career.nation,
            )
          : "Visão Geral";

      return (
        <Modal
          isOpen
          closeModal={closeModal}
          animationContainer="grow"
          text={
            isGeral
              ? "Visão Geral"
              : `Temporada ${selectedSeason?.seasonNumber}`
          }
        >
          {selectedSeason && career && (
            <SeasonConfigs
              season={selectedSeason}
              career={career}
              setSelectedCareer={setSelectedCareer}
              seasonName={formattedSeasonName}
              isGeral={isGeral}
              onNavigate={() => {
                closeModal();
                if (onNavigateSeason) onNavigateSeason(selectedSeason.id);
              }}
            />
          )}
        </Modal>
      );
    }
    case ModalType.ADD_BADGE_CLUB:
      return (
        <Modal
          isOpen
          closeModal={closeModal}
          animationContainer="grow"
          text="Adicione o escudo"
        >
          <AddBadgeClub
            closeModal={closeModal}
            teamName={teamName || ""}
            careerId={selectedCareer?.id || career?.id || ""}
            seasonId={selectedSeason?.id || ""}
          />
        </Modal>
      );

    default:
      return null;
  }
};

export default ModalManager;
