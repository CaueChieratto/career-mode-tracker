import { useState, useEffect } from "react";
import { LeagueLevels } from "../../../../../../common/constants/LeagueLevels";
import { Career } from "../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { League } from "../../../../../../common/interfaces/League";
import { getAllLeaguesFlat } from "../../../../../../common/utils/league";
import { formatSeasonShortLabel } from "../../../../../../common/utils/Date";
import { SeasonCareerData } from "./useRenderableSeasons";
import { PlayersGroupService } from "../../../../../../common/services/ServicePlayers/PlayersGroupService";
import { findPlayerInList } from "../../../../../../common/utils/playerIdentity";

export const useSeasonsPlayerTab = (
  career: Career,
  player?: Players,
  isNotSeason?: boolean,
  isFromGroup?: boolean,
) => {
  const [expand, setExpand] = useState<Record<string, boolean>>({});
  const [allSeasonsData, setAllSeasonsData] = useState<SeasonCareerData[]>([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(
    Boolean(isNotSeason && isFromGroup && career?.groupId),
  );

  useEffect(() => {
    if (isNotSeason && isFromGroup && career?.groupId) {
      setIsLoadingSeasons(true);
      PlayersGroupService.getGroupSeasonsData(career.groupId, career.createdAt)
        .then((data) => {
          setAllSeasonsData(
            data.map((d) => ({ season: d.season, career: d.career })),
          );
        })
        .catch((err) =>
          console.error("Erro ao buscar temporadas do grupo:", err),
        )
        .finally(() => setIsLoadingSeasons(false));
    } else if (career) {
      setAllSeasonsData(career.clubData.map((s) => ({ season: s, career })));
      setIsLoadingSeasons(false);
    }
  }, [isNotSeason, isFromGroup, career]);

  const toggleExpand = (seasonId: string) => {
    setExpand((prev) => ({
      ...prev,
      [seasonId]: !prev[seasonId],
    }));
  };

  const playerId = player?.id;

  const seasonsPlayerPlayed = allSeasonsData.filter(({ season }) =>
    Boolean(findPlayerInList(season.players, player)),
  );

  const getSeasonString = (
    seasonNumber: number,
    specificCareer: Career,
  ): string =>
    formatSeasonShortLabel(
      specificCareer.createdAt,
      specificCareer.nation,
      seasonNumber,
    );

  const allLeagues: League[] = getAllLeaguesFlat();

  const getTrophiesWonInSeason = (
    seasonString: string,
    specificCareer: Career,
  ) => {
    return specificCareer.trophies
      .filter((trophy) => trophy.seasons.includes(seasonString))
      .sort(
        (a, b) =>
          (LeagueLevels[a.leagueName] ?? 999) -
          (LeagueLevels[b.leagueName] ?? 999),
      );
  };

  return {
    expand,
    toggleExpand,
    seasonsPlayerPlayed,
    getSeasonString,
    allLeagues,
    getTrophiesWonInSeason,
    playerId,
    isLoadingSeasons,
  };
};
