import { Players } from "../playersInfo/players";
import { Match } from "../Match";
import { getAggregatedPlayersForCareer } from "../../../layout/SectionView/helpers/mergeMatchStats";

type BaseCareer = Parameters<typeof getAggregatedPlayersForCareer>[0];

export interface PlayerStatsDisplay {
  age: string;
  position: string;
  marketValue: string;
  salary: string;
  seasonsAtClub?: number;

  games: number;
  rating: string | number;
  goalParticipations: number;
  goalParticipationsPerGame: string;
  goalParticipationsPer90: string;
  goals: number;
  goalsPerGame: string;
  goalsPer90: string;
  assists: number;
  assistsPerGame: string;
  assistsPer90: string;
  defenses: number;
  defensesPerGame: string;
  defensesPer90: string;

  goalFrequency: string;
  assistFrequency: string;
  participationFrequency: string;
  totalFinishings: number;
  finishingsPerGame: string;
  finishingsPer90: string;
  finishingsOnTarget: number;
  finishingsOnTargetPerGame: string;
  finishingsOnTargetPer90: string;
  finishingsMissed: number;
  finishingsMissedPerGame: string;
  finishingsMissedPer90: string;

  totalPasses: number;
  passesPerGame: string;
  passesPer90: string;
  passesCompleted: number;
  passesCompletedPerGame: string;
  passesCompletedPer90: string;
  passesMissed: number;
  passesMissedPerGame: string;
  passesMissedPer90: string;
  keyPasses: number;
  keyPassesPerGame: string;
  keyPassesPer90: string;
  totalDribbles: number;
  dribblesPerGame: string;
  dribblesPer90: string;
  dribblesCompleted: number;
  dribblesCompletedPerGame: string;
  dribblesCompletedPer90: string;
  dribblesMissed: number;
  dribblesMissedPerGame: string;
  dribblesMissedPer90: string;

  cleanSheets: number;
  cleanSheetsPerGame: string;
  ballsRecovered: number;
  ballsRecoveredPerGame: string;
  ballsRecoveredPer90: string;
  ballsLost: number;
  ballsLostPerGame: string;
  ballsLostPer90: string;

  minutesPlayed: number;
  minutesPerGame: string;
  maxDistanceKmInGame: string;
  distanceKm: string;
  distanceKmPerGame: string;
  distanceKmPer90: string;
  yellowCards: number;
  yellowCardsPerGame: string;
  yellowCardsPer90: string;
  redCards: number;
  redCardsPerGame: string;
  redCardsPer90: string;
  ownGoals: number;
}

export type AugmentedCareer = BaseCareer & {
  clubData: Array<{
    id: string | number;
    seasonNumber: number;
    players: Players[];
    matches?: Match[];
  }>;
};
