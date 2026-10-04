import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { isSamePlayerId } from "../../../../../../../common/utils/playerIdentity";

export const findPlayerInList = (
  players: Players[],
  targetPlayer: Players,
): Players | undefined => {
  const byIdOrPlayedWithUs = players.find((p) => isSamePlayerId(p, targetPlayer));
  if (byIdOrPlayedWithUs) return byIdOrPlayedWithUs;

  const normalizedName = targetPlayer.name.trim().toLowerCase();
  const normalizedNation = targetPlayer.nation.trim().toLowerCase();

  return players.find(
    (p) =>
      p.name.trim().toLowerCase() === normalizedName &&
      p.nation.trim().toLowerCase() === normalizedNation,
  );
};
