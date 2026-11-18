import { useMemo } from "react";
import { ClubData } from "../../../../../../common/interfaces/club/clubData";
import { calculateTotalStats } from "../../../../../../common/stats/helpers/calculateTotalStats";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { Career } from "../../../../../../common/interfaces/Career";
import { findPlayerInList } from "../../../../../../common/utils/playerIdentity";
import { getSeasonStartYear } from "../../../../../../common/utils/Date";

export type SeasonCareerData = {
  season: ClubData;
  career: Career;
};

export const useRenderableSeasons = (
  seasonsPlayerPlayed: SeasonCareerData[],
  player?: Players,
): SeasonCareerData[] => {
  const renderableSeasons = useMemo(() => {
    if (!player) return [];

    const filtered = seasonsPlayerPlayed.filter(({ season }) => {
      const playerInSeason = findPlayerInList(season.players, player);

      if (!playerInSeason) {
        return false;
      }

      const totalStats = calculateTotalStats(playerInSeason);
      return (
        totalStats.games > 0 ||
        totalStats.goals > 0 ||
        totalStats.assists > 0 ||
        totalStats.cleanSheets > 0 ||
        totalStats.minutesPlayed > 0 ||
        totalStats.defenses > 0
      );
    });

    return filtered.sort((a, b) => {
      const yearA = getSeasonStartYear(
        a.career.createdAt,
        a.season.seasonNumber,
      );
      const yearB = getSeasonStartYear(
        b.career.createdAt,
        b.season.seasonNumber,
      );
      return yearA - yearB;
    });
  }, [seasonsPlayerPlayed, player]);

  return renderableSeasons;
};
