import { Match } from "../../../../../../../../common/interfaces/Match";

const parseNum = (val: string | undefined): number | undefined =>
  val && val !== "" ? Number(val) : undefined;

export const buildMatchUpdate = (
  formValues: Record<string, string>,
  match: Match,
  isUserHome: boolean,
): Match => {
  const userPoss = parseNum(formValues.userPossession);
  const rivalPoss = userPoss !== undefined ? 100 - userPoss : undefined;

  const homePossession = isUserHome ? userPoss : rivalPoss;
  const awayPossession = !isUserHome ? userPoss : rivalPoss;

  const hFinishings = parseNum(formValues.homeFinishings);
  const hShotAcc = parseNum(formValues.homeShotAccuracy);
  const homeFinishingsOnTarget =
    hFinishings !== undefined && hShotAcc !== undefined
      ? Math.round((hFinishings * hShotAcc) / 100)
      : match.homeFinishingsOnTarget;

  const aFinishings = parseNum(formValues.awayFinishings);
  const aShotAcc = parseNum(formValues.awayShotAccuracy);
  const awayFinishingsOnTarget =
    aFinishings !== undefined && aShotAcc !== undefined
      ? Math.round((aFinishings * aShotAcc) / 100)
      : match.awayFinishingsOnTarget;

  const hPasses = parseNum(formValues.homePasses);
  const hPassAcc = parseNum(formValues.homePassAccuracy);
  const homePassesCompleted =
    hPasses !== undefined && hPassAcc !== undefined
      ? Math.round((hPasses * hPassAcc) / 100)
      : match.homePassesCompleted;

  const aPasses = parseNum(formValues.awayPasses);
  const aPassAcc = parseNum(formValues.awayPassAccuracy);
  const awayPassesCompleted =
    aPasses !== undefined && aPassAcc !== undefined
      ? Math.round((aPasses * aPassAcc) / 100)
      : match.awayPassesCompleted;

  const homeYellowCards = parseNum(formValues.homeYellowCards);
  const awayYellowCards = parseNum(formValues.awayYellowCards);
  const homeRedCards = parseNum(formValues.homeRedCards);
  const awayRedCards = parseNum(formValues.awayRedCards);

  const updatedMatch = {
    ...match,
    homePossession,
    awayPossession,
    homeXG: parseNum(formValues.homeXG),
    awayXG: parseNum(formValues.awayXG),
    homeBallRecovery: parseNum(formValues.homeBallRecovery),
    awayBallRecovery: parseNum(formValues.awayBallRecovery),
    homeFinishings: hFinishings,
    awayFinishings: aFinishings,
    homeFinishingsOnTarget,
    awayFinishingsOnTarget,
    homePasses: hPasses,
    awayPasses: aPasses,
    homePassesCompleted,
    awayPassesCompleted,
    homeDefenses: parseNum(formValues.homeDefenses),
    awayDefenses: parseNum(formValues.awayDefenses),
    homeYellowCards,
    awayYellowCards,
    homeRedCards,
    awayRedCards,
  };

  return Object.fromEntries(
    Object.entries(updatedMatch).map(([key, value]) => [key, value ?? null]),
  ) as Match;
};
