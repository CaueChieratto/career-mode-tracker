import { useCallback, useState } from "react";
import { savePlayerMatchStats } from "../../services/savePlayerMatchStats";
import type { SavePlayerMatchStatsParams } from "../../services/savePlayerMatchStats";
import type {
  PlayerStatsBooleanValues,
  PlayerStatsFormValues,
} from "../../types";
import { Match } from "../../../../../../../../common/interfaces/Match";
import { toast } from "../../../../../../../../common/services/ToastService";

interface UseSavePlayerStatsParams extends Omit<
  SavePlayerMatchStatsParams,
  "player" | "formValues" | "booleanValues"
> {
  player: SavePlayerMatchStatsParams["player"] | undefined;
  formValues: PlayerStatsFormValues;
  booleanValues: PlayerStatsBooleanValues;
  onClose: () => void;
  onSaved?: (match: Partial<Match>) => void;
}

export const useSavePlayerStats = ({
  career,
  season,
  match,
  player,
  formValues,
  booleanValues,
  onClose,
  onSaved,
}: UseSavePlayerStatsParams) => {
  const [isSaving, setIsSaving] = useState(false);

  const savePlayerStats = useCallback(async () => {
    if (!career || !season || !match || !player) {
      return;
    }

    setIsSaving(true);

    try {
      const { updatedPlayerStats } = await savePlayerMatchStats({
        career,
        season,
        match,
        player,
        formValues,
        booleanValues,
      });

      onSaved?.({
        playerStats: updatedPlayerStats,
      });

      toast.success("Estatísticas do jogador salvas com sucesso!");

      onClose();
    } catch (error) {
      console.error("Erro: ", error);
      toast.error("Erro ao salvar as estatísticas do jogador. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }, [
    career,
    season,
    match,
    player,
    formValues,
    booleanValues,
    onClose,
    onSaved,
  ]);

  return {
    isSaving,
    savePlayerStats,
  };
};
