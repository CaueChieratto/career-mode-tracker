import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSeasonView } from "../../../../common/hooks/Seasons/UseSeasonView";
import { getSeasonTabsConfig } from "../../../../layout/SectionView/config/seasonTabsConfig";
import { createSpoofedCareer } from "../../helpers/createSpoofedCareer";
import { findPlayerForSeason } from "../../helpers/findPlayerForSeason";
import { getGroupCareers } from "../../helpers/getGroupCareers";
import { getPlayerCareerSummary } from "../../helpers/getPlayerCareerSummary";
import type { PlayerPageParams } from "../../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const usePlayerPageData = () => {
  const {
    loading,
    career,
    careers: allCareers,
    season,
  } = useSeasonView(true, true);
  const { playerId, seasonId } = useParams<PlayerPageParams>();
  const location = useLocation();
  const navigate = useNavigate();

  const isNotSeason = location.pathname.includes("/Geral") || !seasonId;

  const searchParams = new URLSearchParams(location.search);
  const locationState = isRecord(location.state) ? location.state : undefined;

  const isFromGroup =
    searchParams.get("fromGroup") === "true" ||
    Boolean(locationState?.fromGroup);

  const urlGroupId = searchParams.get("groupId");

  const groupCareers = useMemo(
    () =>
      getGroupCareers({
        career,
        allCareers,
        isFromGroup,
        urlGroupId,
      }),
    [allCareers, career, isFromGroup, urlGroupId],
  );

  const actualSeason = isNotSeason
    ? season
    : career?.clubData.find((item) => item.id === seasonId) || season;

  const player = findPlayerForSeason({
    actualSeason,
    career,
    groupCareers,
    isFromGroup,
    playerId,
    season,
  });

  const spoofedCareer = useMemo(
    () =>
      createSpoofedCareer({
        career,
        isFromGroup,
        isNotSeason,
        player,
        playerId,
      }),
    [career, isFromGroup, isNotSeason, player, playerId],
  );

  const playerTabsConfig = useMemo(() => {
    if (!spoofedCareer || !actualSeason) {
      return [];
    }

    return getSeasonTabsConfig(
      spoofedCareer,
      actualSeason.id,
      navigate,
      true,
      isNotSeason,
      player,
    );
  }, [actualSeason, isNotSeason, navigate, player, spoofedCareer]);

  const { totalSeasons, totalClubs } = useMemo(
    () =>
      getPlayerCareerSummary({
        careers: groupCareers,
        player,
      }),
    [groupCareers, player],
  );

  return {
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
  };
};
