import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { Players } from "../../../interfaces/playersInfo/players";
import { ServicePlayers } from "../../../services/ServicePlayers";
import { Career } from "../../../interfaces/Career";
import { toast } from "../../../services/ToastService";

type UsePlayerStatsProps = {
  career: Career;
  careerId: string;
  currentPlayers?: Players[];
  handleGoBack: () => void;
};

export const usePlayerStats = ({
  career,
  careerId,
  currentPlayers,
  handleGoBack,
}: UsePlayerStatsProps) => {
  const { seasonId } = useParams<{ seasonId: string }>();
  const [isStatsLoading, setIsLoading] = useState(false);

  const handleStatsSave = useCallback(
    async (formData: FormData): Promise<boolean> => {
      setIsLoading(true);
      try {
        const ballonDorValue = formData.get("ballonDor") === "true" ? 1 : 0;
        const playerNameValue = formData.get("playerName") as string;
        const draftedLeaguesStr = formData.get("draftedLeagues") as string;

        if (playerNameValue) {
          const playerToUpdate = currentPlayers?.find(
            (p) => p.name === playerNameValue,
          );

          if (playerToUpdate) {
            await ServicePlayers.updatePlayerBallonDor(
              careerId,
              seasonId!,
              playerToUpdate.id,
              ballonDorValue,
            );

            if (draftedLeaguesStr) {
              const leaguesToSave = JSON.parse(draftedLeaguesStr);
              await ServicePlayers.updatePlayerStatsLeagues(
                career,
                seasonId!,
                playerToUpdate.id,
                leaguesToSave,
              );

              localStorage.removeItem(
                `stats_backup_${career.id}_${seasonId}_${playerToUpdate.id}`,
              );
            }
          }
        }

        toast.success("Desempenho do jogador salvo com sucesso!");
        handleGoBack();
        return true;
      } catch (error) {
        console.error("Falha ao salvar o desempenho:", error);
        toast.error("Falha ao salvar o desempenho.");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [career, careerId, seasonId, currentPlayers, handleGoBack],
  );

  return { handleStatsSave, isStatsLoading };
};
