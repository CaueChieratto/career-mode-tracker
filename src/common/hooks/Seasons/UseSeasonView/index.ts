import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClubData } from "../../../interfaces/club/clubData";
import { useCareers } from "../../Career/UseCareer";
import { useOpenTransfersModal } from "../../Modal/UseOpenTransfersModal";
import { useAggregatedPlayers } from "../../Players/UseAggregatedPlayers";
import { getSeasonTabsConfig } from "../../../../layout/SectionView/config/seasonTabsConfig";

export const useSeasonView = (isGeralPage: boolean, isPlayer?: boolean) => {
  const { careerId, seasonId } = useParams<{
    careerId: string;
    seasonId?: string;
  }>();
  const navigate = useNavigate();
  const { careers, loading } = useCareers();

  const career = useMemo(
    () => careers.find((c) => c.id === careerId),
    [careers, careerId],
  );

  const aggregatedPlayers = useAggregatedPlayers(career);

  const latestSeason = useMemo(() => {
    if (!career || !career.clubData || career.clubData.length === 0) {
      return undefined;
    }
    return career.clubData.reduce((latest: ClubData, current: ClubData) => {
      return current.seasonNumber > latest.seasonNumber ? current : latest;
    });
  }, [career]);

  const seasonData = useMemo(() => {
    if (isGeralPage) {
      if (!latestSeason) return undefined;
      return {
        ...latestSeason,
        players: aggregatedPlayers,
      };
    }
    return career?.clubData.find((s) => s.id === seasonId);
  }, [isGeralPage, career, seasonId, latestSeason, aggregatedPlayers]);

  const tabsConfig = useMemo(() => {
    if (!career) return [];

    if (isGeralPage) {
      if (!latestSeason) return [];
      return getSeasonTabsConfig(career, latestSeason.id, navigate, !!isPlayer);
    }
    if (!seasonId) return [];
    return getSeasonTabsConfig(career, seasonId, navigate, !!isPlayer);
  }, [career, seasonId, navigate, isGeralPage, latestSeason, isPlayer]);

  const {
    isModalOpen,
    transferType,
    playersToShow,
    handleOpenTransfers,
    handleCloseModal,
  } = useOpenTransfersModal(
    career,
    isGeralPage ? (latestSeason ?? undefined) : seasonData,
  );

  return {
    loading,
    career,
    careers,
    season: seasonData,
    tabsConfig,
    isModalOpen,
    transferType,
    playersToShow,
    handleOpenTransfers,
    handleCloseModal,
  };
};
