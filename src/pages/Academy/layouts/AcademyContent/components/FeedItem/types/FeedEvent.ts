export type FeedEvent = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  socialSubtitle?: string;
  description?: string;
  time: string;
  monthWeight: number;
  day: number;
  season?: string;
  details?: {
    playerId?: string;
    changedAttribute?: string;
    oldValue?: string | number;
    newValue?: string | number;
    opponentTeam?: string;
    userGoals?: number;
    opponentGoals?: number;
    userPenalties?: number;
    opponentPenalties?: number;
    status?: string;
    lineup?: Array<{
      playerId: string;
      playerName: string;
      rating: number | null;
      goals: number | null;
      assists?: number | null;
      defesas?: number | null;
    }>;
    tournamentResult?: string;
  };
};
