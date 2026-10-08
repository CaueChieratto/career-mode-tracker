import { ClubData } from "../../interfaces/club/clubData";
import { Career } from "../../interfaces/Career";
import { Players } from "../../interfaces/playersInfo/players";
import { LeagueStats } from "../../interfaces/playersStats/leagueStats";
import { Match } from "../../interfaces/Match";
import { AugmentedCareer } from "../../interfaces/ComparePlayers";
import { formatDisplayValue } from "../../utils/FormatValue";
import { calculateTotalStats } from "../../../layout/SectionView/features/ClubTabs/StatsTab_Club/components/PlayerStatsList/utils/calculateTotalStats";
import {
  augmentSeasonWithMatchStats,
  areLeagueStatsIdentical,
} from "../../../layout/SectionView/helpers/mergeMatchStats";
import {
  getPlayerIdentityKey,
  matchPlayerStatToPlayer,
} from "../../utils/playerIdentity";
import { ConsolidatedPlayerStats } from "../types/metric.types";

interface PlayerInternalAccumulator {
  player: Players;
  games: number;
  ratingSum: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  cleanSheets: number;
  defenses: number;
  totalFinishings: number;
  finishingsMissed: number;
  totalPasses: number;
  passesMissed: number;
  keyPasses: number;
  totalDribbles: number;
  dribblesMissed: number;
  ballsRecovered: number;
  ballsLost: number;
  yellowCards: number;
  redCards: number;
  distanceKm: number;
  maxDistanceKmInGame: number;
  ownGoals: number;
}

export interface AggregateSeasonCareerOptions {
  season?: ClubData;
  career: Career;
  isGeralPage: boolean;
  minPercentage?: number;
  careerSeasonsData?: { clubName: string; season: ClubData }[];
}

export const aggregateAllPlayersStats = ({
  season,
  career,
  isGeralPage,
  minPercentage = 0.2,
  careerSeasonsData,
}: AggregateSeasonCareerOptions): ConsolidatedPlayerStats[] => {
  const rawSeasonsToProcess: { clubName: string; season: ClubData }[] =
    isGeralPage
      ? careerSeasonsData ||
        (career.clubData || []).map((s) => ({
          clubName:
            (s as unknown as { clubName?: string }).clubName || career.clubName,
          season: s,
        }))
      : season
        ? [{ clubName: career.clubName, season }]
        : [];

  const seasonsToProcess = rawSeasonsToProcess.map(
    ({ clubName, season: s }) => ({
      clubName,
      season: augmentSeasonWithMatchStats(s, clubName),
    }),
  );

  const playerStatsMap = new Map<string, PlayerInternalAccumulator>();
  const prevSeasonStatsMap = new Map<string, LeagueStats[]>();

  seasonsToProcess.forEach(({ season: s }) => {
    s.players.forEach((p) => {
      const key = getPlayerIdentityKey(p, career.id);
      const currentStats = p.statsLeagues || [];
      const prevStats = prevSeasonStatsMap.get(key);
      const isClone =
        prevStats !== undefined &&
        areLeagueStatsIdentical(prevStats, currentStats);
      prevSeasonStatsMap.set(key, currentStats);

      let baseGames = 0,
        baseRatingSum = 0,
        baseGoals = 0,
        baseAssists = 0,
        baseMinutes = 0,
        baseCleanSheets = 0,
        baseDefenses = 0;

      if (!isClone) {
        currentStats.forEach((l) => {
          baseGames += l.stats.games || 0;
          baseRatingSum += (l.stats.rating || 0) * (l.stats.games || 0);
          baseGoals += l.stats.goals || 0;
          baseAssists += l.stats.assists || 0;
          baseMinutes += l.stats.minutesPlayed || 0;
          baseCleanSheets += l.stats.cleanSheets || 0;
          baseDefenses += l.stats.defenses || 0;
        });
      }

      if (!playerStatsMap.has(key)) {
        playerStatsMap.set(key, {
          player: p,
          games: baseGames,
          ratingSum: baseRatingSum,
          goals: baseGoals,
          assists: baseAssists,
          minutesPlayed: baseMinutes,
          cleanSheets: baseCleanSheets,
          defenses: baseDefenses,
          totalFinishings: 0,
          finishingsMissed: 0,
          totalPasses: 0,
          passesMissed: 0,
          keyPasses: 0,
          totalDribbles: 0,
          dribblesMissed: 0,
          ballsRecovered: 0,
          ballsLost: 0,
          yellowCards: 0,
          redCards: 0,
          distanceKm: 0,
          maxDistanceKmInGame: 0,
          ownGoals: 0,
        });
      } else {
        const acc = playerStatsMap.get(key)!;
        acc.games += baseGames;
        acc.ratingSum += baseRatingSum;
        acc.goals += baseGoals;
        acc.assists += baseAssists;
        acc.minutesPlayed += baseMinutes;
        acc.cleanSheets += baseCleanSheets;
        acc.defenses += baseDefenses;
        const maxOverall = Math.max(acc.player.overall || 0, p.overall || 0);
        acc.player = { ...p, overall: maxOverall };
      }
    });
  });

  const totalTeamMatches = seasonsToProcess.reduce((total, { season: s }) => {
    const uniqueMatchesMap = new Map<string, Match>();
    (s.matches || []).forEach((m, idx) => {
      const key =
        m.matchesId ||
        (m as unknown as { id?: string }).id ||
        `${m.date || ""}_${m.homeTeam || ""}_${m.awayTeam || ""}_${m.league || ""}_${idx}`;
      uniqueMatchesMap.set(key, m);
    });
    const finishedMatchesCount =
      Array.from(uniqueMatchesMap.values()).filter((m) => m.status === "FINISHED").length || 0;
    return total + finishedMatchesCount;
  }, 0);

  seasonsToProcess.forEach(({ season: s }) => {
    const uniqueMatchesMap = new Map<string, Match>();
    (s.matches || []).forEach((m, idx) => {
      const key =
        m.matchesId ||
        (m as unknown as { id?: string }).id ||
        `${m.date || ""}_${m.homeTeam || ""}_${m.awayTeam || ""}_${m.league || ""}_${idx}`;
      uniqueMatchesMap.set(key, m);
    });
    const uniqueMatches = Array.from(uniqueMatchesMap.values());

    uniqueMatches.forEach((match) => {
      if (match.status !== "FINISHED") return;

      match.playerStats?.forEach((pStat) => {
        const seasonPlayer = matchPlayerStatToPlayer(
          pStat.playerId,
          s.players,
        );
        if (!seasonPlayer) return;

        const key = getPlayerIdentityKey(seasonPlayer, career.id);
        const acc = playerStatsMap.get(key);
        if (!acc) return;

        acc.totalFinishings += pStat.totalFinishings || 0;
        acc.finishingsMissed += pStat.finishingsMissed || 0;
        acc.totalPasses += pStat.totalPasses || 0;
        acc.passesMissed += pStat.passesMissed || 0;
        acc.keyPasses += pStat.keyPasses || 0;
        acc.totalDribbles += pStat.totalDribbles || 0;
        acc.dribblesMissed += pStat.dribblesMissed || 0;
        acc.ballsRecovered += pStat.ballsRecovered || 0;
        acc.ballsLost += pStat.ballsLost || 0;
        acc.yellowCards += pStat.yellowCard ? 1 : 0;
        acc.redCards += pStat.redCard ? 1 : 0;
        acc.ownGoals += pStat.ownGoals || 0;

        const matchDistance = pStat.distanceKm || 0;
        acc.distanceKm += matchDistance;
        if (matchDistance > acc.maxDistanceKmInGame) {
          acc.maxDistanceKmInGame = matchDistance;
        }
      });
    });
  });

  const aggregated = Array.from(playerStatsMap.values()).map((acc) => {
    const games = acc.games;
    const minutes = acc.minutesPlayed;
    const multiplier90 = minutes > 0 ? 90 / minutes : 0;
    const perGame = (val: number) => (games > 0 ? val / games : 0);
    const per90 = (val: number) => (minutes > 0 ? val * multiplier90 : 0);

    const onTargetFinishings = acc.totalFinishings - acc.finishingsMissed;
    const completedPasses = acc.totalPasses - acc.passesMissed;
    const completedDribbles = acc.totalDribbles - acc.dribblesMissed;
    const goalParticipations = acc.goals + acc.assists;

    return {
      player: acc.player,
      games: acc.games,
      ratingSum: acc.ratingSum,
      avgRating: acc.games > 0 ? acc.ratingSum / acc.games : 0,
      goals: acc.goals,
      goalsPerGame: perGame(acc.goals),
      goalsPer90: per90(acc.goals),
      assists: acc.assists,
      assistsPerGame: perGame(acc.assists),
      assistsPer90: per90(acc.assists),
      goalParticipations,
      goalParticipationsPerGame: perGame(goalParticipations),
      goalParticipationsPer90: per90(goalParticipations),
      goalFrequency: acc.goals > 0 ? acc.minutesPlayed / acc.goals : 0,
      assistFrequency: acc.assists > 0 ? acc.minutesPlayed / acc.assists : 0,
      participationFrequency:
        goalParticipations > 0
          ? acc.minutesPlayed / goalParticipations
          : 0,
      defenses: acc.defenses,
      defensesPerGame: perGame(acc.defenses),
      defensesPer90: per90(acc.defenses),
      cleanSheets: acc.cleanSheets,
      cleanSheetsPerGame: perGame(acc.cleanSheets),
      totalFinishings: acc.totalFinishings,
      finishingsPerGame: perGame(acc.totalFinishings),
      finishingsPer90: per90(acc.totalFinishings),
      finishingsOnTarget: onTargetFinishings,
      finishingsOnTargetPerGame: perGame(onTargetFinishings),
      finishingsOnTargetPer90: per90(onTargetFinishings),
      finishingsMissed: acc.finishingsMissed,
      finishingsMissedPerGame: perGame(acc.finishingsMissed),
      finishingsMissedPer90: per90(acc.finishingsMissed),
      totalPasses: acc.totalPasses,
      passesPerGame: perGame(acc.totalPasses),
      passesPer90: per90(acc.totalPasses),
      passesCompleted: completedPasses,
      passesCompletedPerGame: perGame(completedPasses),
      passesCompletedPer90: per90(completedPasses),
      passesMissed: acc.passesMissed,
      passesMissedPerGame: perGame(acc.passesMissed),
      passesMissedPer90: per90(acc.passesMissed),
      keyPasses: acc.keyPasses,
      keyPassesPerGame: perGame(acc.keyPasses),
      keyPassesPer90: per90(acc.keyPasses),
      totalDribbles: acc.totalDribbles,
      dribblesPerGame: perGame(acc.totalDribbles),
      dribblesPer90: per90(acc.totalDribbles),
      dribblesCompleted: completedDribbles,
      dribblesCompletedPerGame: perGame(completedDribbles),
      dribblesCompletedPer90: per90(completedDribbles),
      dribblesMissed: acc.dribblesMissed,
      dribblesMissedPerGame: perGame(acc.dribblesMissed),
      dribblesMissedPer90: per90(acc.dribblesMissed),
      ballsRecovered: acc.ballsRecovered,
      ballsRecoveredPerGame: perGame(acc.ballsRecovered),
      ballsRecoveredPer90: per90(acc.ballsRecovered),
      ballsLost: acc.ballsLost,
      ballsLostPerGame: perGame(acc.ballsLost),
      ballsLostPer90: per90(acc.ballsLost),
      yellowCards: acc.yellowCards,
      yellowCardsPerGame: perGame(acc.yellowCards),
      yellowCardsPer90: per90(acc.yellowCards),
      redCards: acc.redCards,
      redCardsPerGame: perGame(acc.redCards),
      redCardsPer90: per90(acc.redCards),
      distanceKm: acc.distanceKm,
      distanceKmPerGame: perGame(acc.distanceKm),
      distanceKmPer90: per90(acc.distanceKm),
      maxDistanceKmInGame: acc.maxDistanceKmInGame,
      minutesPlayed: acc.minutesPlayed,
      minutesPerGame: acc.games > 0 ? acc.minutesPlayed / acc.games : 0,
      ownGoals: acc.ownGoals,
    } as ConsolidatedPlayerStats;
  });

  if (isGeralPage || minPercentage === 0) {
    return aggregated;
  }

  const maxPlayerGames = aggregated.reduce(
    (max, stat) => Math.max(max, stat.games),
    0,
  );
  const referenceGames =
    totalTeamMatches > 0 ? totalTeamMatches : maxPlayerGames;
  const minGamesRequired = Math.ceil(referenceGames * minPercentage);

  return aggregated.filter((stat) => stat.games >= minGamesRequired);
};

export const aggregateSinglePlayerStats = (
  player: Players | null,
  augmentedCareer: AugmentedCareer | null,
  seasonId: string | undefined,
  compareMode: "season" | "total" | "none",
): ConsolidatedPlayerStats | null => {
  if (!player || !augmentedCareer || compareMode === "none") return null;

  const normalizedName = player.name.trim().toLowerCase();
  const normalizedNation = player.nation.trim().toLowerCase();

  const matchesToProcess: { match: Match; seasonPlayers: Players[] }[] = [];
  let seasonsAtClub = 0;

  if (compareMode === "total") {
    augmentedCareer.clubData.forEach((s) => {
      s.matches?.forEach((m) =>
        matchesToProcess.push({ match: m, seasonPlayers: s.players }),
      );

      const playedInSeason = s.players.some(
        (p) =>
          p.name.trim().toLowerCase() === normalizedName &&
          p.nation.trim().toLowerCase() === normalizedNation,
      );
      if (playedInSeason) seasonsAtClub++;
    });
  } else {
    const season = augmentedCareer.clubData.find(
      (s) => String(s.id) === String(seasonId),
    );
    if (season) {
      season.matches?.forEach((m) =>
        matchesToProcess.push({ match: m, seasonPlayers: season.players }),
      );
    }
  }

  let distanceKm = 0;
  let maxDistanceKmInGame = 0;
  let yellowCards = 0;
  let redCards = 0;
  let totalPasses = 0;
  let passesMissed = 0;
  let totalFinishings = 0;
  let finishingsMissed = 0;
  let totalDribbles = 0;
  let dribblesMissed = 0;
  let keyPasses = 0;
  let ballsRecovered = 0;
  let ballsLost = 0;
  let ownGoals = 0;

  matchesToProcess.forEach(({ match, seasonPlayers }) => {
    if (match.status !== "FINISHED") return;

    match.playerStats?.forEach((pStat) => {
      const sPlayer = seasonPlayers.find(
        (p) => String(p.id) === String(pStat.playerId),
      );
      if (!sPlayer) return;

      const isSamePlayer =
        compareMode === "total"
          ? sPlayer.name.trim().toLowerCase() === normalizedName &&
            sPlayer.nation.trim().toLowerCase() === normalizedNation
          : String(sPlayer.id) === String(player.id);

      if (isSamePlayer) {
        const matchDistance = pStat.distanceKm || 0;
        distanceKm += matchDistance;

        if (matchDistance > maxDistanceKmInGame) {
          maxDistanceKmInGame = matchDistance;
        }

        if (pStat.yellowCard) yellowCards += 1;
        if (pStat.redCard) redCards += 1;
        totalPasses += pStat.totalPasses || 0;
        passesMissed += pStat.passesMissed || 0;
        totalFinishings += pStat.totalFinishings || 0;
        finishingsMissed += pStat.finishingsMissed || 0;
        totalDribbles += pStat.totalDribbles || 0;
        dribblesMissed += pStat.dribblesMissed || 0;
        keyPasses += pStat.keyPasses || 0;
        ballsRecovered += pStat.ballsRecovered || 0;
        ballsLost += pStat.ballsLost || 0;
        ownGoals += pStat.ownGoals || 0;
      }
    });
  });

  const coreStats = calculateTotalStats(player);
  const games = coreStats.games;
  const minutes = coreStats.minutesPlayed;
  const multiplier90 = minutes > 0 ? 90 / minutes : 0;
  const perGame = (val: number) => (games > 0 ? val / games : 0);
  const per90 = (val: number) => (minutes > 0 ? val * multiplier90 : 0);

  const goals = coreStats.goals;
  const assists = coreStats.assists;
  const goalParticipations = goals + assists;
  const onTargetFinishings = totalFinishings - finishingsMissed;
  const completedPasses = totalPasses - passesMissed;
  const completedDribbles = totalDribbles - dribblesMissed;

  return {
    player,
    age: `${player.age} anos`,
    position: player.position,
    marketValue: formatDisplayValue(
      player.playerValue,
      augmentedCareer.currency,
    ),
    salary: formatDisplayValue(player.salary, augmentedCareer.currency),
    seasonsAtClub: compareMode === "total" ? seasonsAtClub : undefined,

    games: coreStats.games,
    ratingSum: coreStats.averageRating * coreStats.games,
    avgRating: coreStats.averageRating,
    goalParticipations,
    goalParticipationsPerGame: perGame(goalParticipations),
    goalParticipationsPer90: per90(goalParticipations),
    goals,
    goalsPerGame: perGame(goals),
    goalsPer90: per90(goals),
    assists,
    assistsPerGame: perGame(assists),
    assistsPer90: per90(assists),
    defenses: coreStats.defenses,
    defensesPerGame: perGame(coreStats.defenses),
    defensesPer90: per90(coreStats.defenses),

    goalFrequency: goals > 0 ? coreStats.minutesPlayed / goals : 0,
    assistFrequency: assists > 0 ? coreStats.minutesPlayed / assists : 0,
    participationFrequency:
      goalParticipations > 0
        ? coreStats.minutesPlayed / goalParticipations
        : 0,

    cleanSheets: coreStats.cleanSheets,
    cleanSheetsPerGame: perGame(coreStats.cleanSheets),
    totalFinishings,
    finishingsPerGame: perGame(totalFinishings),
    finishingsPer90: per90(totalFinishings),
    finishingsOnTarget: onTargetFinishings,
    finishingsOnTargetPerGame: perGame(onTargetFinishings),
    finishingsOnTargetPer90: per90(onTargetFinishings),
    finishingsMissed,
    finishingsMissedPerGame: perGame(finishingsMissed),
    finishingsMissedPer90: per90(finishingsMissed),

    totalPasses,
    passesPerGame: perGame(totalPasses),
    passesPer90: per90(totalPasses),
    passesCompleted: completedPasses,
    passesCompletedPerGame: perGame(completedPasses),
    passesCompletedPer90: per90(completedPasses),
    passesMissed,
    passesMissedPerGame: perGame(passesMissed),
    passesMissedPer90: per90(passesMissed),
    keyPasses,
    keyPassesPerGame: perGame(keyPasses),
    keyPassesPer90: per90(keyPasses),
    totalDribbles,
    dribblesPerGame: perGame(totalDribbles),
    dribblesPer90: per90(totalDribbles),
    dribblesCompleted: completedDribbles,
    dribblesCompletedPerGame: perGame(completedDribbles),
    dribblesCompletedPer90: per90(completedDribbles),
    dribblesMissed,
    dribblesMissedPerGame: perGame(dribblesMissed),
    dribblesMissedPer90: per90(dribblesMissed),

    ballsRecovered,
    ballsRecoveredPerGame: perGame(ballsRecovered),
    ballsRecoveredPer90: per90(ballsRecovered),
    ballsLost,
    ballsLostPerGame: perGame(ballsLost),
    ballsLostPer90: per90(ballsLost),

    minutesPlayed: coreStats.minutesPlayed,
    minutesPerGame:
      coreStats.games > 0 ? coreStats.minutesPlayed / coreStats.games : 0,
    maxDistanceKmInGame,
    distanceKm,
    distanceKmPerGame: perGame(distanceKm),
    distanceKmPer90: per90(distanceKm),
    yellowCards,
    yellowCardsPerGame: perGame(yellowCards),
    yellowCardsPer90: per90(yellowCards),
    redCards,
    redCardsPerGame: perGame(redCards),
    redCardsPer90: per90(redCards),
    ownGoals,
  } as ConsolidatedPlayerStats;
};

