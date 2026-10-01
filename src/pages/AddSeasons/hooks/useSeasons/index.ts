import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ServiceSeasons } from "../../../../common/services/ServiceSeasons";

export const useSeasons = (careerId: string) => {
  const navigate = useNavigate();

  const handleNavigateToSeason = useCallback(
    (seasonId: string) => {
      document.body.classList.remove("modal-open");
      window.scrollTo(0, 0);
      navigate(`/Career/${careerId}/Season/${seasonId}`);
    },
    [careerId, navigate],
  );

  const handleDeleteSeason = useCallback(
    async (seasonId: string, seasonNumber: number) => {
      const confirmed = window.confirm(
        `Deseja deletar permanentemente a temporada ${seasonNumber}?`,
      );

      if (!confirmed) return;

      try {
        await ServiceSeasons.deleteSeason(careerId, seasonId);
      } catch (error) {
        console.error("Erro ao excluir temporada:", error);
        alert("Falha ao excluir a temporada.");
      }
    },
    [careerId],
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
  };
};
