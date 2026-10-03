import { useState, useEffect } from "react";
import { LeagueLevels } from "../../../../../../common/constants/LeagueLevels";
import { Career } from "../../../../../../common/interfaces/Career";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { getContinentByCountry } from "../../../../../../common/services/GetContinentByCountry";
import { League } from "../../../../../../common/interfaces/League";
import { leaguesByContinent } from "../../../../../../common/utils/league";
import { SeasonCareerData } from "./useRenderableSeasons";
import { PlayersGroupService } from "../../../../../../common/services/ServicePlayers/PlayersGroupService";

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
  const normalizedName = player?.name.trim().toLowerCase();
  const normalizedNation = player?.nation.trim().toLowerCase();

  const seasonsPlayerPlayed = allSeasonsData.filter(({ season }) =>
    season.players.some(
      (p) =>
        p.name.trim().toLowerCase() === normalizedName &&
        p.nation.trim().toLowerCase() === normalizedNation,
    ),
  );

  const getSeasonString = (
    seasonNumber: number,
    specificCareer: Career,
  ): string => {
    const dateVal: unknown = specificCareer.createdAt;
    let createdDate = new Date();
    if (dateVal && typeof dateVal === "object" && "seconds" in dateVal) {
      createdDate = new Date((dateVal as { seconds: number }).seconds * 1000);
    } else if (dateVal) {
      createdDate = new Date(dateVal as string | Date | number);
    }

    const startYear = createdDate.getFullYear() + seasonNumber - 1;
    const continent = getContinentByCountry(specificCareer.nation);

    if (continent === "Europa") {
      const endYear = (startYear + 1).toString().slice(-2);
      return `${startYear.toString().slice(-2)}/${endYear}`;
    } else {
      return startYear.toString();
    }
  };

  const allLeagues: League[] = Object.values(leaguesByContinent)
    .flatMap((countryLeagues) => Object.values(countryLeagues))
    .flat();

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
