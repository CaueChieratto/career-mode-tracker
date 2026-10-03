import { Match } from "../../../../../../../../common/interfaces/Match";
import { getDerivedOpponentCards } from "../../../../../../helpers/opponentCards";

const calcAcc = (success?: number, total?: number): string => {
  return success !== undefined && total !== undefined && total > 0
    ? String(Math.round((success / total) * 100))
    : "";
};

const safeStr = (val: number | undefined | null): string =>
  val !== undefined && val !== null && !Number.isNaN(val) ? String(val) : "";

const formatSum = (val: number): string => (val > 0 ? String(val) : "");

export const buildInitialStats = (
  match: Match,
  isUserHome: boolean,
): Record<string, string> => {
  const stats = match.playerStats || [];

  const userFinishings = stats.reduce(
    (acc, s) => acc + (s.totalFinishings || 0),
    0,
  );
  const userFinishingsMissed = stats.reduce(
    (acc, s) => acc + (s.finishingsMissed || 0),
    0,
  );
  const userFinishingsOnTarget = Math.max(
    0,
    userFinishings - userFinishingsMissed,
  );

  const userPasses = stats.reduce((acc, s) => acc + (s.totalPasses || 0), 0);
  const userPassesMissed = stats.reduce(
    (acc, s) => acc + (s.passesMissed || 0),
    0,
  );
  const userPassesCompleted = Math.max(0, userPasses - userPassesMissed);

  const userDefenses = stats.reduce((acc, s) => acc + (s.defenses || 0), 0);
  const userYellows = stats.reduce((acc, s) => acc + (s.yellowCard ? 1 : 0), 0);
  const userReds = stats.reduce((acc, s) => acc + (s.redCard ? 1 : 0), 0);

  const userShotAccuracy = calcAcc(userFinishingsOnTarget, userFinishings);
  const userPassAccuracy = calcAcc(userPassesCompleted, userPasses);
  const initialUserPoss = isUserHome
    ? match.homePossession
    : match.awayPossession;

  const derivedOpponent = getDerivedOpponentCards(match.opponentEvents);

  const initialHomeYellow = !isUserHome
    ? safeStr(match.homeYellowCards ?? derivedOpponent?.yellowCards)
    : safeStr(match.homeYellowCards) || formatSum(userYellows);

  const initialAwayYellow = isUserHome
    ? safeStr(match.awayYellowCards ?? derivedOpponent?.yellowCards)
    : safeStr(match.awayYellowCards) || (!isUserHome ? formatSum(userYellows) : "");

  const initialHomeRed = !isUserHome
    ? safeStr(match.homeRedCards ?? derivedOpponent?.redCards)
    : safeStr(match.homeRedCards) || formatSum(userReds);

  const initialAwayRed = isUserHome
    ? safeStr(match.awayRedCards ?? derivedOpponent?.redCards)
    : safeStr(match.awayRedCards) || (!isUserHome ? formatSum(userReds) : "");

  return {
    userPossession: safeStr(initialUserPoss),
    homeXG: safeStr(match.homeXG),
    awayXG: safeStr(match.awayXG),
    homeBallRecovery: safeStr(match.homeBallRecovery),
    awayBallRecovery: safeStr(match.awayBallRecovery),
    homeFinishings:
      safeStr(match.homeFinishings) ||
      (isUserHome ? formatSum(userFinishings) : ""),
    awayFinishings:
      safeStr(match.awayFinishings) ||
      (!isUserHome ? formatSum(userFinishings) : ""),
    homeShotAccuracy:
      calcAcc(match.homeFinishingsOnTarget, match.homeFinishings) ||
      (isUserHome ? userShotAccuracy : ""),
    awayShotAccuracy:
      calcAcc(match.awayFinishingsOnTarget, match.awayFinishings) ||
      (!isUserHome ? userShotAccuracy : ""),
    homePasses:
      safeStr(match.homePasses) || (isUserHome ? formatSum(userPasses) : ""),
    awayPasses:
      safeStr(match.awayPasses) || (!isUserHome ? formatSum(userPasses) : ""),
    homePassAccuracy:
      calcAcc(match.homePassesCompleted, match.homePasses) ||
      (isUserHome ? userPassAccuracy : ""),
    awayPassAccuracy:
      calcAcc(match.awayPassesCompleted, match.awayPasses) ||
      (!isUserHome ? userPassAccuracy : ""),
    homeDefenses:
      safeStr(match.homeDefenses) ||
      (isUserHome ? formatSum(userDefenses) : ""),
    awayDefenses:
      safeStr(match.awayDefenses) ||
      (!isUserHome ? formatSum(userDefenses) : ""),
    homeYellowCards: initialHomeYellow,
    awayYellowCards: initialAwayYellow,
    homeRedCards: initialHomeRed,
    awayRedCards: initialAwayRed,
  };
};
