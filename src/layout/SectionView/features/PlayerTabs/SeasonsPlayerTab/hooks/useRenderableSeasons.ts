import { useMemo } from "react";
import { ClubData } from "../../../../../../common/interfaces/club/clubData";
import { calculateTotalStats } from "../../../ClubTabs/StatsTab_Club/components/PlayerStatsList/utils/calculateTotalStats";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { Career } from "../../../../../../common/interfaces/Career";
import { isSamePlayerId } from "../../../../../../common/utils/playerIdentity";

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
    const normalizedName = player.name.trim().toLowerCase();
    const normalizedNation = player.nation.trim().toLowerCase();

    const filtered = seasonsPlayerPlayed.filter(({ season }) => {
      const playerInSeason = season.players.find(
        (p) =>
          isSamePlayerId(p, player) ||
          (p.name.trim().toLowerCase() === normalizedName &&
            p.nation.trim().toLowerCase() === normalizedNation),
      );

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
      const getYear = (data: SeasonCareerData) => {
        const dateVal: unknown = data.career.createdAt;
        let createdDate = new Date();

        if (dateVal && typeof dateVal === "object" && "seconds" in dateVal) {
          createdDate = new Date(
            (dateVal as { seconds: number }).seconds * 1000,
          );
        } else if (dateVal) {
          createdDate = new Date(dateVal as string | Date | number);
        }

        return createdDate.getFullYear() + data.season.seasonNumber - 1;
      };

      return getYear(a) - getYear(b);
    });
  }, [seasonsPlayerPlayed, player]);

  return renderableSeasons;
};
