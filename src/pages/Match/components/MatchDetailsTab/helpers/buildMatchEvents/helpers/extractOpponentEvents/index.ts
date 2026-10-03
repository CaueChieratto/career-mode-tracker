import { Match } from "../../../../../../../../common/interfaces/Match";
import {
  GoalListItem,
  MatchEvent,
  OpponentAssist,
  OpponentCard,
  OpponentGoal,
} from "../../../../types";
import { getEventDetails } from "../timeUtils";
import { normalizeOpponentEvents } from "../../../../../../helpers/opponentCards";

export const extractOpponentEvents = (match: Match) => {
  const events: MatchEvent[] = [];
  const goals: GoalListItem[] = [];
  const ownGoals: GoalListItem[] = [];

  const oppEv = normalizeOpponentEvents(match.opponentEvents);

  if (!oppEv) return { events, goals, ownGoals };

  if (oppEv.goals) {
    oppEv.goals.forEach((g: OpponentGoal, i: number) => {
      if (!g.player || !g.minute) return;
      const time = Number(g.minute) || 0;
      const { period, displayTime, sortTime } = getEventDetails(time, match);

      let assistText: string | undefined = undefined;
      if (oppEv.assists) {
        const targetRef = `${g.player} - ${time}'`;
        const assist = oppEv.assists.find(
          (a: OpponentAssist) => a.goalReference === targetRef,
        );
        if (assist && assist.player) {
          assistText = assist.player;
        }
      }

      events.push({
        id: `opp-goal-${i}`,
        type: "goal",
        time,
        displayTime,
        sortTime,
        period,
        mainPlayer: g.player,
        secondaryPlayer: assistText,
        isOpponent: true,
      });

      goals.push({
        playerName: g.player,
        time,
        displayTime,
        sortTime,
      });
    });
  }

  if (oppEv.ownGoals) {
    oppEv.ownGoals.forEach((g: OpponentGoal, i: number) => {
      if (!g.player || !g.minute) return;
      const time = Number(g.minute) || 0;
      const { period, displayTime, sortTime } = getEventDetails(time, match);

      events.push({
        id: `opp-own-goal-${i}`,
        type: "own_goal",
        time,
        displayTime,
        sortTime,
        period,
        mainPlayer: g.player,
      });

      ownGoals.push({
        playerName: g.player,
        time,
        displayTime,
        sortTime,
        isOwnGoal: true,
      });
    });
  }

  if (oppEv.cards) {
    oppEv.cards.forEach((c: OpponentCard, i: number) => {
      if (!c.player) return;

      if (c.yellow && c.yellowMinute) {
        const time = Number(c.yellowMinute) || 0;
        const { period, displayTime, sortTime } = getEventDetails(time, match);
        events.push({
          id: `opp-y-${i}`,
          type: "yellow_card",
          time,
          displayTime,
          sortTime,
          period,
          mainPlayer: c.player,
          isOpponent: true,
        });
      }

      if (c.secondYellow && c.secondYellowMinute) {
        const time = Number(c.secondYellowMinute) || 0;
        const { period, displayTime, sortTime } = getEventDetails(time, match);
        events.push({
          id: `opp-sy-${i}`,
          type: "second_yellow",
          time,
          displayTime,
          sortTime,
          period,
          mainPlayer: c.player,
          isOpponent: true,
        });
      }

      if (c.red && c.redMinute) {
        const time = Number(c.redMinute) || 0;
        const { period, displayTime, sortTime } = getEventDetails(time, match);
        events.push({
          id: `opp-r-${i}`,
          type: "red_card",
          time,
          displayTime,
          sortTime,
          period,
          mainPlayer: c.player,
          isOpponent: true,
        });
      }
    });
  }

  return { events, goals, ownGoals };
};
