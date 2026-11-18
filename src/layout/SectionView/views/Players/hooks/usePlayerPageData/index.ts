import { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { ClubData } from "../../../../../../common/interfaces/club/clubData";
import { useCareers } from "../../../../../../common/hooks/Career/UseCareer";
import { useAggregatedPlayers } from "../../../../../../common/hooks/Players/UseAggregatedPlayers";
import { aggregateFinancialReports } from "../../../../../../common/services/ServiceFinance/aggregation";
import { getSeasonTabsConfig } from "../../../../../../common/config/seasonTabsConfig";
import { createSpoofedCareer } from "../../helpers/createSpoofedCareer";
import { findPlayerForSeason } from "../../helpers/findPlayerForSeason";
import { getGroupCareers } from "../../helpers/getGroupCareers";
import { getPlayerCareerSummary } from "../../helpers/getPlayerCareerSummary";
import type { PlayerPageParams, PlayersViewProps } from "../../types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const usePlayerPageData = (params?: PlayersViewProps) => {
  const routeParams = useParams<PlayerPageParams>();
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const locationState = isRecord(location.state) ? location.state : undefined;

  const effectiveCareerId = params?.careerId ?? routeParams.careerId;
  const effectivePlayerId = params?.playerId ?? routeParams.playerId;
  const effectiveSeasonId = params?.seasonId ?? routeParams.seasonId;

  const isNotSeason =
    params?.isNotSeason ??
    (location.pathname.includes("/Geral") || !effectiveSeasonId);

  const isFromGroup =
    params?.isFromGroup ??
    (searchParams.get("fromGroup") === "true" ||
      Boolean(locationState?.fromGroup) ||
      location.pathname.includes("/CareerGroup"));

  const effectiveGroupId =
    params?.groupId ??
    searchParams.get("groupId") ??
    routeParams.groupId ??
    null;

  const hasExternalCareers = Array.isArray(params?.allCareers);
  const careersResult = useCareers(!hasExternalCareers);
  const fetchedCareers = careersResult?.careers ?? [];
  const fetchedLoading = careersResult?.loading ?? false;
  const allCareers = params?.allCareers ?? fetchedCareers;
  const loading = hasExternalCareers ? false : fetchedLoading;

  const career = useMemo(
    () => allCareers.find((c) => c.id === effectiveCareerId),
    [allCareers, effectiveCareerId],
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

  const season = useMemo(() => {
    if (isNotSeason) {
      if (!latestSeason) return undefined;
      return {
        ...latestSeason,
        players: aggregatedPlayers,
        financialReport: career ? aggregateFinancialReports(career) : undefined,
      };
    }
    return (
      career?.clubData.find((s) => s.id === effectiveSeasonId) || latestSeason
    );
  }, [isNotSeason, career, effectiveSeasonId, latestSeason, aggregatedPlayers]);

  const groupCareers = useMemo(
    () =>
      getGroupCareers({
        career,
        allCareers,
        isFromGroup,
        urlGroupId: effectiveGroupId,
      }),
    [allCareers, career, isFromGroup, effectiveGroupId],
  );

  const actualSeason = isNotSeason
    ? season
    : career?.clubData.find((item) => item.id === effectiveSeasonId) || season;

  const player = findPlayerForSeason({
    actualSeason,
    career,
    groupCareers,
    isFromGroup,
    playerId: effectivePlayerId,
    season,
  });

  const spoofedCareer = useMemo(
    () =>
      createSpoofedCareer({
        career,
        isFromGroup,
        isNotSeason,
        player,
        playerId: effectivePlayerId,
      }),
    [career, isFromGroup, isNotSeason, player, effectivePlayerId],
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
    isFromGroup,
    effectiveGroupId,
  };
};

