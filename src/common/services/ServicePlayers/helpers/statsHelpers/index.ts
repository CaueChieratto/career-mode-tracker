import { Players } from "../../../../interfaces/playersInfo/players";
import { LeagueStats } from "../../../../interfaces/playersStats/leagueStats";
import { areLeagueStatsIdentical } from "../../../../../layout/SectionView/helpers/mergeMatchStats";

export const aggregatePlayerStats = (
  playerHistoryMap: Map<string, Players[]>,
): Players[] => {
  const finalPlayers: Players[] = [];

  playerHistoryMap.forEach((history) => {
    const latestPlayerState = { ...history[history.length - 1] };
    const maxOverall = Math.max(...history.map((p) => p.overall || 0));
    latestPlayerState.overall = maxOverall;

    const leagueStatsMap = new Map<string, LeagueStats>();
    let totalBallonDor = 0;
    let prevStats: LeagueStats[] | null = null;

    history.forEach((seasonPlayer) => {
      const currentStats = seasonPlayer.statsLeagues || [];
      const isClone =
        prevStats !== null && areLeagueStatsIdentical(prevStats, currentStats);
      prevStats = currentStats;

      if (isClone) {
        return;
      }

      totalBallonDor += seasonPlayer.ballonDor || 0;
      currentStats.forEach((leagueStat) => {
        const existingLeague = leagueStatsMap.get(leagueStat.leagueName);
        if (existingLeague) {
          const oldTotalRating =
            existingLeague.stats.rating * existingLeague.stats.games;
          const newTotalRating =
            leagueStat.stats.rating * leagueStat.stats.games;
          const totalGames =
            existingLeague.stats.games + leagueStat.stats.games;

          existingLeague.stats.games += leagueStat.stats.games;
          existingLeague.stats.goals += leagueStat.stats.goals;
          existingLeague.stats.assists += leagueStat.stats.assists;
          existingLeague.stats.cleanSheets += leagueStat.stats.cleanSheets;
          existingLeague.stats.minutesPlayed =
            (existingLeague.stats.minutesPlayed || 0) +
            (leagueStat.stats.minutesPlayed || 0);
          existingLeague.stats.defenses =
            (existingLeague.stats.defenses || 0) +
            (leagueStat.stats.defenses || 0);
          existingLeague.stats.rating =
            totalGames > 0
              ? parseFloat(
                  ((oldTotalRating + newTotalRating) / totalGames).toFixed(2),
                )
              : 0;
        } else {
          leagueStatsMap.set(
            leagueStat.leagueName,
            JSON.parse(JSON.stringify(leagueStat)),
          );
        }
      });
    });

    latestPlayerState.statsLeagues = Array.from(leagueStatsMap.values());
    latestPlayerState.ballonDor = totalBallonDor;
    finalPlayers.push(latestPlayerState);
  });

  return finalPlayers;
};
