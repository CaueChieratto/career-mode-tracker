import { useState, useMemo } from "react";
import { useAcademyContext } from "../../../../../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { AcademyMatches } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { PlayerMatchesStats } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { getAvailablePlayers } from "../../helpers/getAvailablePlayers";
import { buildUpdatedMatch } from "../../helpers/buildUpdatedMatch";
import { getSuggestedLineup } from "../../helpers/getSuggestedLineup";
import { evaluateTournamentStatus } from "../../../../../../helpers/evaluateTournamentStatus";
import { toast } from "../../../../../../../../../../../../common/services/ToastService";

export const useManageMatch = (match: AcademyMatches, onBack: () => void) => {
  const {
    playersAcademy,
    allPlayersAcademy,
    selectedTournament,
    allTournamentsAcademy,
    onUpdateTournament,
    career,
  } = useAcademyContext();

  const [userGoals, setUserGoals] = useState<number | string>(
    match.result === "SCHEDULED" ? "" : (match.userGoals ?? ""),
  );
  const [opponentGoals, setOpponentGoals] = useState<number | string>(
    match.result === "SCHEDULED" ? "" : (match.opponentGoals ?? ""),
  );

  const [userPenalties, setUserPenalties] = useState<number | string>(
    match.result === "SCHEDULED" ? "" : (match.userPenalties ?? ""),
  );
  const [opponentPenalties, setOpponentPenalties] = useState<number | string>(
    match.result === "SCHEDULED" ? "" : (match.opponentPenalties ?? ""),
  );

  const [lineupStats, setLineupStats] = useState<PlayerMatchesStats[]>(() => {
    if (match.lineup && match.lineup.length > 0) return match.lineup;
    return getSuggestedLineup(
      selectedTournament?.matches || [],
      match,
      allPlayersAcademy,
      allTournamentsAcademy,
      selectedTournament?.id,
    );
  });
  const [selectedSearchValue, setSelectedSearchValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingStats, setIsSavingStats] = useState(false);
  const [selectedPlayerIdForStats, setSelectedPlayerIdForStats] = useState<
    string | null
  >(null);

  const availablePlayers = useMemo(
    () =>
      getAvailablePlayers(allPlayersAcademy, lineupStats, match.date, career),
    [allPlayersAcademy, lineupStats, match.date, career],
  );

  const availablePlayerNames = useMemo(() => {
    return availablePlayers.map((p) => p.name);
  }, [availablePlayers]);

  const saveMatchToDB = async (
    currentLineup: PlayerMatchesStats[],
    currentUGoals: number | string,
    currentOGoals: number | string,
    currentUPenalties: number | string,
    currentOPenalties: number | string,
    isFinishing: boolean = false,
  ) => {
    if (!selectedTournament || !onUpdateTournament) return;
    setIsSaving(true);

    const updatedMatch = buildUpdatedMatch(
      match,
      currentLineup,
      currentUGoals,
      currentOGoals,
      currentUPenalties,
      currentOPenalties,
      isFinishing,
      allPlayersAcademy,
    );

    const updatedMatches = selectedTournament.matches.map((m) =>
      m.id === match.id ? updatedMatch : m,
    );

    const { isFinished, isChampion, tournamentResult } =
      evaluateTournamentStatus(updatedMatches);

    await onUpdateTournament(
      {
        ...selectedTournament,
        matches: updatedMatches,
        isFinished,
        isChampion,
        tournamentResult,
      },
      true,
    );
    setIsSaving(false);
  };

  const handleAddPlayer = async () => {
    if (!selectedSearchValue || isSaving) return;
    const playerToAdd = availablePlayers.find(
      (p) => p.name === selectedSearchValue,
    );
    if (playerToAdd) {
      const newPlayerStat: PlayerMatchesStats = {
        playerId: playerToAdd.id,
        playerName: playerToAdd.name,
        goals: null,
        assists: null,
        rating: null,
        defesas: null,
        cleanSheets: null,
      };
      const newLineup = [...lineupStats, newPlayerStat];
      setLineupStats(newLineup);
      setSelectedSearchValue("");
      await saveMatchToDB(
        newLineup,
        userGoals,
        opponentGoals,
        userPenalties,
        opponentPenalties,
      );
    }
  };

  const handleRemovePlayer = async (id: string) => {
    if (isSaving) return;
    const newLineup = lineupStats.filter((p) => p.playerId !== id);
    setLineupStats(newLineup);
    if (selectedPlayerIdForStats === id) {
      setSelectedPlayerIdForStats(null);
    }
    await saveMatchToDB(
      newLineup,
      userGoals,
      opponentGoals,
      userPenalties,
      opponentPenalties,
    );
  };

  const handleStatChange = (
    playerId: string,
    field: keyof PlayerMatchesStats,
    value: number | string,
  ) => {
    const newLineup = lineupStats.map((p) => {
      if (p.playerId === playerId) {
        return { ...p, [field]: value } as unknown as PlayerMatchesStats;
      }
      return p;
    });
    setLineupStats(newLineup);
  };

  const handleSave = async () => {
    await saveMatchToDB(
      lineupStats,
      userGoals,
      opponentGoals,
      userPenalties,
      opponentPenalties,
      true,
    );
    onBack();
  };

  const handleSavePlayerStats = async (playerId: string) => {
    if (!selectedTournament) return;
    setIsSavingStats(true);
    try {
      const playerStats = lineupStats.find((p) => p.playerId === playerId);
      if (!playerStats) return;
      const player = allPlayersAcademy.find((p) => p.id === playerId);
      const isGol = player?.position === "GOL";
      const oppGoalsNum = Number(opponentGoals) || 0;

      const finalStats: PlayerMatchesStats = {
        ...playerStats,
        defesas: isGol ? playerStats.defesas : null,
        cleanSheets: isGol ? (oppGoalsNum === 0 ? 1 : 0) : null,
      };

      const updatedLineup = lineupStats.map((p) =>
        p.playerId === playerId ? finalStats : p,
      );

      setLineupStats(updatedLineup);
      await saveMatchToDB(
        updatedLineup,
        userGoals,
        opponentGoals,
        userPenalties,
        opponentPenalties,
      );
      toast.success("Estatísticas da partida salvas com sucesso!");
      setSelectedPlayerIdForStats(null);
    } catch (error) {
      console.error("Erro ao salvar estatísticas do jogador:", error);
      toast.error("Falha ao salvar as estatísticas.");
    } finally {
      setIsSavingStats(false);
    }
  };

  const selectedStats = lineupStats.find(
    (p) => p.playerId === selectedPlayerIdForStats,
  );

  return {
    userGoals,
    setUserGoals,
    opponentGoals,
    setOpponentGoals,
    userPenalties,
    setUserPenalties,
    opponentPenalties,
    setOpponentPenalties,
    lineupStats,
    selectedSearchValue,
    setSelectedSearchValue,
    isSaving,
    isSavingStats,
    selectedPlayerIdForStats,
    setSelectedPlayerIdForStats,
    availablePlayerNames,
    handleAddPlayer,
    handleRemovePlayer,
    handleStatChange,
    handleSavePlayerStats,
    handleSave,
    selectedStats,
    playersAcademy,
    allPlayersAcademy,
  };
};
