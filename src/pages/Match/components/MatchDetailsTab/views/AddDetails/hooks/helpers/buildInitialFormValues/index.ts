import { Match } from "../../../../../../../../../common/interfaces/Match";
import { MatchWithOpponentEvents } from "../../../../../../../../../common/interfaces/OpponentEventsMatches";

interface InitialMatchState {
  initialFormValues: Record<string, string>;
  booleansToSet: { key: string; value: boolean }[];
}

export const buildInitialFormValues = (
  match: Match,
  careerClubName: string,
): InitialMatchState => {
  const totalUserTeamGoals =
    match.playerStats?.reduce((acc, stat) => acc + (stat.goals || 0), 0) || 0;
  const isUserHome = match.homeTeam === careerClubName;

  const initialFormValues: Record<string, string> = {
    homeScore:
      match.homeScore !== undefined
        ? String(match.homeScore)
        : isUserHome && totalUserTeamGoals > 0
          ? String(totalUserTeamGoals)
          : "",
    awayScore:
      match.awayScore !== undefined
        ? String(match.awayScore)
        : !isUserHome && totalUserTeamGoals > 0
          ? String(totalUserTeamGoals)
          : "",
    stoppage1T: match.stoppage1T ? String(match.stoppage1T) : "",
    stoppage2T: match.stoppage2T ? String(match.stoppage2T) : "",
    stoppageET1: match.stoppageET1 ? String(match.stoppageET1) : "",
    stoppageET2: match.stoppageET2 ? String(match.stoppageET2) : "",
    opponentMvpName: match.opponentMvpName || "",
    opponentMvpRating: match.opponentMvpRating
      ? String(match.opponentMvpRating)
      : "",
  };

  const booleansToSet: { key: string; value: boolean }[] = [];
  const matchWithEvents = match as MatchWithOpponentEvents;

  if (matchWithEvents.opponentEvents) {
    const oppEv = matchWithEvents.opponentEvents;
    oppEv.goals?.forEach((g, i) => {
      initialFormValues[`opponentGoalPlayer_${i}`] = g.player;
      initialFormValues[`opponentGoalMinute_${i}`] = g.minute;
    });
    oppEv.assists?.forEach((a, i) => {
      initialFormValues[`opponentAssistPlayer_${i}`] = a.player;
      initialFormValues[`opponentAssistTo_${i}`] = a.goalReference;
    });

    if (oppEv.cards?.length) {
      initialFormValues.opponentCardCount = String(oppEv.cards.length);
      oppEv.cards.forEach((c, i) => {
        initialFormValues[`opponentCardPlayer_${i}`] = c.player;
        initialFormValues[`opponentYellowMin_${i}`] = c.yellowMinute;
        initialFormValues[`opponentSecondYellowMin_${i}`] =
          c.secondYellowMinute;
        initialFormValues[`opponentRedMin_${i}`] = c.redMinute;
        booleansToSet.push({ key: `opponentYellow_${i}`, value: c.yellow });
        booleansToSet.push({
          key: `opponentSecondYellow_${i}`,
          value: c.secondYellow,
        });
        booleansToSet.push({ key: `opponentRed_${i}`, value: c.red });
      });
    }

    if (oppEv.ownGoals?.length) {
      initialFormValues.opponentOwnGoalCount = String(oppEv.ownGoals.length);
      oppEv.ownGoals.forEach((og, i) => {
        initialFormValues[`opponentOwnGoalPlayer_${i}`] = og.player;
        initialFormValues[`opponentOwnGoalMinute_${i}`] = og.minute;
      });
    }
  }

  if (match.homePenScore !== undefined && match.awayPenScore !== undefined) {
    initialFormValues.homePenScore = String(match.homePenScore);
    initialFormValues.awayPenScore = String(match.awayPenScore);
    booleansToSet.push({ key: "hasPenalties", value: true });
  } else {
    booleansToSet.push({ key: "hasPenalties", value: false });
  }

  booleansToSet.push({ key: "hasExtraTime", value: !!match.hasExtraTime });

  return { initialFormValues, booleansToSet };
};
