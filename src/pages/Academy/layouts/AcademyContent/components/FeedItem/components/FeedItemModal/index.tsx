import { createPortal } from "react-dom";
import { FaEdit } from "react-icons/fa";
import Styles from "./FeedItemModal.module.css";
import { FeedEvent } from "../../types/FeedEvent";
import { getModalTitle } from "./helpers/getModalTitle";
import { MatchDetails } from "./components/MatchDetails";
import { TournamentDetails } from "./components/TournamentDetails";
import { StatusDetails } from "./components/StatusDetails";
import { PositionDetails } from "./components/PositionDetails";
import { StatsDetails } from "./components/StatsDetails";
import { GenericDetails } from "./components/GenericDetails";
import { useAcademyContext } from "../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { OverflowText } from "../../../../../../../../components/OverflowText";

type FeedItemModalProps = {
  eventId: string | number;
  title: string;
  subtitle: string;
  socialSubtitle?: string;
  time: string;
  type: string;
  details?: FeedEvent["details"];
  onClose: (e?: React.MouseEvent) => void;
  clubName: string;
};

export const FeedItemModal = ({
  eventId,
  title,
  subtitle,
  socialSubtitle,
  time,
  type,
  details,
  clubName,
  onClose,
}: FeedItemModalProps) => {
  const {
    allCareers,
    career,
    setEditingEvolutionEvent,
    playerClick,
    setActiveCardIndex,
    isGeral,
    allPlayersAcademy,
  } = useAcademyContext();

  const modalText = socialSubtitle || subtitle;
  const matchStatus = details?.status;
  const teamBadge = career.teamBadge;

  const renderDynamicContent = () => {
    if (type === "match" && details?.lineup) {
      return (
        <MatchDetails
          details={details}
          clubName={clubName}
          allCareers={allCareers}
          teamBadge={teamBadge}
          allPlayersAcademy={allPlayersAcademy}
        />
      );
    }

    if (type === "tournament" && details) {
      return <TournamentDetails details={details} />;
    }

    if (type === "status" && details) {
      return <StatusDetails details={details} />;
    }

    if (type === "position" && details?.oldValue && details?.newValue) {
      return <PositionDetails details={details} modalText={modalText} />;
    }

    if (
      ["overall", "potential", "age", "height", "weight"].includes(type) &&
      details?.oldValue !== undefined &&
      details?.newValue !== undefined
    ) {
      return <StatsDetails details={details} type={type} />;
    }

    return <GenericDetails modalText={modalText} />;
  };

  const isEditableEvolution = [
    "overall",
    "potential",
    "age",
    "height",
    "weight",
    "sector",
    "position",
  ].includes(details?.changedAttribute || type);

  const player = allPlayersAcademy.find((p) => p.id === details?.playerId);
  const isReadOnlyPlayer =
    player?.status === "promoted" || player?.status === "released";

  const canEdit = isEditableEvolution && !isGeral && !isReadOnlyPlayer;

  const handleEditClick = () => {
    if (details?.playerId && canEdit) {
      setEditingEvolutionEvent({
        historyId: String(eventId),
        playerId: details.playerId,
        attribute: details.changedAttribute || type,
      });
      onClose();
      setActiveCardIndex(null);
      playerClick(details.playerId, true);
      localStorage.setItem(
        `@workspace_active_${details.playerId}`,
        "manage-player",
      );
    }
  };

  return createPortal(
    <div className={Styles.overlay} onClick={onClose}>
      <div className={Styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={Styles.modalHeader}>
          {canEdit && (
            <button
              className={Styles.editButton}
              onClick={handleEditClick}
              title="Editar Evolução"
            >
              <FaEdit />
            </button>
          )}
          <span className={Styles.ttTitle}>{getModalTitle(type)}</span>
          <div className={Styles.overflow}>
            <OverflowText text={title} className={Styles.ttValue} />
          </div>
          <span className={Styles.ttTitle}>{matchStatus}</span>
        </div>
        <div className={Styles.dynamicContent}>{renderDynamicContent()}</div>
        <span className={Styles.ttDate}>{time}</span>
      </div>
    </div>,
    document.body,
  );
};
