import { useCallback } from "react";
import { ServiceLineup } from "../../../../services/ServiceLineup";
import { SavedLineup } from "../../../../../../common/interfaces/Lineup";
import { PlayerMatchStat } from "../../../../../../common/interfaces/PlayerMatchStat";

type UseSaveLineupParams = {
  careerId?: string;
  seasonId?: string;
  matchId: string;
};

export const useSaveLineup = ({
  careerId,
  seasonId,
  matchId,
}: UseSaveLineupParams) => {
  return useCallback(
    async (
      savedLineup: SavedLineup,
      playerStats: PlayerMatchStat[],
      removedPlayerIds: string[],
    ) => {
      if (!careerId || !seasonId) return false;

      try {
        await ServiceLineup.saveLineupToMatch(
          careerId,
          seasonId,
          matchId,
          savedLineup,
          playerStats,
          removedPlayerIds,
        );
        return true;
      } catch (error) {
        console.error("Erro: ", error);
        alert("Erro ao salvar a formação. Tente novamente.");
        return false;
      }
    },
    [careerId, seasonId, matchId],
  );
};
