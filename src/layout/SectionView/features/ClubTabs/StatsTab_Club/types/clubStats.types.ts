import { LeagueStats } from "../../../../../../common/interfaces/playersStats/leagueStats";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";

export type LeagueStatSource = "matches" | "manual" | "both";

export interface AggregatedLeagueStats extends LeagueStats {
  source: LeagueStatSource;
  ratingSum?: number;
  matchGamesCount?: number;
  manualGamesCount?: number;
}

export interface AggregatedClubPlayer extends Players {
  aggregatedLeagues: AggregatedLeagueStats[];
  hasAnyStats: boolean;
}

