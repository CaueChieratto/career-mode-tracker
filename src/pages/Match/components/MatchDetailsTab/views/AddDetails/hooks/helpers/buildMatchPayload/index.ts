import { Match } from "../../../../../../../../../common/interfaces/Match";
import { buildOpponentEvents } from "../../../helpers/buildOpponentEvents";
import { calculateMatchResult } from "../../../helpers/calculateMatchResult";
import { MatchWithOpponentEvents } from "../../../../../../../../../common/interfaces/OpponentEventsMatches";
import { countOpponentCards } from "../../../../../../../helpers/opponentCards";

interface MatchPayloadResult {
  updatedMatch: MatchWithOpponentEvents;
  userResult: "V" | "E" | "D" | "?";
}

export const buildMatchPayload = (
  match: Match,
  formValues: Record<string, string>,
  booleanValues: Record<string, boolean>,
  isUserHome: boolean,
  playerMap?: Map<string, string> | Record<string, string>,
): MatchPayloadResult => {
  const homeScoreNum = Number(formValues.homeScore) || 0;
  const awayScoreNum = Number(formValues.awayScore) || 0;
  const opponentCardCountNum = Number(formValues.opponentCardCount) || 0;
  const opponentOwnGoalCountNum = Number(formValues.opponentOwnGoalCount) || 0;

  const hasPenalties = !!booleanValues.hasPenalties;
  const homePenScore = Number(formValues.homePenScore) || 0;
  const awayPenScore = Number(formValues.awayPenScore) || 0;

  const userResult = calculateMatchResult(
    homeScoreNum,
    awayScoreNum,
    isUserHome,
    hasPenalties,
    homePenScore,
    awayPenScore,
  );

  const opponentScoreNum = isUserHome ? awayScoreNum : homeScoreNum;

  const opponentEvents = buildOpponentEvents(
    opponentScoreNum,
    opponentCardCountNum,
    opponentOwnGoalCountNum,
    formValues,
    booleanValues,
    playerMap,
  );

  const { yellowCards, redCards } = countOpponentCards(opponentEvents.cards);

  const updatedMatch: MatchWithOpponentEvents = {
    ...match,
    homeScore: homeScoreNum,
    awayScore: awayScoreNum,
    stoppage1T: Number(formValues.stoppage1T) || 0,
    stoppage2T: Number(formValues.stoppage2T) || 0,
    stoppageET1: Number(formValues.stoppageET1) || 0,
    stoppageET2: Number(formValues.stoppageET2) || 0,
    hasExtraTime: !!booleanValues.hasExtraTime,
    status: "FINISHED",
    result: userResult,
    opponentEvents,
    ...(isUserHome
      ? {
          awayYellowCards: yellowCards,
          awayRedCards: redCards,
        }
      : {
          homeYellowCards: yellowCards,
          homeRedCards: redCards,
        }),
  };

  if (formValues.opponentMvpName && formValues.opponentMvpName.trim() !== "") {
    const trimmedMvp = formValues.opponentMvpName.trim();
    updatedMatch.opponentMvpName = trimmedMvp;
    updatedMatch.opponentMvpRating = Number(formValues.opponentMvpRating) || 0;
    const normalized = trimmedMvp.toLowerCase();
    const mvpId = playerMap instanceof Map
      ? playerMap.get(normalized)
      : playerMap?.[normalized];
    if (mvpId) {
      updatedMatch.opponentMvpPlayerId = mvpId;
    }
  } else {
    updatedMatch.opponentMvpName = "";
    updatedMatch.opponentMvpRating = 0;
    delete updatedMatch.opponentMvpPlayerId;
  }

  if (hasPenalties) {
    updatedMatch.homePenScore = homePenScore;
    updatedMatch.awayPenScore = awayPenScore;
  } else {
    delete updatedMatch.homePenScore;
    delete updatedMatch.awayPenScore;
  }

  return { updatedMatch, userResult };
};
