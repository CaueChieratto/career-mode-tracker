import { useMemo } from "react";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Career } from "../../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { useAggregatedPlayers } from "../../../../../../../common/hooks/Players/UseAggregatedPlayers";
import {
  aggregateSeasonClubStats,
  filterSupersededPlayers,
} from "../../helpers/aggregateSeasonClubStats";
import { AggregatedClubPlayer } from "../../types/clubStats.types";

interface UseClubPlayerStatsAggregationProps {
  season: ClubData;
  career: Career;
  isGeralPage: boolean;
  isGroup?: boolean;
  groupPlayers?: Players[];
}

/**
 * Hook reativo puro para obter os atletas com estatísticas agregadas do clube.
 * Substitui o antigo mergeMatchStats com _isAugmented e elimina qualquer travamento de cache.
 */
export const useClubPlayerStatsAggregation = ({
  season,
  career,
  isGeralPage,
  isGroup,
  groupPlayers,
}: UseClubPlayerStatsAggregationProps): AggregatedClubPlayer[] => {
  const careerAggregatedPlayers = useAggregatedPlayers(career);

  return useMemo(() => {
    if (isGroup && groupPlayers && groupPlayers.length > 0) {
      return groupPlayers as AggregatedClubPlayer[];
    }

    if (isGeralPage) {
      return careerAggregatedPlayers as AggregatedClubPlayer[];
    }

    const aggregated = aggregateSeasonClubStats({
      players: season.players || [],
      matches: season.matches || [],
      leagues: season.leagues || [],
      clubName: career.clubName || "",
    });

    return filterSupersededPlayers(aggregated);
  }, [
    isGroup,
    groupPlayers,
    isGeralPage,
    careerAggregatedPlayers,
    season.players,
    season.matches,
    season.leagues,
    career.clubName,
  ]);
};

