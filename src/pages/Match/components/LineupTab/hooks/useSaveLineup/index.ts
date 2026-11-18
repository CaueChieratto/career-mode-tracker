import { useCallback } from "react";
import { ServiceLineup } from "../../../../services/ServiceLineup";
import { SavedLineup } from "../../../../../../common/interfaces/Lineup";
import { PlayerMatchStat } from "../../../../../../common/interfaces/PlayerMatchStat";
import { toast } from "../../../../../../common/services/ToastService";

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
    ): Promise<PlayerMatchStat[] | null> => {
      if (!careerId || !seasonId) return null;

      try {
        const persistedStats = await ServiceLineup.saveLineupToMatch(
          careerId,
          seasonId,
          matchId,
          savedLineup,
          playerStats,
          removedPlayerIds,
        );
        return persistedStats || playerStats;
      } catch (error) {
        console.error("Erro: ", error);
        toast.error("Erro ao salvar a formação. Tente novamente.");
        return null;
      }
    },
    [careerId, seasonId, matchId],
  );
};
