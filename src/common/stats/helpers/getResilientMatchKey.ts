import { Match } from "../../interfaces/Match";

export const getResilientMatchKey = (match: Match, fallbackIndex: number): string => {
  if (match.matchesId) return match.matchesId;
  if ((match as unknown as { id?: string }).id) return (match as unknown as { id?: string }).id as string;
  return `${match.date || ""}_${match.homeTeam || ""}_${match.awayTeam || ""}_${match.league || ""}_${fallbackIndex}`;
};

