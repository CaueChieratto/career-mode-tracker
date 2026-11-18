import {
  FaHistory,
  FaTrophy,
  FaUsers,
  FaSyncAlt,
} from "react-icons/fa";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { Career } from "../../../../../common/interfaces/Career";
import {
  AcademyPlayers,
  AcademyTournaments,
} from "../../../../../common/interfaces/AcademyData";
import Styles from "../AcademyContent.module.css";
import { FeedEvent } from "../components/FeedItem/types/FeedEvent";
import { DashboardCardConfig } from "./types";
export type { DashboardCardConfig } from "./types";
import {
  PLAYER_SORT_OPTIONS,
  TOURNAMENT_SORT_OPTIONS,
} from "../constants/Sorts";
import {
  AcademyPlayersCardContent,
  AcademyTournamentsCardContent,
  AcademyFeedCardContent,
  AcademyActionsCardContent,
  AcademyPlayersSkeleton,
  AcademyTournamentsSkeleton,
  AcademyFeedSkeleton,
  AcademyActionsSkeleton,
} from "../components/Cards/contents";

type configProps = {
  career: Career;
  playersAcademy: AcademyPlayers[];
  allPlayersAcademy: AcademyPlayers[];
  tournamentsAcademy: AcademyTournaments[];
  feedData: FeedEvent[];
  activeCardIndex: number | null;
  selectedPlayerId: string | null;
  selectedTournamentId: string | null;
  onAddPlayerClick: () => void;
  onAddTournamentClick: () => void;
  onPromotePlayerClick: () => void;
  onPlayerClick: (playerId: string) => void;
  onTournamentClick: (id: string) => void;
  playerSort: string;
  setPlayerSort: (val: string) => void;
  tournamentSort: string;
  setTournamentSort: (val: string) => void;
  isGeral?: boolean;
  playerListMode: "academy" | "promoted" | "released";
  togglePlayerListMode: () => void;
};

export const getConfig = ({
  career,
  playersAcademy,
  allPlayersAcademy,
  feedData,
  activeCardIndex,
  selectedPlayerId,
  tournamentsAcademy,
  selectedTournamentId,
  onAddPlayerClick,
  onAddTournamentClick,
  onPromotePlayerClick,
  onPlayerClick,
  onTournamentClick,
  playerSort,
  setPlayerSort,
  tournamentSort,
  setTournamentSort,
  isGeral,
  playerListMode,
  togglePlayerListMode,
}: configProps): DashboardCardConfig[] => {
  let currentPlayersCount = playersAcademy.length;
  if (playerListMode === "promoted") {
    currentPlayersCount = allPlayersAcademy.filter(
      (p) => p.status === "promoted",
    ).length;
  } else if (playerListMode === "released") {
    currentPlayersCount = allPlayersAcademy.filter(
      (p) => p.status === "released",
    ).length;
  }

  const playersSkeletonCount =
    currentPlayersCount > 0
      ? activeCardIndex === 0
        ? currentPlayersCount
        : Math.min(currentPlayersCount, 3)
      : 3;

  const clubName = career.clubName;

  const cards: DashboardCardConfig[] = [
    {
      id: `players-card-${playerListMode}`,
      Icon: FaUsers,
      itemCount: currentPlayersCount,
      className: Styles.flipCard,
      title: (
        <span className={Styles.clickableTitleWrapper}>
          <span>
            {playerListMode === "academy"
              ? career.academy!.nickname
              : playerListMode === "promoted"
                ? "Jogadores Promovidos"
                : "Jogadores Dispensados"}
          </span>
          <span
            className={Styles.wrapperSpinIcon}
            onClick={(e) => {
              e.stopPropagation();
              togglePlayerListMode();
            }}
          >
            <FaSyncAlt size={14} className={Styles.spinIcon} />
          </span>
        </span>
      ),
      actionText: "Ver todos",
      sortOptions: PLAYER_SORT_OPTIONS,
      currentSort: playerSort,
      onSortChange: setPlayerSort,
      skeletonContent: (
        <AcademyPlayersSkeleton count={playersSkeletonCount} />
      ),
      children: (
        <AcademyPlayersCardContent
          playersAcademy={playersAcademy}
          allPlayersAcademy={allPlayersAcademy}
          playerListMode={playerListMode}
          activeCardIndex={activeCardIndex}
          selectedPlayerId={selectedPlayerId}
          onPlayerClick={onPlayerClick}
          playerSort={playerSort}
        />
      ),
    },
    {
      Icon: FaTrophy,
      title: career.academy!.tournament,
      actionText: "Ver todos",
      itemCount: tournamentsAcademy.length,
      sortOptions: TOURNAMENT_SORT_OPTIONS,
      currentSort: tournamentSort,
      onSortChange: setTournamentSort,
      skeletonContent: <AcademyTournamentsSkeleton />,
      children: (
        <AcademyTournamentsCardContent
          tournamentsAcademy={tournamentsAcademy}
          activeCardIndex={activeCardIndex}
          selectedTournamentId={selectedTournamentId}
          onTournamentClick={onTournamentClick}
        />
      ),
    },
    {
      Icon: FaHistory,
      title: "Feed de Atividades",
      actionText: "Ver feed completo",
      skeletonContent: <AcademyFeedSkeleton />,
      children: (
        <AcademyFeedCardContent
          feedData={feedData}
          activeCardIndex={activeCardIndex}
          isGeral={isGeral}
          clubName={clubName}
        />
      ),
    },
    {
      Icon: HiOutlineDocumentReport,
      title: "Ações Rápidas",
      className: Styles.actionsWidget,
      skeletonContent: <AcademyActionsSkeleton />,
      children: (
        <AcademyActionsCardContent
          onAddPlayerClick={onAddPlayerClick}
          onAddTournamentClick={onAddTournamentClick}
          onPromotePlayerClick={onPromotePlayerClick}
        />
      ),
    },
  ];

  if (isGeral) {
    return cards.filter((card) => card.Icon !== HiOutlineDocumentReport);
  }

  return cards;
};
