import { useState, useMemo } from "react";
import { useAcademyContext } from "../../../../../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { AcademyMatches } from "../../../../../../../../interfaces/AcademyTournaments/AcademyMatches/AcademyMatches";
import { PlayerMatchesStats } from "../../../../../../../../interfaces/AcademyTournaments/AcademyMatches/PlayerMatchesStats";
import { getAvailablePlayers } from "../../helpers/getAvailablePlayers";
import { buildUpdatedMatch } from "../../helpers/buildUpdatedMatch";
import { getSuggestedLineup } from "../../helpers/getSuggestedLineup";

export const useManageMatch = (match: AcademyMatches, onBack: () => void) => {
  const {
    playersAcademy,
    allPlayersAcademy,
    selectedTournament,
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

    let isFinished = false;
    let isChampion = false;
    let tournamentResult = "";

    if (updatedMatches.every((m) => m.result !== "FINISHED")) {
      tournamentResult = "Torneio Marcado";
    }

    for (const m of updatedMatches) {
      if (m.result !== "FINISHED") continue;

      const mStatus = m.status?.trim().toLowerCase() || "";
      const isFinalMatch = mStatus === "final";
      const isGroupStageMatch = mStatus === "fase de grupos";
      const uG = Number(m.userGoals) || 0;
      const oG = Number(m.opponentGoals) || 0;

      let isDefeat = uG < oG;
      let isVictory = uG > oG;

      if (
        uG === oG &&
        m.userPenalties !== undefined &&
        m.opponentPenalties !== undefined
      ) {
        isDefeat = m.userPenalties < m.opponentPenalties;
        isVictory = m.userPenalties > m.opponentPenalties;
      }

      if (isDefeat && !isGroupStageMatch) {
        isFinished = true;
        isChampion = false;
        tournamentResult = isFinalMatch ? "Vice-Campeão" : `Eliminado`;
        break;
      }

      if (isFinalMatch && isVictory) {
        isFinished = true;
        isChampion = true;
        tournamentResult = "Campeão";
        break;
      }
    }

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
      setSelectedPlayerIdForStats(null);
    } catch (error) {
      console.error("Erro ao salvar estatísticas do jogador:", error);
      alert("Falha ao salvar as estatísticas.");
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
