import { useMemo, useState, useEffect } from "react";
import { Career } from "../../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { Trophy } from "../../../../../../../common/interfaces/club/trophy";
import { LeagueLevels } from "../../../../../../../common/constants/LeagueLevels";
import { calculateTotalStats } from "../../../../../../../common/stats/helpers/calculateTotalStats";
import { formatSeasonShortLabel } from "../../../../../../../common/utils/Date";
import { SeasonCareerData } from "../../../SeasonsPlayerTab/hooks/useRenderableSeasons";
import { PlayersGroupService } from "../../../../../../../common/services/ServicePlayers/PlayersGroupService";
import { findPlayerInList } from "../../../../../../../common/utils/playerIdentity";

export const useTotalPlayerTab = (
  career: Career,
  player?: Players,
  isNotSeason?: boolean,
  isFromGroup?: boolean,
) => {
  const [allSeasonsData, setAllSeasonsData] = useState<SeasonCareerData[]>([]);
  const [isLoading, setIsLoading] = useState(
    Boolean(isNotSeason && isFromGroup && career?.groupId),
  );

  useEffect(() => {
    if (isNotSeason && isFromGroup && career?.groupId) {
      setIsLoading(true);
      PlayersGroupService.getGroupSeasonsData(career.groupId, career.createdAt)
        .then((data) => {
          setAllSeasonsData(
            data.map((d) => ({ season: d.season, career: d.career })),
          );
        })
        .catch((err) =>
          console.error("Erro ao buscar temporadas para totais:", err),
        )
        .finally(() => setIsLoading(false));
    } else if (career) {
      setAllSeasonsData(career.clubData.map((s) => ({ season: s, career })));
      setIsLoading(false);
    }
  }, [isNotSeason, isFromGroup, career]);

  const { allTrophiesWon, seasonsCount } = useMemo(() => {
    if (!player || allSeasonsData.length === 0)
      return { allTrophiesWon: [], seasonsCount: 0 };

    const seasonsPlayerPlayed = allSeasonsData.filter(({ season }) => {
      const playerInSeason = findPlayerInList(season.players, player);

      if (!playerInSeason) return false;

      const totalStats = calculateTotalStats(playerInSeason);

      return (
        totalStats.games > 0 ||
        totalStats.goals > 0 ||
        totalStats.assists > 0 ||
        totalStats.defenses > 0 ||
        totalStats.minutesPlayed > 0 ||
        totalStats.cleanSheets > 0
      );
    });

    const seasonsPlayerPlayedStrings = seasonsPlayerPlayed.map(
      ({ season, career: specificCareer }) =>
        formatSeasonShortLabel(
          specificCareer.createdAt,
          specificCareer.nation,
          season.seasonNumber,
        ),
    );

    const uniqueCareers = Array.from(
      new Set(allSeasonsData.map((d) => d.career.id)),
    ).map((id) => allSeasonsData.find((d) => d.career.id === id)!.career);

    const aggregatedTrophies: Trophy[] = [];
    uniqueCareers.forEach((c) => {
      c.trophies.forEach((t) => {
        const existingTrophy = aggregatedTrophies.find(
          (at) => at.leagueName === t.leagueName,
        );
        if (existingTrophy) {
          existingTrophy.seasons = Array.from(
            new Set([...existingTrophy.seasons, ...t.seasons]),
          );
        } else {
          aggregatedTrophies.push({ ...t, seasons: [...t.seasons] });
        }
      });
    });

    const playerTrophies = aggregatedTrophies
      .map((trophy) => {
        const seasonsWonByPlayer = trophy.seasons.filter((season) =>
          seasonsPlayerPlayedStrings.includes(season),
        );

        if (seasonsWonByPlayer.length > 0) {
          return {
            ...trophy,
            seasons: seasonsWonByPlayer,
          };
        }
        return null;
      })
      .filter((trophy): trophy is Trophy => trophy !== null);

    const sortedTrophies = playerTrophies.sort(
      (a, b) =>
        (LeagueLevels[a.leagueName] ?? 999) -
        (LeagueLevels[b.leagueName] ?? 999),
    );

    return {
      allTrophiesWon: sortedTrophies,
      seasonsCount: seasonsPlayerPlayed.length,
    };
  }, [allSeasonsData, player]);

  return { allTrophiesWon, seasonsCount, isLoading };
};
