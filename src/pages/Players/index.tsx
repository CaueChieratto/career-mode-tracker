import Load from "../../components/Load";
import NotFoundDisplay from "../../components/NotFoundDisplay";
import { useModalManager } from "../../common/hooks/Modal/UseModalManager";
import { ModalType } from "../../common/types/enums/ModalType";
import BottomMenu from "../../ui/BottomMenu";
import SectionView from "../../layout/SectionView";
import { usePlayerPageData } from "./hooks/usePlayerPageData";

import { PlayerGroupStatsProvider } from "./contexts/PlayerGroupStatsContext";

const Player = () => {
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
  } = usePlayerPageData();

  const { activeModal } = useModalManager();

  if (loading) {
    return <Load />;
  }

  if (!career || !season || !actualSeason) {
    return <NotFoundDisplay />;
  }

  const seasonLabel = totalSeasons === 1 ? "Temporada" : "Temporadas";

  const titleText =
    totalClubs > 1
      ? `${totalSeasons} ${seasonLabel} e ${totalClubs} Clubes`
      : `${totalSeasons} ${seasonLabel} no clube`;

  return (
    <PlayerGroupStatsProvider career={spoofedCareer!} isGeralPage={isNotSeason}>
      <SectionView
        isPlayer
        notSeason
        player={player}
        title={
          isNotSeason ? titleText : `Temporada ${actualSeason.seasonNumber}`
        }
        career={spoofedCareer!}
        season={actualSeason}
        tabsConfig={playerTabsConfig}
      />

      {activeModal === ModalType.NONE && <BottomMenu />}
    </PlayerGroupStatsProvider>
  );
};

export default Player;
