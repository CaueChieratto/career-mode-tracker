import { Match } from "../../../../../../../../../common/interfaces/Match";

const getStandingsContributionKey = (match?: Match): string | null => {
  if (!match || match.status !== "FINISHED") return null;

  const hasPenaltyResult =
    match.homePenScore !== undefined && match.awayPenScore !== undefined;

  return JSON.stringify({
    status: match.status,
    league: match.league.trim().toLowerCase(),
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    hasPenaltyResult,
    homePenScore: hasPenaltyResult ? match.homePenScore : undefined,
    awayPenScore: hasPenaltyResult ? match.awayPenScore : undefined,
  });
};

export const hasStandingsImpact = (
  previous?: Match,
  next?: Match,
): boolean =>
  getStandingsContributionKey(previous) !==
  getStandingsContributionKey(next);
