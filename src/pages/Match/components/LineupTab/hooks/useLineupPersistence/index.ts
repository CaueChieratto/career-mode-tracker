import { useCallback, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import type { Match } from "../../../../../../common/interfaces/Match";
import type { SavedLineup } from "../../../../../../common/interfaces/Lineup";
import { buildLineupStatsUpdate } from "../../helpers/buildLineupStatsUpdate";
import type { MatchSavedCallback, RegisterLineupSave } from "../../types";
import { useSaveLineup } from "../useSaveLineup";

interface UseLineupPersistenceParams {
  match: Match;
  buildSavedLineup: () => SavedLineup;
  onRegisterSave?: RegisterLineupSave;
  onSaved?: MatchSavedCallback;
}

export const useLineupPersistence = ({
  match,
  buildSavedLineup,
  onRegisterSave,
  onSaved,
}: UseLineupPersistenceParams) => {
  const { careerId, seasonId } = useParams<{
    careerId: string;
    seasonId: string;
  }>();

  const savedLineupRef = useRef<SavedLineup | null>(match.lineup || null);

  const saveLineup = useSaveLineup({
    careerId,
    seasonId,
    matchId: match.matchesId,
  });

  useEffect(() => {
    if (match.lineup) {
      savedLineupRef.current = match.lineup;
    }
  }, [match.lineup]);

  useEffect(() => {
    onRegisterSave?.(async () => {
      const currentSavedLineup = buildSavedLineup();

      const { updatedPlayerStats, removedPlayerIds } = buildLineupStatsUpdate(
        currentSavedLineup,
        match.playerStats,
      );

      const saved = await saveLineup(
        currentSavedLineup,
        updatedPlayerStats,
        removedPlayerIds,
      );
      if (!saved) return;

      savedLineupRef.current = currentSavedLineup;

      onSaved?.({
        lineup: currentSavedLineup,
        playerStats: updatedPlayerStats,
      });
    });
  }, [
    onRegisterSave,
    saveLineup,
    buildSavedLineup,
    match.playerStats,
    onSaved,
  ]);

  const getSavedLineup = useCallback(
    () => savedLineupRef.current || match.lineup,
    [match.lineup],
  );

  return {
    getSavedLineup,
  };
};
