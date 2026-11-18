import { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";

export const getSortedCaptains = (season?: ClubData): Players[] => {
  if (!season || !season.players) return [];

  const players = season.players;
  const playersMap = new Map(players.map((p: Players) => [p.id, p]));
  const result: Players[] = [];

  if (season.captains && season.captains.length > 0) {
    for (const captainId of season.captains) {
      const player = playersMap.get(captainId);
      if (player) {
        result.push(player);
      }
    }
    for (const player of players) {
      if (player.captain && !result.some((c: Players) => c.id === player.id)) {
        result.push(player);
      }
    }
    return result.slice(0, 5);
  }

  return players
    .filter((p: Players) => p.captain)
    .sort((a: Players, b: Players) => (a.captainRank ?? 99) - (b.captainRank ?? 99))
    .slice(0, 5);
};

