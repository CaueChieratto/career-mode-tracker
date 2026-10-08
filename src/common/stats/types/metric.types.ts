import { Players } from "../../interfaces/playersInfo/players";

export type MetricScreen =
  | "bestPlayers"
  | "comparePlayers"
  | "playerDetailed"
  | "curiosities"
  | "statsTabClub"
  | "matchStatsCard";

export type MetricCategoryName =
  | "Jogador"
  | "Geral"
  | "Ataque"
  | "Distribuição"
  | "Defesa"
  | "Disciplina & Presença";

export interface ConsolidatedPlayerStats {
  player: Players;
  games: number;
  avgRating: number;
  ratingSum: number;
  goals: number;
  goalsPerGame: number;
  goalsPer90: number;
  assists: number;
  assistsPerGame: number;
  assistsPer90: number;
  goalParticipations: number;
  goalParticipationsPerGame: number;
  goalParticipationsPer90: number;
  goalFrequency: number;
  assistFrequency: number;
  participationFrequency: number;
  defenses: number;
  defensesPerGame: number;
  defensesPer90: number;
  cleanSheets: number;
  cleanSheetsPerGame: number;
  totalFinishings: number;
  finishingsPerGame: number;
  finishingsPer90: number;
  finishingsOnTarget: number;
  finishingsOnTargetPerGame: number;
  finishingsOnTargetPer90: number;
  finishingsMissed: number;
  finishingsMissedPerGame: number;
  finishingsMissedPer90: number;
  totalPasses: number;
  passesPerGame: number;
  passesPer90: number;
  passesCompleted: number;
  passesCompletedPerGame: number;
  passesCompletedPer90: number;
  passesMissed: number;
  passesMissedPerGame: number;
  passesMissedPer90: number;
  keyPasses: number;
  keyPassesPerGame: number;
  keyPassesPer90: number;
  totalDribbles: number;
  dribblesPerGame: number;
  dribblesPer90: number;
  dribblesCompleted: number;
  dribblesCompletedPerGame: number;
  dribblesCompletedPer90: number;
  dribblesMissed: number;
  dribblesMissedPerGame: number;
  dribblesMissedPer90: number;
  ballsRecovered: number;
  ballsRecoveredPerGame: number;
  ballsRecoveredPer90: number;
  ballsLost: number;
  ballsLostPerGame: number;
  ballsLostPer90: number;
  yellowCards: number;
  yellowCardsPerGame: number;
  yellowCardsPer90: number;
  redCards: number;
  redCardsPerGame: number;
  redCardsPer90: number;
  distanceKm: number;
  distanceKmPerGame: number;
  distanceKmPer90: number;
  maxDistanceKmInGame: number;
  minutesPlayed: number;
  minutesPerGame: number;
  ownGoals: number;

  // Bio & metadata extras
  age?: number | string;
  position?: string;
  marketValue?: string;
  salary?: string;
  seasonsAtClub?: number;

  [key: string]: unknown;
}

export interface MetricDefinition {
  id: string;
  category: MetricCategoryName;
  labels: {
    default: string;
    bestPlayers?: string;
    comparePlayers?: string;
    playerDetailed?: string;
    matchStatsCard?: string;
  };
  getValue: (stats: ConsolidatedPlayerStats) => string | number | undefined;
  format?: (value: string | number) => string | number;
  isRating?: boolean;
  isAscending?: boolean;
  enabled: boolean;
  screens: {
    bestPlayers: boolean;
    comparePlayers: boolean;
    playerDetailed?: boolean;
    curiosities?: boolean;
    statsTabClub?: boolean;
    matchStatsCard?: boolean;
  };
  group?: "goals" | "assists" | "cards" | "distance" | "general" | "defense" | "distribution" | "finishing" | "bio";
  onlyCompareMode?: "total" | "season";
  order?: {
    bestPlayers?: number;
    comparePlayers?: number;
  };
}
