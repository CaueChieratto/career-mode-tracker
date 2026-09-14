import { useState, useEffect } from "react";
import { Career } from "../../../interfaces/Career";
import { ClubData } from "../../../interfaces/club/clubData";
import { Players } from "../../../interfaces/playersInfo/players";
import { LeagueStats } from "../../../interfaces/playersStats/leagueStats";
import { useAddSeasonPlayerForm } from "../UseAddSeasonPlayerForm";
import { useLeagueStatsManager } from "../UseLeagueStatsManager";
import { useSeasonStatsFormData } from "../UseSeasonStatsFormData";
import { ServicePlayers } from "../../../services/ServicePlayers";

type UsePlayerSeasonStatsProps = {
  career: Career;
  season: ClubData;
  player?: Players;
  leagueFormRef: React.RefObject<HTMLDivElement>;
};

export const usePlayerSeasonStats = ({
  career,
  season,
  player,
  leagueFormRef,
}: UsePlayerSeasonStatsProps) => {
  const {
    formValues,
    setFormValues,
    handleInputChange,
    booleanValues,
    handleBooleanChange,
  } = useAddSeasonPlayerForm();

  const [initialLeagues, setInitialLeagues] = useState<LeagueStats[]>([]);
  const [isGoalkeeper, setIsGoalkeeper] = useState(false);
  const [isDeletingLeague, setIsDeletingLeague] = useState(false);

  useEffect(() => {
    if (player) {
      setFormValues((prev) => ({ ...prev, playerName: player.name }));
      handleBooleanChange("ballonDor", player.ballonDor > 0);
      setInitialLeagues(player.manualStatsLeagues ?? player.statsLeagues ?? []);
      setIsGoalkeeper(player.position === "GOL");
    }
  }, [player, setFormValues, handleBooleanChange]);

  useEffect(() => {
    const selectedPlayerName = formValues.playerName;
    if (selectedPlayerName) {
      const currentPlayer = season.players.find(
        (p) => p.name === selectedPlayerName,
      );
      setIsGoalkeeper(currentPlayer?.position === "GOL");
    } else {
      setIsGoalkeeper(false);
    }
  }, [formValues.playerName, season.players]);

  const {
    leagues,
    originalLeagueNameToEdit,
    setOriginalLeagueNameToEdit,
    handleAddOrEditLeague,
    isLoading,
  } = useLeagueStatsManager({
    career,
    season,
    formValues,
    setFormValues,
    initialLeagues,
  });

  const { finalFormItems } = useSeasonStatsFormData({
    season,
    player,
    leagues,
    originalLeagueNameToEdit,
  });

  const handleLeagueClick = (leagueToEdit: LeagueStats) => {
    setFormValues((prev) => ({
      ...prev,
      leagueName: leagueToEdit.leagueName,
      games: String(leagueToEdit.stats.games),
      goals: String(leagueToEdit.stats.goals),
      assists: String(leagueToEdit.stats.assists),
      rating: String(leagueToEdit.stats.rating),
      cleanSheets: String(leagueToEdit.stats.cleanSheets),
    }));
    setOriginalLeagueNameToEdit(leagueToEdit.leagueName);

    setTimeout(() => {
      leagueFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);
  };

  const handleDeleteLeague = async (leagueName: string): Promise<boolean> => {
    if (!player) return false;
    setIsDeletingLeague(true);
    try {
      await ServicePlayers.deleteLeagueStatsFromPlayer(
        career.id,
        season.id,
        player.id,
        leagueName,
      );
      return true;
    } catch (error) {
      console.error("Erro ao deletar a liga:", error);
      alert("Não foi possível remover a liga.");
      return false;
    } finally {
      setIsDeletingLeague(false);
    }
  };

  return {
    formValues,
    booleanValues,
    leagues,
    isGoalkeeper,
    originalLeagueNameToEdit,
    finalFormItems,
    handleInputChange,
    handleBooleanChange,
    handleLeagueClick,
    handleAddOrEditLeague,
    handleDeleteLeague,
    isLoading,
    isDeletingLeague,
  };
};
