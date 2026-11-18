import Load from "../../../../components/Load";
import NotFoundDisplay from "../../../../components/NotFoundDisplay";
import { useModalManager } from "../../../../common/hooks/Modal/UseModalManager";
import { ModalType } from "../../../../common/types/enums/ModalType";
import BottomMenu from "../../../../ui/BottomMenu";
import { useSectionView } from "../../hooks/useSectionView";
import { SectionViewContent } from "../../components/SectionViewContent";
import { usePlayerPageData } from "./hooks/usePlayerPageData";
import { PlayerGroupStatsProvider } from "../../../../contexts/PlayerGroupStatsContext";
import type { PlayersViewProps } from "./types";
import type { Career } from "../../../../common/interfaces/Career";
import type { ClubData } from "../../../../common/interfaces/club/clubData";
import type { Players as PlayerType } from "../../../../common/interfaces/playersInfo/players";
import type { TabConfig } from "../../../../common/config/seasonTabsConfig";

interface LoadedPlayerViewProps {
  career: Career;
  actualSeason: ClubData;
  playerTabsConfig: TabConfig[];
  player?: PlayerType;
  isNotSeason: boolean;
  totalSeasons: number;
  totalClubs: number;
  onClose?: () => void;
}

const LoadedPlayerView = ({
  career,
  actualSeason,
  playerTabsConfig,
  player,
  isNotSeason,
  totalSeasons,
  totalClubs,
  onClose,
}: LoadedPlayerViewProps) => {
  const { activeModal } = useModalManager();

  const viewState = useSectionView({
    career,
    season: actualSeason,
    tabsConfig: playerTabsConfig,
    player,
    isPlayer: true,
    notSeason: isNotSeason,
  });

  const seasonLabel = totalSeasons === 1 ? "Temporada" : "Temporadas";
  const titleText =
    totalClubs > 1
      ? `${totalSeasons} ${seasonLabel} e ${totalClubs} Clubes`
      : `${totalSeasons} ${seasonLabel} no clube`;

  return (
    <>
      <SectionViewContent
        props={{
          isPlayer: true,
          notSeason: isNotSeason,
          player,
          title: isNotSeason
            ? titleText
            : `Temporada ${actualSeason.seasonNumber}`,
          career,
          season: actualSeason,
          tabsConfig: playerTabsConfig,
          backSeasons: onClose,
        }}
        section={viewState.section}
        navigation={viewState.navigation}
        tabs={viewState.tabs}
        modal={viewState.modal}
        updatePlayer={viewState.updatePlayer}
        backSeasons={onClose}
      />
      {activeModal === ModalType.NONE && (
        <BottomMenu playerId={player?.id} careerId={career.id} />
      )}
    </>
  );
};

const Players = (props: PlayersViewProps = {}) => {
  const {
    loading,
    career,
    season,
    actualSeason,
    player,
    spoofedCareer,
    playerTabsConfig,
    totalSeasons,
    totalClubs,
    isNotSeason,
    isFromGroup,
    effectiveGroupId,
  } = usePlayerPageData(props);

  if (loading) {
    return <Load />;
  }

  if (!career || !season || !actualSeason || !spoofedCareer) {
    return <NotFoundDisplay />;
  }

  return (
    <PlayerGroupStatsProvider
      career={spoofedCareer}
      isGeralPage={isNotSeason}
      isFromGroup={isFromGroup}
      groupId={effectiveGroupId}
    >
      <LoadedPlayerView
        career={spoofedCareer}
        actualSeason={actualSeason}
        playerTabsConfig={playerTabsConfig}
        player={player}
        isNotSeason={isNotSeason}
        totalSeasons={totalSeasons}
        totalClubs={totalClubs}
        onClose={props.onClose}
      />
    </PlayerGroupStatsProvider>
  );
};

export default Players;

