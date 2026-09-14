import { Career } from "../../../../common/interfaces/Career";
import { ClubData } from "../../../../common/interfaces/club/clubData";
import { Players } from "../../../../common/interfaces/playersInfo/players";
import { LeagueStats } from "../../../../common/interfaces/playersStats/leagueStats";
import { League } from "../../../../common/interfaces/League";
import { Match } from "../../../../common/interfaces/Match";

export const getUnifiedPlayerLeagueStats = (
  player: Players,
  matches: Match[],
  seasonLeagues: League[],
  clubName: string,
): LeagueStats[] => {
  const manualStats = player.statsLeagues || [];
  const matchStatsMap: Record<string, LeagueStats & { ratingSum: number }> = {};

  const uniqueMatches = Array.from(
    new Map(matches.map((m) => [m.matchesId, m])).values(),
  );

  uniqueMatches.forEach((match) => {
    if (match.status !== "FINISHED") return;
    const pStat = match.playerStats?.find((p) => p.playerId === player.id);
    if (!pStat) return;

    const leagueName = match.league;
    if (!matchStatsMap[leagueName]) {
      const leagueImage =
        seasonLeagues?.find((l) => l.name === leagueName)?.logo || "";
      matchStatsMap[leagueName] = {
        leagueName,
        leagueImage,
        stats: {
          games: 0,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          rating: 0,
          minutesPlayed: 0,
          defenses: 0,
        },
        ratingSum: 0,
      };
    }

    const isHome = match.homeTeam === clubName;
    const concededGoals = isHome ? match.awayScore || 0 : match.homeScore || 0;
    const earnedCleanSheet = concededGoals === 0 ? 1 : 0;

    const ms = matchStatsMap[leagueName];
    ms.stats.games += 1;
    ms.stats.goals += pStat.goals || 0;
    ms.stats.assists += pStat.assists || 0;
    ms.stats.cleanSheets += earnedCleanSheet;
    ms.stats.minutesPlayed =
      (ms.stats.minutesPlayed || 0) + (pStat.minutesPlayed || 0);
    ms.stats.defenses = (ms.stats.defenses || 0) + (pStat.defenses || 0);
    ms.ratingSum += pStat.rating || 0;
  });

  const mergedMap: Record<string, LeagueStats & { ratingSum: number }> = {};

  manualStats.forEach((m) => {
    mergedMap[m.leagueName] = {
      ...m,
      ratingSum: m.stats.rating * m.stats.games,
      stats: {
        ...m.stats,
        minutesPlayed: m.stats.minutesPlayed || 0,
        defenses: m.stats.defenses || 0,
      },
    };
  });

  Object.values(matchStatsMap).forEach((m) => {
    if (mergedMap[m.leagueName]) {
      const s = mergedMap[m.leagueName].stats;
      s.games += m.stats.games;
      s.goals += m.stats.goals;
      s.assists += m.stats.assists;
      s.cleanSheets += m.stats.cleanSheets;
      s.minutesPlayed = (s.minutesPlayed || 0) + (m.stats.minutesPlayed || 0);
      s.defenses = (s.defenses || 0) + (m.stats.defenses || 0);
      mergedMap[m.leagueName].ratingSum += m.ratingSum;
    } else {
      mergedMap[m.leagueName] = m;
    }
  });

  return Object.values(mergedMap).map((item) => {
    const games = item.stats.games;
    item.stats.rating =
      games > 0 ? Number((item.ratingSum / games).toFixed(2)) : 0;
    const { ...cleanItem } = item;
    return cleanItem as LeagueStats;
  });
};

type AugmentedClubData = ClubData & { _isAugmented?: boolean };
type AugmentedPlayer = Players & { _isAugmented?: boolean };
type MaybeAugmentedPlayer = Players & { _isAugmented?: boolean };

export const toRawPlayer = (player: Players): Players => {
  const clean = { ...player } as MaybeAugmentedPlayer;
  delete clean._isAugmented;
  delete clean.manualStatsLeagues;
  return clean;
};

export const augmentSeasonWithMatchStats = (
  season: ClubData,
  clubName: string,
): ClubData => {
  const currentSeason = season as AugmentedClubData;

  if (currentSeason._isAugmented) return season;

  const augmentedPlayers = season.players.map((player) => {
    const currentPlayer = player as AugmentedPlayer;
    if (currentPlayer._isAugmented) return player;

    return {
      ...player,
      manualStatsLeagues: player.statsLeagues,
      statsLeagues: getUnifiedPlayerLeagueStats(
        player,
        season.matches || [],
        season.leagues || [],
        clubName,
      ),
      _isAugmented: true,
    };
  });

  return {
    ...season,
    players: augmentedPlayers,
    _isAugmented: true,
  } as ClubData;
};

export const augmentCareerWithMatchStats = (career: Career): Career => {
  return {
    ...career,
    clubData: career.clubData.map((season) =>
      augmentSeasonWithMatchStats(season, career.clubName),
    ),
  };
};

type AggregatedLeague = LeagueStats & { ratingSum: number };
type AggregatedPlayer = Players & {
  _leagueMap: Record<string, AggregatedLeague>;
};

export const getAggregatedPlayersForCareer = (career: Career): Players[] => {
  const playerMap: Record<string, AggregatedPlayer> = {};

  career.clubData.forEach((season) => {
    season.players.forEach((player) => {
      const normalizedName = player.name.trim().toLowerCase();
      const normalizedNation = player.nation.trim().toLowerCase();
      const key = `${normalizedName}-${normalizedNation}`;

      if (!playerMap[key]) {
        playerMap[key] = {
          ...player,
          statsLeagues: [],
          _leagueMap: {},
        };
      } else {
        const existingLeagueMap = playerMap[key]._leagueMap;
        const existingBallonDor = playerMap[key].ballonDor;
        playerMap[key] = {
          ...player,
          statsLeagues: [],
          _leagueMap: existingLeagueMap,
        };
        playerMap[key].ballonDor = existingBallonDor;
      }

      const targetPlayer = playerMap[key];

      targetPlayer.ballonDor =
        (targetPlayer.ballonDor || 0) + (player.ballonDor || 0);

      (player.statsLeagues || []).forEach((league) => {
        if (!targetPlayer._leagueMap[league.leagueName]) {
          targetPlayer._leagueMap[league.leagueName] = {
            ...league,
            stats: {
              ...league.stats,
              minutesPlayed: league.stats.minutesPlayed || 0,
              defenses: league.stats.defenses || 0,
            },
            ratingSum: (league.stats.rating || 0) * (league.stats.games || 0),
          };
        } else {
          const existing = targetPlayer._leagueMap[league.leagueName];
          existing.stats.games += league.stats.games || 0;
          existing.stats.goals += league.stats.goals || 0;
          existing.stats.assists += league.stats.assists || 0;
          existing.stats.cleanSheets += league.stats.cleanSheets || 0;
          existing.stats.minutesPlayed =
            (existing.stats.minutesPlayed || 0) +
            (league.stats.minutesPlayed || 0);
          existing.stats.defenses =
            (existing.stats.defenses || 0) + (league.stats.defenses || 0);
          existing.ratingSum +=
            (league.stats.rating || 0) * (league.stats.games || 0);
        }
      });
    });
  });

  return Object.values(playerMap).map((p) => {
    const leagues = Object.values(p._leagueMap).map((l) => {
      const games = l.stats.games;
      l.stats.rating = games > 0 ? Number((l.ratingSum / games).toFixed(2)) : 0;

      return {
        leagueName: l.leagueName,
        leagueImage: l.leagueImage,
        stats: l.stats,
      } as LeagueStats;
    });

    const playerData = { ...p };
    delete (playerData as Partial<AggregatedPlayer>)._leagueMap;

    return { ...playerData, statsLeagues: leagues } as Players;
  });
};
