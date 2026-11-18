import { OpponentEvents } from "../../../../../../../../common/interfaces/OpponentEventsMatches";

export type OpponentPlayerInfo = {
  id: string;
  isFormerPlayer?: boolean;
};

export const buildOpponentEvents = (
  opponentScore: number,
  opponentCardCount: number,
  opponentOwnGoalCount: number,
  formValues: Record<string, string>,
  booleanValues: Record<string, boolean>,
  playerMap?: Map<string, string> | Record<string, string>,
  fieldPlayerInfoMap?: Record<string, OpponentPlayerInfo>,
): OpponentEvents => {
  const getPlayerInfo = (
    fieldKey: string,
    playerName: string,
  ): OpponentPlayerInfo | undefined => {
    if (fieldPlayerInfoMap?.[fieldKey]) {
      return fieldPlayerInfoMap[fieldKey];
    }
    if (!playerName || !playerMap) return undefined;
    const normalized = playerName.trim().toLowerCase();
    const id =
      playerMap instanceof Map
        ? playerMap.get(normalized)
        : playerMap[normalized];
    return id ? { id } : undefined;
  };

  return {
    goals: Array.from({ length: opponentScore }).map((_, i) => {
      const fieldKey = `opponentGoalPlayer_${i}`;
      const player = formValues[fieldKey] || "";
      const info = getPlayerInfo(fieldKey, player);
      return {
        player,
        minute: formValues[`opponentGoalMinute_${i}`] || "",
        ...(info?.id ? { playerId: info.id } : {}),
        ...(info?.isFormerPlayer ? { isFormerPlayer: true } : {}),
      };
    }),
    assists: Array.from({ length: opponentScore }).map((_, i) => {
      const fieldKey = `opponentAssistPlayer_${i}`;
      const player = formValues[fieldKey] || "";
      const info = getPlayerInfo(fieldKey, player);
      return {
        player,
        goalReference: formValues[`opponentAssistTo_${i}`] || "",
        ...(info?.id ? { playerId: info.id } : {}),
        ...(info?.isFormerPlayer ? { isFormerPlayer: true } : {}),
      };
    }),
    cards: Array.from({ length: opponentCardCount })
      .map((_, i) => {
        const fieldKey = `opponentCardPlayer_${i}`;
        const player = formValues[fieldKey] || "";
        const info = getPlayerInfo(fieldKey, player);
        return {
          player,
          yellow: booleanValues[`opponentYellow_${i}`] || false,
          yellowMinute: formValues[`opponentYellowMin_${i}`] || "",
          secondYellow: booleanValues[`opponentSecondYellow_${i}`] || false,
          secondYellowMinute: formValues[`opponentSecondYellowMin_${i}`] || "",
          red: booleanValues[`opponentRed_${i}`] || false,
          redMinute: formValues[`opponentRedMin_${i}`] || "",
          ...(info?.id ? { playerId: info.id } : {}),
          ...(info?.isFormerPlayer ? { isFormerPlayer: true } : {}),
        };
      })
      .filter((c) => c.player && (c.yellow || c.secondYellow || c.red)),
    ownGoals: Array.from({ length: opponentOwnGoalCount }).map((_, i) => {
      const fieldKey = `opponentOwnGoalPlayer_${i}`;
      const player = formValues[fieldKey] || "";
      const info = getPlayerInfo(fieldKey, player);
      return {
        player,
        minute: formValues[`opponentOwnGoalMinute_${i}`] || "",
        ...(info?.id ? { playerId: info.id } : {}),
        ...(info?.isFormerPlayer ? { isFormerPlayer: true } : {}),
      };
    }),
    cardsAuthoritative: true,
  };
};
