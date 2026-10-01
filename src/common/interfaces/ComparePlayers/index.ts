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
  goals: number;
  assists: number;
  defenses: number;

  goalFrequency: string;
  assistFrequency: string;
  participationFrequency: string;
  totalFinishings: number;
  finishingsPer90: string;
  finishingsOnTarget: number;
  finishingsOnTargetPer90: string;
  finishingsMissed: number;
  finishingsMissedPer90: string;

  totalPasses: number;
  passesPer90: string;
  passesCompleted: number;
  passesCompletedPer90: string;
  passesMissed: number;
  passesMissedPer90: string;
  keyPasses: number;
  keyPassesPer90: string;
  totalDribbles: number;
  dribblesPer90: string;
  dribblesCompleted: number;
  dribblesCompletedPer90: string;
  dribblesMissed: number;
  dribblesMissedPer90: string;

  cleanSheets: number;
  ballsRecovered: number;
  ballsRecoveredPer90: string;
  ballsLost: number;
  ballsLostPer90: string;

  minutesPlayed: number;
  minutesPerGame: string;
  maxDistanceKmInGame: string;
  distanceKmPer90: string;
  distanceKm: string;
  yellowCards: number;
  yellowCardsPer90: string;
  redCards: number;
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
