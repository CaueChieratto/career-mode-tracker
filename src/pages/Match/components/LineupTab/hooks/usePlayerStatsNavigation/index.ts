import { useCallback } from "react";
import type { SavedLineup } from "../../../../../../common/interfaces/Lineup";
import { getLineupPlayerIds } from "../../helpers/getLineupPlayerIds";
import type { OpenMatchScreen } from "../../types";
import { toast } from "../../../../../../common/services/ToastService";

const SAVE_LINEUP_FIRST_MESSAGE =
  "Salve a escalação antes de editar as estatísticas deste jogador.";

interface UsePlayerStatsNavigationParams {
  getSavedLineup: () => SavedLineup | null | undefined;
  onOpenScreen?: OpenMatchScreen;
}

export const usePlayerStatsNavigation = ({
  getSavedLineup,
  onOpenScreen,
}: UsePlayerStatsNavigationParams) =>
  useCallback(
    (playerId: string) => {
      const savedLineup = getSavedLineup();
      const savedPlayerIds = getLineupPlayerIds(savedLineup);

      if (!savedPlayerIds.has(playerId)) {
        toast.info(SAVE_LINEUP_FIRST_MESSAGE);
        return;
      }

      onOpenScreen?.({
        key: "addMatchStatsPlayer",
        playerId,
      });
    },
    [getSavedLineup, onOpenScreen],
  );
