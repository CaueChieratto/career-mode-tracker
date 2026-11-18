import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAcademyContext } from "../../../../../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { AcademyMatches } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { getSeasonStartYear } from "../../../../../../../../utils/getSeasonStartYear";
import { MatchDataPayload } from "../../../../forms/types/MatchDataPayload";
import { isEuropeanSeason } from "../../../../../../../../utils/isEuropeanSeason";
import { evaluateTournamentStatus } from "../../../../../../helpers/evaluateTournamentStatus";
import { toast } from "../../../../../../../../../../../../common/services/ToastService";

export const useAcademyMatchMutations = (
  initialData?: Partial<AcademyMatches>,
  onMatchAdded?: () => void,
) => {
  const { career, seasonId, selectedTournament, onUpdateTournament } =
    useAcademyContext();
  const [formKey, setFormKey] = useState(0);

  const getRecalculatedStatus = (matches: AcademyMatches[]) =>
    evaluateTournamentStatus(matches);

  const handleSubmitMatch = async (data: MatchDataPayload) => {
    if (!selectedTournament || !onUpdateTournament) return;
    if (!data.opponentTeam || data.opponentTeam.trim() === "") {
      toast.warning("Por favor, selecione um adversário.");
      return;
    }

    try {
      const [day, month] = data.date.split("/");
      let year = getSeasonStartYear(career, seasonId);
      const isEurope = isEuropeanSeason(career);

      if (isEurope && Number(month) < 7) {
        year += 1;
      }

      const finalDate = `${day}/${month}/${year}`;
      let updatedMatches = [...(selectedTournament.matches || [])];

      if (initialData?.id) {
        updatedMatches = updatedMatches.map((match) =>
          match.id === initialData.id
            ? {
                ...match,
                date: finalDate,
                opponentTeam: data.opponentTeam,
                status: data.status,
              }
            : match,
        );
      } else {
        const newMatch: AcademyMatches = {
          id: uuidv4(),
          date: finalDate,
          opponentTeam: data.opponentTeam,
          status: data.status,
          userGoals: 0,
          opponentGoals: 0,
          lineup: [],
          result: "SCHEDULED",
        };
        updatedMatches.push(newMatch);
      }

      const newStatus = getRecalculatedStatus(updatedMatches);

      const updatedTournament = {
        ...selectedTournament,
        matches: updatedMatches,
        totalMatches: updatedMatches.length,
        ...newStatus,
      };

      await onUpdateTournament(updatedTournament, true);
      toast.success("Partida da base salva com sucesso!");
      setFormKey((prev) => prev + 1);
      if (onMatchAdded) onMatchAdded();
    } catch (error) {
      console.error("Erro ao salvar partida:", error);
      toast.error("Falha ao salvar a partida. Tente novamente.");
    }
  };

  const handleDeleteMatch = async () => {
    if (!selectedTournament || !onUpdateTournament || !initialData?.id) return;

    try {
      const updatedMatches =
        selectedTournament.matches?.filter((m) => m.id !== initialData.id) ||
        [];

      const newStatus = getRecalculatedStatus(updatedMatches);

      const updatedTournament = {
        ...selectedTournament,
        matches: updatedMatches,
        totalMatches: updatedMatches.length,
        ...newStatus,
      };

      await onUpdateTournament(updatedTournament, true);
      toast.success("Partida da base excluída com sucesso!");
      if (onMatchAdded) onMatchAdded();
    } catch (error) {
      console.error("Erro ao deletar partida:", error);
      toast.error("Falha ao deletar a partida. Tente novamente.");
      throw error;
    }
  };

  return { formKey, handleSubmitMatch, handleDeleteMatch };
};
