export interface PlayerMatchesStats {
  playerId: string;
  playerName: string;
  goals: number | null;
  assists: number | null;
  rating: number | null;
  defesas?: number | null;
  cleanSheets?: number | null;
}

export interface AcademyMatches {
  id: string;
  date: string;
  opponentTeam: string;
  userGoals: number | undefined;
  opponentGoals: number | undefined;
  userPenalties?: number;
  opponentPenalties?: number;
  status?: string;
  result?: "SCHEDULED" | "FINISHED" | string;
  lineup: PlayerMatchesStats[];
}

export interface AcademyTournaments {
  id: string;
  name: string;
  date: string;
  totalMatches: number;
  matches: AcademyMatches[];
  tournamentResult: string;
  isChampion: boolean;
  isFinished?: boolean;
}

