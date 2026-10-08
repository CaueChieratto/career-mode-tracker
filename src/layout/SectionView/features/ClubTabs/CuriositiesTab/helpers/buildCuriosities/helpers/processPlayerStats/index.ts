import { Match } from "../../../../../../../../../common/interfaces/Match";
import { TimelineEvent } from "../../types";
import { parseMinute, getGoalPeriod } from "../../utils";
import { CuriositiesState } from "../createCuriositiesState";

interface ProcessPlayerStatsParams {
  m: Match;
  state: CuriositiesState;
  opponentName: string;
  getPlayerName: (id?: string) => string;
  diff: number;
}

export const processPlayerStats = ({
  m,
  state,
  opponentName,
  getPlayerName,
  diff,
}: ProcessPlayerStatsParams) => {
  const events: TimelineEvent[] = [];
  let matchGoals1H = 0;
  let matchGoals2H = 0;
  let hasOverwhelmingStart = false;

  m.playerStats?.forEach((p) => {
    const playerName = getPlayerName(p.playerId);

    p.goalMinutes?.forEach((min) => {
      const strMinute = String(min);
      const minNumber = parseMinute(strMinute);

      if (!Number.isNaN(minNumber)) {
        events.push({
          minute: minNumber,
          isMine: true,
          player: playerName,
          strMin: strMinute,
        });

        const period = getGoalPeriod(minNumber, strMinute, m);

        if (period === "1T") {
          state.goalsFirstHalf++;
          matchGoals1H++;
        } else if (period === "2T") {
          state.goalsSecondHalf++;
          matchGoals2H++;
        } else {
          state.goalsExtraTime++;
        }

        if (period === "1T" && minNumber <= 15) {
          hasOverwhelmingStart = true;
        }

        const stoppage2 = m.stoppage2T || 0;
        const isStoppage90 =
          (!m.hasExtraTime && (strMinute.includes("90+") || minNumber >= 90)) ||
          (Boolean(m.hasExtraTime) &&
            (strMinute.includes("90+") ||
              (minNumber > 90 && minNumber <= 90 + stoppage2)));

        if (isStoppage90) {
          state.stoppageTimeExperts[playerName] =
            (state.stoppageTimeExperts[playerName] || 0) + 1;
        }

        if (minNumber < state.fastestGoal.min) {
          state.fastestGoal = {
            min: minNumber,
            player: playerName,
            text: `${playerName} aos ${strMinute}' vs ${opponentName}`,
          };
        }

        if (minNumber > state.latestGoal.min) {
          state.latestGoal = {
            min: minNumber,
            player: playerName,
            text: `${playerName} aos ${strMinute}' vs ${opponentName}`,
          };
        }

        state.teamGoalsMinute[minNumber] =
          (state.teamGoalsMinute[minNumber] || 0) + 1;
      }

      const key = `${playerName} (${strMinute}')`;
      state.playerGoalMinutes[key] = (state.playerGoalMinutes[key] || 0) + 1;
    });

    if (p.assistTargets?.length) {
      p.assistTargets.forEach((targetStr) => {
        const parts = targetStr.split(" - ");
        const targetName = parts[0]?.trim();
        const minute = parts[1] ? parts[1].replace("'", "").trim() : "0";

        if (minute !== "0") {
          const key = `${playerName} (${minute}')`;
          state.playerAssistMinutes[key] =
            (state.playerAssistMinutes[key] || 0) + 1;
        }

        if (targetName) {
          // Conexões Diretas (item original renomeado e mantido)
          const duoKey = `${targetName} (Ass: ${playerName})`;
          state.teamDuos[duoKey] = (state.teamDuos[duoKey] || 0) + 1;

          // Melhores Duplas (novo ranking: soma total de participações independente de quem deu a assistência)
          const [p1, p2] = [targetName, playerName].sort((a, b) =>
            a.localeCompare(b),
          );
          const bestDuoKey = `${p1} & ${p2}`;
          state.bestDuos[bestDuoKey] = (state.bestDuos[bestDuoKey] || 0) + 1;
        }

        if (diff > 0) {
          state.winAssistants[playerName] =
            (state.winAssistants[playerName] || 0) + 1;
        }
      });
    }
  });

  return { events, matchGoals1H, matchGoals2H, hasOverwhelmingStart };
};
