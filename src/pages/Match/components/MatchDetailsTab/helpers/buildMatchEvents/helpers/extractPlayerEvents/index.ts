import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Match } from "../../../../../../../../common/interfaces/Match";
import { GoalListItem, MatchEvent } from "../../../../types";
import { getEventDetails, parseGoals } from "../timeUtils";
import { resolvePlayerChainSubstitution } from "../../../../../../helpers/substitutionChain";

export const extractPlayerEvents = (match: Match, season: ClubData) => {
  const events: MatchEvent[] = [];
  const goals: GoalListItem[] = [];
  const ownGoals: GoalListItem[] = [];
  let mockTime = 10;

  if (!match.playerStats) return { events, goals, ownGoals };

  const starterIds = [
    match.lineup?.goalkeeper?.playerId,
    ...(match.lineup?.lines?.flat().map((s) => s.playerId) || []),
  ].filter(Boolean) as string[];

  match.playerStats.forEach((stat) => {
    const player = season.players.find((p) => p.id === stat.playerId);
    if (!player) return;

    if (stat.goals > 0) {
      let goalMins = stat.goalMinutes || [];

      if (goalMins.length < stat.goals) {
        const mocked = [];
        for (let i = 0; i < stat.goals; i++) {
          if (goalMins[i]) {
            mocked.push(goalMins[i]);
          } else {
            mockTime = mockTime >= 85 ? 15 : mockTime + 15;
            mocked.push(mockTime);
          }
        }
        goalMins = mocked;
      }

      const parsedGoals = parseGoals(goalMins, match);

      parsedGoals.forEach((g, i) => {
        const targetString = `${player.name} - ${g.time}'`;
        let assistText: string | undefined = undefined;

        const assistStat = match.playerStats?.find((s) =>
          s.assistTargets?.includes(targetString),
        );

        if (assistStat) {
          const assister = season.players.find(
            (p) => p.id === assistStat.playerId,
          );
          if (assister) assistText = assister.name;
        }

        events.push({
          id: `goal-${stat.playerId}-${i}`,
          type: "goal",
          time: g.time,
          displayTime: g.displayTime,
          sortTime: g.sortTime,
          period: g.period,
          mainPlayer: player.name,
          secondaryPlayer: assistText,
        });

        goals.push({
          playerName: player.name,
          time: g.time,
          displayTime: g.displayTime,
          sortTime: g.sortTime,
        });
      });
    }

    if (stat.ownGoals && stat.ownGoals > 0) {
      let ownGoalMins = stat.ownGoalMinutes || [];

      if (ownGoalMins.length < stat.ownGoals) {
        const mocked = [];
        for (let i = 0; i < stat.ownGoals; i++) {
          if (ownGoalMins[i]) {
            mocked.push(ownGoalMins[i]);
          } else {
            mockTime = mockTime >= 85 ? 15 : mockTime + 15;
            mocked.push(mockTime);
          }
        }
        ownGoalMins = mocked;
      }

      const parsedOwnGoals = parseGoals(ownGoalMins, match);

      parsedOwnGoals.forEach((g, i) => {
        events.push({
          id: `own-goal-${stat.playerId}-${i}`,
          type: "own_goal",
          time: g.time,
          displayTime: g.displayTime,
          sortTime: g.sortTime,
          period: g.period,
          mainPlayer: player.name,
          isOpponent: true,
        });

        ownGoals.push({
          playerName: player.name,
          time: g.time,
          displayTime: g.displayTime,
          sortTime: g.sortTime,
          isOwnGoal: true,
        });
      });
    }

    if (stat.yellowCard) {
      const yMinute =
        stat.yellowCardMinute && stat.yellowCardMinute > 0
          ? stat.yellowCardMinute
          : (mockTime += 5);
      const { period, displayTime, sortTime } = getEventDetails(yMinute, match);
      events.push({
        id: `y-${stat.playerId}`,
        type: "yellow_card",
        time: yMinute,
        displayTime,
        sortTime,
        period,
        mainPlayer: player.name,
      });
    }

    if (stat.secondYellowCard) {
      const syMinute =
        stat.secondYellowCardMinute && stat.secondYellowCardMinute > 0
          ? stat.secondYellowCardMinute
          : (mockTime += 5);
      const { period, displayTime, sortTime } = getEventDetails(
        syMinute,
        match,
      );
      events.push({
        id: `2y-${stat.playerId}`,
        type: "second_yellow",
        time: syMinute,
        displayTime,
        sortTime,
        period,
        mainPlayer: player.name,
      });
    }

    if (stat.redCard && !stat.secondYellowCard) {
      const rMinute =
        stat.redCardMinute && stat.redCardMinute > 0
          ? stat.redCardMinute
          : (mockTime += 5);
      const { period, displayTime, sortTime } = getEventDetails(rMinute, match);
      events.push({
        id: `r-${stat.playerId}`,
        type: "red_card",
        time: rMinute,
        displayTime,
        sortTime,
        period,
        mainPlayer: player.name,
      });
    }

    const isStarter = starterIds.includes(player.id);

    if (!isStarter && stat.minutesPlayed && stat.minutesPlayed > 0) {
      const { subMinute, subOutName, isValidSub } =
        resolvePlayerChainSubstitution({
          playerId: player.id,
          starterIds,
          playerStats: match.playerStats || [],
          allPlayers: season.players,
        });

      if (isValidSub) {
        let clockSubMinute = subMinute;
        const s1 = match.stoppage1T || 0;
        const s2 = match.stoppage2T || 0;
        const sET1 = match.stoppageET1 || 0;

        if (match.hasExtraTime) {
          if (subMinute > 105 + s1 + s2 + sET1) {
            clockSubMinute = subMinute - s1 - s2 - sET1;
          } else if (subMinute > 90 + s1 + s2) {
            clockSubMinute = subMinute - s1 - s2;
          } else if (subMinute > 45 + s1) {
            clockSubMinute = subMinute - s1;
          }
        } else {
          if (subMinute > 45 + s1) {
            clockSubMinute = subMinute - s1;
          }
        }

        const { period, displayTime, sortTime } = getEventDetails(
          clockSubMinute,
          match,
        );
        events.push({
          id: `sub-${stat.playerId}`,
          type: "sub",
          time: clockSubMinute,
          displayTime,
          sortTime,
          period,
          mainPlayer: player.name,
          secondaryPlayer: `Saiu: ${subOutName}`,
        });
      }
    }
  });

  return { events, goals, ownGoals };
};
