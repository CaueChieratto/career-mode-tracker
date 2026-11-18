import { useMemo } from "react";
import { useSeasons } from "../../hooks/useSeasons";
import { ClubData } from "../../../../../../common/interfaces/club/clubData";
import Styles from "./SeasonList.module.css";
import { sortSeasonsByNumber } from "../../../../../../common/utils/Sorts";
import { useModalManager } from "../../../../../../common/hooks/Modal/UseModalManager";
import { ModalType } from "../../../../../../common/types/enums/ModalType";
import ModalManager from "../../../../../../common/constants/ModalManager";
import { Career } from "../../../../../../common/interfaces/Career";
import SeasonCard from "../../ui/SeasonCard";

type SeasonListProps = {
  clubData: ClubData[];
  careerId: string;
  career: Career;
};

const SeasonList = ({ clubData, careerId, career }: SeasonListProps) => {
  const {
    handleNavigateToSeason,
    handleDeleteSeason,
    deletingSeasonId,
  } = useSeasons(careerId);

  const {
    activeModal,
    openModal,
    closeModal,
    selectedSeason,
    selectedCareer,
    setSelectedCareer,
  } = useModalManager();

  const sortedClubData = useMemo(() => {
    const seen = new Set<string>();
    const uniqueSeasons: ClubData[] = [];
    for (const season of clubData || []) {
      const key = season.id || `season-${season.seasonNumber}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSeasons.push(season);
      }
    }
    return sortSeasonsByNumber(uniqueSeasons);
  }, [clubData]);

  return (
    <section className={Styles.container_card}>
      {sortedClubData.map((season) => (
        <SeasonCard
          key={season.id}
          season={season}
          isLoading={deletingSeasonId === season.id}
          onClick={() => {
            if (deletingSeasonId) return;
            openModal(ModalType.SEASON_CONFIGS, career, season);
          }}
          onDelete={() => handleDeleteSeason(season.id, season.seasonNumber)}
        />
      ))}

      {activeModal !== ModalType.NONE && (
        <ModalManager
          activeModal={activeModal}
          selectedCareer={selectedCareer?.id ? selectedCareer : career}
          setSelectedCareer={setSelectedCareer}
          selectedSeason={selectedSeason}
          onClose={closeModal}
          onNavigateSeason={handleNavigateToSeason}
          career={selectedCareer?.id ? selectedCareer : career}
        />
      )}

      <SeasonCard
        title="Geral"
        titleClassName={Styles.general}
        onClick={() => {
          if (deletingSeasonId) return;
          openModal(ModalType.SEASON_CONFIGS, career, {
            id: "geral",
            seasonNumber: 0,
          } as unknown as ClubData);
        }}
      />
    </section>
  );
};

export default SeasonList;

