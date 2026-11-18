import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ServiceSeasons } from "../../../../../../common/services/ServiceSeasons";
import { useToast } from "../../../../../../common/hooks/UseToast";

export const useSeasons = (careerId: string) => {
  const navigate = useNavigate();
  const { confirm, error: showError, success: showSuccess } = useToast();
  const [deletingSeasonId, setDeletingSeasonId] = useState<string | null>(null);
  const isDeletingRef = useRef(false);

  const handleNavigateToSeason = useCallback(
    (seasonId: string) => {
      if (isDeletingRef.current) return;
      document.body.classList.remove("modal-open");
      window.scrollTo(0, 0);
      navigate(`/Career/${careerId}/Season/${seasonId}`);
    },
    [careerId, navigate],
  );

  const handleDeleteSeason = useCallback(
    async (seasonId: string, seasonNumber: number) => {
      if (isDeletingRef.current) return;
      isDeletingRef.current = true;

      try {
        const confirmed = await confirm(
          `Deseja deletar permanentemente a temporada ${seasonNumber}?`,
          { tone: "danger", confirmLabel: "Deletar" },
        );

        if (!confirmed) return;

        setDeletingSeasonId(seasonId);

        try {
          await ServiceSeasons.deleteSeason(careerId, seasonId);
          showSuccess("Temporada excluída com sucesso!");
        } catch (error) {
          console.error("Erro ao excluir temporada:", error);
          showError("Falha ao excluir a temporada.");
        } finally {
          setDeletingSeasonId(null);
        }
      } finally {
        isDeletingRef.current = false;
      }
    },
    [careerId, confirm, showError, showSuccess],
  );

  const handleNavigateToGeral = useCallback(
    (careerId: string) => {
      document.body.classList.remove("modal-open");
      window.scrollTo(0, 0);
      navigate(`/Career/${careerId}/Geral`);
    },
    [navigate],
  );

  return {
    handleNavigateToSeason,
    handleDeleteSeason,
    handleNavigateToGeral,
    deletingSeasonId,
  };
};
