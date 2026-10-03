import { OpponentEvents } from "../../../../../../../../common/interfaces/OpponentEventsMatches";

export const buildOpponentEvents = (
  opponentScore: number,
  opponentCardCount: number,
  opponentOwnGoalCount: number,
  formValues: Record<string, string>,
  booleanValues: Record<string, boolean>,
): OpponentEvents => {
  return {
    goals: Array.from({ length: opponentScore }).map((_, i) => ({
      player: formValues[`opponentGoalPlayer_${i}`] || "",
      minute: formValues[`opponentGoalMinute_${i}`] || "",
    })),
    assists: Array.from({ length: opponentScore }).map((_, i) => ({
      player: formValues[`opponentAssistPlayer_${i}`] || "",
      goalReference: formValues[`opponentAssistTo_${i}`] || "",
    })),
    cards: Array.from({ length: opponentCardCount })
      .map((_, i) => ({
        player: formValues[`opponentCardPlayer_${i}`] || "",
        yellow: booleanValues[`opponentYellow_${i}`] || false,
        yellowMinute: formValues[`opponentYellowMin_${i}`] || "",
        secondYellow: booleanValues[`opponentSecondYellow_${i}`] || false,
        secondYellowMinute: formValues[`opponentSecondYellowMin_${i}`] || "",
        red: booleanValues[`opponentRed_${i}`] || false,
        redMinute: formValues[`opponentRedMin_${i}`] || "",
      }))
      .filter((c) => c.player && (c.yellow || c.secondYellow || c.red)),
    ownGoals: Array.from({ length: opponentOwnGoalCount }).map((_, i) => ({
      player: formValues[`opponentOwnGoalPlayer_${i}`] || "",
      minute: formValues[`opponentOwnGoalMinute_${i}`] || "",
    })),
    cardsAuthoritative: true,
  };
};
