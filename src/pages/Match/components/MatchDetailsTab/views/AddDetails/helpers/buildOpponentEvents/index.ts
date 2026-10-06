import { OpponentEvents } from "../../../../../../../../common/interfaces/OpponentEventsMatches";

export const buildOpponentEvents = (
  opponentScore: number,
  opponentCardCount: number,
  opponentOwnGoalCount: number,
  formValues: Record<string, string>,
  booleanValues: Record<string, boolean>,
  playerMap?: Map<string, string> | Record<string, string>,
): OpponentEvents => {
  const getPlayerId = (playerName: string): string | undefined => {
    if (!playerName || !playerMap) return undefined;
    const normalized = playerName.trim().toLowerCase();
    if (playerMap instanceof Map) {
      return playerMap.get(normalized);
    }
    return playerMap[normalized];
  };

  return {
    goals: Array.from({ length: opponentScore }).map((_, i) => {
      const player = formValues[`opponentGoalPlayer_${i}`] || "";
      const playerId = getPlayerId(player);
      return {
        player,
        minute: formValues[`opponentGoalMinute_${i}`] || "",
        ...(playerId ? { playerId } : {}),
      };
    }),
    assists: Array.from({ length: opponentScore }).map((_, i) => {
      const player = formValues[`opponentAssistPlayer_${i}`] || "";
      const playerId = getPlayerId(player);
      return {
        player,
        goalReference: formValues[`opponentAssistTo_${i}`] || "",
        ...(playerId ? { playerId } : {}),
      };
    }),
    cards: Array.from({ length: opponentCardCount })
      .map((_, i) => {
        const player = formValues[`opponentCardPlayer_${i}`] || "";
        const playerId = getPlayerId(player);
        return {
          player,
          yellow: booleanValues[`opponentYellow_${i}`] || false,
          yellowMinute: formValues[`opponentYellowMin_${i}`] || "",
          secondYellow: booleanValues[`opponentSecondYellow_${i}`] || false,
          secondYellowMinute: formValues[`opponentSecondYellowMin_${i}`] || "",
          red: booleanValues[`opponentRed_${i}`] || false,
          redMinute: formValues[`opponentRedMin_${i}`] || "",
          ...(playerId ? { playerId } : {}),
        };
      })
      .filter((c) => c.player && (c.yellow || c.secondYellow || c.red)),
    ownGoals: Array.from({ length: opponentOwnGoalCount }).map((_, i) => {
      const player = formValues[`opponentOwnGoalPlayer_${i}`] || "";
      const playerId = getPlayerId(player);
      return {
        player,
        minute: formValues[`opponentOwnGoalMinute_${i}`] || "",
        ...(playerId ? { playerId } : {}),
      };
    }),
    cardsAuthoritative: true,
  };
};
