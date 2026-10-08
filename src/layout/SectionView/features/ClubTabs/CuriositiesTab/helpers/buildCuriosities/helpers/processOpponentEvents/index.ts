import { Match } from "../../../../../../../../../common/interfaces/Match";
import {
  OpponentGoal,
  OpponentAssist,
} from "../../../../../../../../../common/interfaces/OpponentEventsMatches";
import { TimelineEvent } from "../../types";
import { parseMinute, getInterval, getGoalPeriod } from "../../utils";
import { CuriositiesState } from "../createCuriositiesState";

interface ProcessOpponentEventsParams {
  m: Match;
  index: number;
  state: CuriositiesState;
}

export const processOpponentEvents = ({
  m,
  index,
  state,
}: ProcessOpponentEventsParams) => {
  const events: TimelineEvent[] = [];
  let hasDramaticEnd = false;

  if (!m.opponentEvents) return { events, hasDramaticEnd };

  const oppEventData = Array.isArray(m.opponentEvents)
    ? m.opponentEvents[0]
    : m.opponentEvents;

  if (!oppEventData) return { events, hasDramaticEnd };

  const oppGoals: OpponentGoal[] = oppEventData.goals || [];
  const oppAssists: OpponentAssist[] = oppEventData.assists || [];

  oppGoals.forEach((goal) => {
    if (goal.player) {
      state.opponentGoalParticipations[goal.player] =
        (state.opponentGoalParticipations[goal.player] || 0) + 1;

      state.opponentScorers[goal.player] =
        (state.opponentScorers[goal.player] || 0) + 1;

      if (!state.opponentMatchGoals[goal.player]) {
        state.opponentMatchGoals[goal.player] = new Set();
      }
      state.opponentMatchGoals[goal.player].add(String(index));
    }

    const minNumber = parseMinute(goal.minute);
    if (!Number.isNaN(minNumber)) {
      const strMin = String(goal.minute);
      events.push({
        minute: minNumber,
        isMine: false,
        player: goal.player || "Desconhecido",
        strMin,
      });

      state.concededGoalsMinute[minNumber] =
        (state.concededGoalsMinute[minNumber] || 0) + 1;

      const period = getGoalPeriod(minNumber, strMin, m);
      const interval = getInterval(minNumber, period);
      state.dangerousIntervals[interval] =
        (state.dangerousIntervals[interval] || 0) + 1;

      if (minNumber >= 75) hasDramaticEnd = true;
    }
  });

  oppAssists.forEach((assist) => {
    if (assist.player && assist.goalReference) {
      if (assist.player) {
        state.opponentGoalParticipations[assist.player] =
          (state.opponentGoalParticipations[assist.player] || 0) + 1;
      }
      const scorerName = assist.goalReference.split(" - ")[0];
      if (scorerName) {
        const duoKey = `${scorerName.trim()} (Ass: ${assist.player})`;
        state.opponentDuos[duoKey] = (state.opponentDuos[duoKey] || 0) + 1;
      }
    }
  });

  return { events, hasDramaticEnd };
};
