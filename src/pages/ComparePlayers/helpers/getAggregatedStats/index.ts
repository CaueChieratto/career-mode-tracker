import { Players } from "../../../../common/interfaces/playersInfo/players";
import {
  PlayerStatsDisplay,
  AugmentedCareer,
} from "../../../../common/interfaces/ComparePlayers";
import { aggregateSinglePlayerStats } from "../../../../common/stats";

export const getAggregatedStats = (
  player: Players | null,
  augmentedCareer: AugmentedCareer | null,
  seasonId: string | undefined,
  compareMode: "season" | "total" | "none",
): PlayerStatsDisplay | null => {
  const consolidated = aggregateSinglePlayerStats(
    player,
    augmentedCareer,
    seasonId,
    compareMode,
  );

  if (!consolidated) return null;

  const fmtDec2 = (n: number) => n.toFixed(2);
  const fmtDec1 = (n: number) => n.toFixed(1);

  return {
    age: String(consolidated.age ?? ""),
    position: String(consolidated.position ?? ""),
    marketValue: String(consolidated.marketValue ?? ""),
    salary: String(consolidated.salary ?? ""),
    seasonsAtClub: consolidated.seasonsAtClub,

    games: consolidated.games,
    rating:
      consolidated.avgRating > 0 ? consolidated.avgRating.toFixed(2) : "-",
    goalParticipations: consolidated.goalParticipations,
    goalParticipationsPerGame: fmtDec2(consolidated.goalParticipationsPerGame),
    goalParticipationsPer90: fmtDec2(consolidated.goalParticipationsPer90),
    goals: consolidated.goals,
    goalsPerGame: fmtDec2(consolidated.goalsPerGame),
    goalsPer90: fmtDec2(consolidated.goalsPer90),
    assists: consolidated.assists,
    assistsPerGame: fmtDec2(consolidated.assistsPerGame),
    assistsPer90: fmtDec2(consolidated.assistsPer90),
    defenses: consolidated.defenses,
    defensesPerGame: fmtDec2(consolidated.defensesPerGame),
    defensesPer90: fmtDec2(consolidated.defensesPer90),

    goalFrequency:
      consolidated.goals > 0
        ? `${Math.round(consolidated.minutesPlayed / consolidated.goals)}'`
        : "-",
    assistFrequency:
      consolidated.assists > 0
        ? `${Math.round(consolidated.minutesPlayed / consolidated.assists)}'`
        : "-",
    participationFrequency:
      consolidated.goalParticipations > 0
        ? `${Math.round(consolidated.minutesPlayed / consolidated.goalParticipations)}'`
        : "-",

    totalFinishings: consolidated.totalFinishings,
    finishingsPerGame: fmtDec1(consolidated.finishingsPerGame),
    finishingsPer90: fmtDec1(consolidated.finishingsPer90),
    finishingsOnTarget: consolidated.finishingsOnTarget,
    finishingsOnTargetPerGame: fmtDec1(consolidated.finishingsOnTargetPerGame),
    finishingsOnTargetPer90: fmtDec1(consolidated.finishingsOnTargetPer90),
    finishingsMissed: consolidated.finishingsMissed,
    finishingsMissedPerGame: fmtDec1(consolidated.finishingsMissedPerGame),
    finishingsMissedPer90: fmtDec1(consolidated.finishingsMissedPer90),

    totalPasses: consolidated.totalPasses,
    passesPerGame: fmtDec1(consolidated.passesPerGame),
    passesPer90: fmtDec1(consolidated.passesPer90),
    passesCompleted: consolidated.passesCompleted,
    passesCompletedPerGame: fmtDec1(consolidated.passesCompletedPerGame),
    passesCompletedPer90: fmtDec1(consolidated.passesCompletedPer90),
    passesMissed: consolidated.passesMissed,
    passesMissedPerGame: fmtDec1(consolidated.passesMissedPerGame),
    passesMissedPer90: fmtDec1(consolidated.passesMissedPer90),
    keyPasses: consolidated.keyPasses,
    keyPassesPerGame: fmtDec1(consolidated.keyPassesPerGame),
    keyPassesPer90: fmtDec1(consolidated.keyPassesPer90),

    totalDribbles: consolidated.totalDribbles,
    dribblesPerGame: fmtDec1(consolidated.dribblesPerGame),
    dribblesPer90: fmtDec1(consolidated.dribblesPer90),
    dribblesCompleted: consolidated.dribblesCompleted,
    dribblesCompletedPerGame: fmtDec1(consolidated.dribblesCompletedPerGame),
    dribblesCompletedPer90: fmtDec1(consolidated.dribblesCompletedPer90),
    dribblesMissed: consolidated.dribblesMissed,
    dribblesMissedPerGame: fmtDec1(consolidated.dribblesMissedPerGame),
    dribblesMissedPer90: fmtDec1(consolidated.dribblesMissedPer90),

    cleanSheets: consolidated.cleanSheets,
    cleanSheetsPerGame: fmtDec2(consolidated.cleanSheetsPerGame),
    ballsRecovered: consolidated.ballsRecovered,
    ballsRecoveredPerGame: fmtDec1(consolidated.ballsRecoveredPerGame),
    ballsRecoveredPer90: fmtDec1(consolidated.ballsRecoveredPer90),
    ballsLost: consolidated.ballsLost,
    ballsLostPerGame: fmtDec1(consolidated.ballsLostPerGame),
    ballsLostPer90: fmtDec1(consolidated.ballsLostPer90),

    minutesPlayed: consolidated.minutesPlayed,
    minutesPerGame:
      consolidated.games > 0
        ? `${Math.round(consolidated.minutesPlayed / consolidated.games)}'`
        : "-",
    maxDistanceKmInGame: `${consolidated.maxDistanceKmInGame.toFixed(1)}km`,
    distanceKm: `${consolidated.distanceKm.toFixed(1)}km`,
    distanceKmPerGame: `${consolidated.distanceKmPerGame.toFixed(1)}km`,
    distanceKmPer90: `${consolidated.distanceKmPer90.toFixed(1)}km`,
    yellowCards: consolidated.yellowCards,
    yellowCardsPerGame: fmtDec2(consolidated.yellowCardsPerGame),
    yellowCardsPer90: fmtDec2(consolidated.yellowCardsPer90),
    redCards: consolidated.redCards,
    redCardsPerGame: fmtDec2(consolidated.redCardsPerGame),
    redCardsPer90: fmtDec2(consolidated.redCardsPer90),
    ownGoals: consolidated.ownGoals,
  };
};
