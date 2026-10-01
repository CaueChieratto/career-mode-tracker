import { LeagueLevels } from "../../constants/LeagueLevels";
import { Career } from "../../interfaces/Career";
import { ClubData } from "../../interfaces/club/clubData";
import { Trophy } from "../../interfaces/club/trophy";
import { Players } from "../../interfaces/playersInfo/players";
import { LeagueStats } from "../../interfaces/playersStats/leagueStats";
import { POSITION_DATA } from "../../types/Positions";

export const sortTrophies = (trophies: Career["trophies"]) => {
  return [...trophies].sort((a, b) => {
    const diffSeasons = b.seasons.length - a.seasons.length;
    if (diffSeasons !== 0) return diffSeasons;

    const levelA = LeagueLevels[a.leagueName] ?? 9999;
    const levelB = LeagueLevels[b.leagueName] ?? 9999;

    return levelA - levelB;
  });
};

export const sortPlayersByPosition = (players: Players[]) => {
  const positionSortOrder = POSITION_DATA.slice().flatMap(
    (group) => group.sortOrder,
  );

  return [...players].sort((a, b) => {
    const positionA = positionSortOrder.indexOf(a.position as string);
    const positionB = positionSortOrder.indexOf(b.position as string);
    if (positionA === -1) return 1;
    if (positionB === -1) return -1;
    return positionA - positionB;
  });
};

export const sortTrophySeasons = (seasons: Trophy["seasons"]) => {
  return [...seasons].sort((a, b) => {
    const yearA = parseInt(a.split("/")[0], 10);
    const yearB = parseInt(b.split("/")[0], 10);
    return yearA - yearB;
  });
};

export const sortSeasonsByNumber = (seasons: ClubData[]) => {
  return [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber);
};

export const sortPlayersByPositionWithinGroup = (
  players: Players[],
  sortOrder: string[],
) => {
  return [...players].sort((a, b) => {
    const indexA = sortOrder.indexOf(a.position as string);
    const indexB = sortOrder.indexOf(b.position as string);
    return indexA - indexB;
  });
};

export const sortLeaguesByLevel = (leagues: LeagueStats[]) => {
  return [...leagues].sort((a, b) => {
    const levelA = LeagueLevels[a.leagueName] ?? 999;
    const levelB = LeagueLevels[b.leagueName] ?? 999;
    return levelA - levelB;
  });
};
