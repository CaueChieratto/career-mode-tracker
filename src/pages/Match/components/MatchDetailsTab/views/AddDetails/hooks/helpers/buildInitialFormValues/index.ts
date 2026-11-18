import { Match } from "../../../../../../../../../common/interfaces/Match";
import {
  OpponentAssist,
  OpponentCard,
  OpponentGoal,
  OpponentOwnGoal,
} from "../../../../../../../../../common/interfaces/OpponentEventsMatches";
import { normalizeOpponentEvents } from "../../../../../../../../../common/services/ServiceOpponentPlayers/helpers/opponentCards";

interface InitialMatchState {
  initialFormValues: Record<string, string>;
  booleansToSet: { key: string; value: boolean }[];
  initialSelectedPlayers?: Record<
    string,
    { id: string; name: string; isFormerPlayer?: boolean }
  >;
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

  const initialSelectedPlayers: Record<
    string,
    { id: string; name: string; isFormerPlayer?: boolean }
  > = {};

  if (match.opponentMvpName && match.opponentMvpPlayerId) {
    initialSelectedPlayers["opponentMvpName"] = {
      id: match.opponentMvpPlayerId,
      name: match.opponentMvpName,
      isFormerPlayer: match.opponentMvpIsFormerPlayer,
    };
  }

  const booleansToSet: { key: string; value: boolean }[] = [];
  const oppEv = normalizeOpponentEvents(match.opponentEvents);

  if (oppEv) {
    oppEv.goals?.forEach((g: OpponentGoal, i: number) => {
      initialFormValues[`opponentGoalPlayer_${i}`] = g.player;
      initialFormValues[`opponentGoalMinute_${i}`] = g.minute;
      if (g.playerId) {
        initialSelectedPlayers[`opponentGoalPlayer_${i}`] = {
          id: g.playerId,
          name: g.player,
          isFormerPlayer: g.isFormerPlayer,
        };
      }
    });
    oppEv.assists?.forEach((a: OpponentAssist, i: number) => {
      initialFormValues[`opponentAssistPlayer_${i}`] = a.player;
      initialFormValues[`opponentAssistTo_${i}`] = a.goalReference;
      if (a.playerId) {
        initialSelectedPlayers[`opponentAssistPlayer_${i}`] = {
          id: a.playerId,
          name: a.player,
          isFormerPlayer: a.isFormerPlayer,
        };
      }
    });

    if (oppEv.cards?.length) {
      initialFormValues.opponentCardCount = String(oppEv.cards.length);
      oppEv.cards.forEach((c: OpponentCard, i: number) => {
        initialFormValues[`opponentCardPlayer_${i}`] = c.player;
        initialFormValues[`opponentYellowMin_${i}`] = c.yellowMinute;
        initialFormValues[`opponentSecondYellowMin_${i}`] =
          c.secondYellowMinute;
        initialFormValues[`opponentRedMin_${i}`] = c.redMinute;
        if (c.playerId) {
          initialSelectedPlayers[`opponentCardPlayer_${i}`] = {
            id: c.playerId,
            name: c.player,
            isFormerPlayer: c.isFormerPlayer,
          };
        }
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
      oppEv.ownGoals.forEach((og: OpponentOwnGoal, i: number) => {
        initialFormValues[`opponentOwnGoalPlayer_${i}`] = og.player;
        initialFormValues[`opponentOwnGoalMinute_${i}`] = og.minute;
        if (og.playerId) {
          initialSelectedPlayers[`opponentOwnGoalPlayer_${i}`] = {
            id: og.playerId,
            name: og.player,
            isFormerPlayer: og.isFormerPlayer,
          };
        }
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

  return { initialFormValues, booleansToSet, initialSelectedPlayers };
};
