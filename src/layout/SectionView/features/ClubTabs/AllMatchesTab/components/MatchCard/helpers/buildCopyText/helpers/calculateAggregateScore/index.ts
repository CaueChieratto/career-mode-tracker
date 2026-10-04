import { Career } from "../../../../../../../../../../../common/interfaces/Career";
import { Match } from "../../../../../../../../../../../common/interfaces/Match";

export function calculateAggregateScore(
  match: Match,
  career: Career,
  seasonMatches?: Match[],
): { userScore: number; opponentScore: number } | null {
  if (!match.isReturnMatch) return null;

  const isHome = match.homeTeam === career.clubName;
  const currentMyScore = isHome ? match.homeScore : match.awayScore;
  const currentOpponentScore = isHome ? match.awayScore : match.homeScore;

  if (currentMyScore === undefined || currentOpponentScore === undefined) {
    return null;
  }

  if (match.firstLegScore) {
    return {
      userScore: currentMyScore + match.firstLegScore.userScore,
      opponentScore: currentOpponentScore + match.firstLegScore.opponentScore,
    };
  }

  if (!seasonMatches || seasonMatches.length === 0) {
    return null;
  }

  const currentOpponent = (isHome ? match.awayTeam : match.homeTeam)
    .trim()
    .toLowerCase();
  const currentLeague = match.league?.trim().toLowerCase();
  const currentStage = match.stage?.trim().toLowerCase();

  const candidates = seasonMatches.filter((m) => {
    if (m.matchesId === match.matchesId) return false;
    if (m.isReturnMatch) return false;
    if (
      m.status !== "FINISHED" ||
      m.homeScore === undefined ||
      m.awayScore === undefined
    ) {
      return false;
    }
    if (currentLeague && m.league?.trim().toLowerCase() !== currentLeague) {
      return false;
    }

    const mIsHome = m.homeTeam === career.clubName;
    const mOpponent = (mIsHome ? m.awayTeam : m.homeTeam).trim().toLowerCase();
    if (mOpponent !== currentOpponent) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  let firstLeg = candidates[candidates.length - 1];

  if (currentStage) {
    const stageMatch = candidates.find(
      (m) => m.stage?.trim().toLowerCase() === currentStage,
    );
    if (stageMatch) {
      firstLeg = stageMatch;
    }
  }

  if (
    firstLeg &&
    firstLeg.homeScore !== undefined &&
    firstLeg.awayScore !== undefined
  ) {
    const leg1IsHome = firstLeg.homeTeam === career.clubName;
    const leg1MyScore = leg1IsHome ? firstLeg.homeScore : firstLeg.awayScore;
    const leg1OppScore = leg1IsHome ? firstLeg.awayScore : firstLeg.homeScore;

    return {
      userScore: currentMyScore + leg1MyScore,
      opponentScore: currentOpponentScore + leg1OppScore,
    };
  }

  return null;
}
