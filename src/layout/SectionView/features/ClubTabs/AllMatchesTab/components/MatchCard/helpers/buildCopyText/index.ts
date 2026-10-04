import { Career } from "../../../../../../../../../common/interfaces/Career";
import { Match } from "../../../../../../../../../common/interfaces/Match";
import { isLeagueCompetition } from "../isLeagueCompetition";
import { buildSubstitutionsMap } from "./helpers/buildSubstitutionsMap";
import { buildPlayerText } from "./helpers/buildPlayerText";
import { buildOpponentEventsText } from "./helpers/buildOpponentEventsText";
import { calculateAggregateScore } from "./helpers/calculateAggregateScore";
import { formatKnockoutStage } from "./helpers/formatKnockoutStage";

type BuildMatchCopyTextParams = {
  match: Match;
  career: Career;
  seasonMatches?: Match[];
};

export const buildMatchCopyText = ({
  match,
  career,
  seasonMatches,
}: BuildMatchCopyTextParams): string => {
  const isHome = match.homeTeam === career.clubName;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const location = match.isNeutral ? "Neutro" : isHome ? "Casa" : "Fora";
  const day = match.date.split("/")[0];
  const resultText =
    match.result === "V"
      ? "Vitória"
      : match.result === "D"
        ? "Derrota"
        : "Empate";

  const myScore = isHome ? match.homeScore : match.awayScore;
  const opponentScore = isHome ? match.awayScore : match.homeScore;
  const possession = isHome ? match.homePossession : match.awayPossession;
  const myShots = isHome ? match.homeFinishings : match.awayFinishings;
  const opponentShots = isHome ? match.awayFinishings : match.homeFinishings;
  const myXg = isHome ? match.homeXG : match.awayXG;
  const opponentXg = isHome ? match.awayXG : match.homeXG;

  const aggregate = calculateAggregateScore(match, career, seasonMatches);
  const aggregateText = aggregate
    ? ` (AGR: ${aggregate.userScore}x${aggregate.opponentScore})`
    : "";

  const hasPenalties =
    match.homePenScore !== undefined &&
    match.homePenScore !== null &&
    match.awayPenScore !== undefined &&
    match.awayPenScore !== null;
  const myPen = isHome ? match.homePenScore : match.awayPenScore;
  const opponentPen = isHome ? match.awayPenScore : match.homePenScore;
  const penaltiesText = hasPenalties ? ` (PEN: ${myPen}x${opponentPen})` : "";
  const extraTimePrefix = match.hasExtraTime ? "PRORROGAÇÃO | " : "";

  const formattedStage = match.stage
    ? formatKnockoutStage(match.stage, match.isReturnMatch)
    : match.isReturnMatch
      ? "Jogo de Volta"
      : "";

  let matchContext: string;

  if (match.isNeutral && match.stadium?.trim()) {
    const venueDetail = formattedStage
      ? `${formattedStage} no ${match.stadium.trim()}`
      : `no ${match.stadium.trim()}`;

    matchContext = match.league
      ? `${match.league}, ${venueDetail}`
      : venueDetail;
  } else if (formattedStage) {
    const leaguePart = match.league ? `, ${match.league}` : "";
    matchContext = `${location}${leaguePart}, ${formattedStage}`;
  } else {
    const isLeague = isLeagueCompetition(match.league);
    const competitionText = isLeague ? "" : match.league;
    matchContext = competitionText
      ? `${location}, ${competitionText}`
      : location;
  }

  const getPlayerStat = (id?: string | null) => {
    if (!id) return undefined;
    return match.playerStats?.find((p) => p.playerId === id);
  };

  const mvp = [...(match.playerStats || [])].sort(
    (a, b) => b.rating - a.rating,
  )[0];
  const opponentMvpRating = match.opponentMvpRating || 0;
  const myMvpRating = mvp?.rating || 0;
  const isOurMvpOverall = myMvpRating >= opponentMvpRating && myMvpRating > 0;
  const isOpponentMvpOverall = opponentMvpRating > myMvpRating;

  const substitutions = buildSubstitutionsMap(match, getPlayerStat);
  const starters: string[] = [];

  if (match.lineup?.goalkeeper) {
    const stat = getPlayerStat(match.lineup.goalkeeper.playerId);
    starters.push(
      buildPlayerText({
        playerName: match.lineup.goalkeeper.playerName || "Desc.",
        rating: stat?.rating || 0,
        stat,
        isMvp:
          isOurMvpOverall && mvp?.playerId === match.lineup.goalkeeper.playerId,
        isOurMvpOverall,
        mvpPlayerId: mvp?.playerId,
        substitutions,
      }),
    );
  }

  (match.lineup?.lines || []).forEach((player) => {
    const stat = getPlayerStat(player.playerId);
    starters.push(
      buildPlayerText({
        playerName: player.playerName || "Desc.",
        rating: stat?.rating || 0,
        stat,
        isMvp: isOurMvpOverall && mvp?.playerId === player.playerId,
        isOurMvpOverall,
        mvpPlayerId: mvp?.playerId,
        substitutions,
      }),
    );
  });

  const startersText =
    starters.length > 0 ? `\nJogadores: ${starters.join(", ")}` : "";

  const opponentEventsText = buildOpponentEventsText(
    match,
    isOpponentMvpOverall,
  );
  const oppText = opponentEventsText
    ? `\nAdversário: ${opponentEventsText}`
    : "";

  return `Dia ${day}: ${resultText} ${myScore}x${opponentScore}${aggregateText}${penaltiesText} vs ${opponent} (${matchContext})\n${extraTimePrefix}Posse: ${possession}% | Chutes: ${myShots}x${opponentShots} | xG: ${myXg}x${opponentXg}${startersText}${oppText}`;
};
