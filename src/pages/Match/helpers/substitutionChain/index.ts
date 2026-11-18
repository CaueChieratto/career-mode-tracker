import { PlayerMatchStat } from "../../../../common/interfaces/PlayerMatchStat";
import { Players } from "../../../../common/interfaces/playersInfo/players";

export interface SubstitutionChainResult {
  subMinute: number;
  subOutName?: string;
  isValidSub: boolean;
}

export interface ResolveSubstitutionChainParams {
  playerId: string;
  starterIds: string[];
  playerStats: PlayerMatchStat[];
  allPlayers: Players[];
}

export const resolvePlayerChainSubstitution = ({
  playerId,
  starterIds,
  playerStats,
  allPlayers,
}: ResolveSubstitutionChainParams): SubstitutionChainResult => {
  const NO_SUB = "Nenhum";

  for (const starterId of starterIds) {
    const ordered: string[] = [starterId];
    let curr = starterId;

    while (true) {
      let next: string | null = null;
      const currStat = playerStats.find((s) => s.playerId === curr);

      if (currStat?.substituteIn && currStat.substituteIn !== NO_SUB) {
        const p = allPlayers.find((player) => player.name === currStat.substituteIn);
        if (p && !ordered.includes(p.id)) {
          next = p.id;
        }
      }

      if (!next) {
        const currPlayer = allPlayers.find((player) => player.id === curr);
        if (currPlayer) {
          const pointedBy = playerStats.find(
            (s) =>
              s.substituteIn === currPlayer.name &&
              !ordered.includes(s.playerId),
          );
          if (pointedBy) {
            next = pointedBy.playerId;
          }
        }
      }

      if (next) {
        ordered.push(next);
        curr = next;
      } else {
        break;
      }
    }

    const playerIndex = ordered.indexOf(playerId);
    if (playerIndex > 0) {
      let subMinute = 0;
      for (let k = 0; k < playerIndex; k++) {
        const prevStat = playerStats.find((s) => s.playerId === ordered[k]);
        subMinute += prevStat?.minutesPlayed || 0;
      }

      const prevPlayer = allPlayers.find((p) => p.id === ordered[playerIndex - 1]);

      return {
        subMinute,
        subOutName: prevPlayer?.name,
        isValidSub: true,
      };
    }
  }

  const stat = playerStats.find((s) => s.playerId === playerId);
  if (stat?.substituteIn && stat.substituteIn !== NO_SUB) {
    const outPlayer = allPlayers.find((p) => p.name === stat.substituteIn);
    let subMinute = stat.minutesPlayed || 0;
    if (outPlayer) {
      const outStats = playerStats.find((s) => s.playerId === outPlayer.id);
      subMinute = outStats?.minutesPlayed || 0;
    }
    return {
      subMinute,
      subOutName: stat.substituteIn,
      isValidSub: true,
    };
  }

  return {
    subMinute: Infinity,
    subOutName: undefined,
    isValidSub: false,
  };
};

