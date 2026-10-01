import { useState, useCallback } from "react";
import { ServiceTable } from "../../services/ServiceTable";
import { useAddTeamsToTableContext } from "../../contexts/context";
import { v4 as uuidv4 } from "uuid";
import { resolveTableTeamStatValues } from "../../helpers/tableTeamFormStats";

export function useTableTeamActions() {
  const {
    career,
    season,
    teamId,
    teamToEdit,
    formValues,
    onClose: onSuccess,
  } = useAddTeamsToTableContext();
  const careerId = career.id;
  const seasonId = season.id;

  const [isSaving, setIsSaving] = useState(false);

  const deleteTableTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      setIsSaving(true);
      await ServiceTable.deleteTeamFromTable(careerId, seasonId, teamId);
      onSuccess({ type: "DELETE_TABLE_TEAM", teamId });
    } catch (error) {
      console.error("Erro ao deletar time da tabela: ", error);
      alert("Ocorreu um erro ao deletar os dados. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }, [careerId, seasonId, teamId, onSuccess]);

  const saveTableTeam = useCallback(async () => {
    if (!formValues.teamName) {
      alert("Por favor, selecione um time.");
      return;
    }
    const searchName = formValues.teamName.trim().toLowerCase();
    const existingTeam = season.teams?.find(
      (t) => t.name.trim().toLowerCase() === searchName,
    );
    const isCareerTeam = career?.clubName.trim().toLowerCase() === searchName;

    if (!existingTeam && !isCareerTeam) {
      alert("Por favor, selecione um time válido da lista.");
      return;
    }

    try {
      setIsSaving(true);
      let teamBadge = "";
      if (existingTeam) {
        teamBadge = existingTeam.badge || "";
      } else if (isCareerTeam) {
        teamBadge = career.teamBadge || "";
      }

      const {
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        points,
        goalDiff,
      } = resolveTableTeamStatValues(
        formValues,
        teamId ? teamToEdit : undefined,
      );

      const mapFormToZone = (
        val?: string,
      ):
        | "first"
        | "champions"
        | "europa"
        | "conference"
        | "relegation"
        | "promotion"
        | "promotion_playoff"
        | "none"
        | "default" => {
        switch (val) {
          case "Campeão":
            return "first";
          case "Liga dos Campeões":
            return "champions";
          case "Liga Europeia":
            return "europa";
          case "Conference League":
            return "conference";
          case "Rebaixamento":
            return "relegation";
          case "Acesso":
            return "promotion";
          case "Play-off para Promoção":
            return "promotion_playoff";
          case "Nenhuma":
            return "none";
          default:
            return "default";
        }
      };

      const newId = teamId || uuidv4();

      const tableTeamData = {
        id: newId,
        name: formValues.teamName,
        badge: teamBadge,
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDiff,
        points,
        customZone: mapFormToZone(formValues.customZone),
      };

      if (teamId) {
        await ServiceTable.updateTeamInTable(
          careerId,
          seasonId,
          teamId,
          tableTeamData,
        );
      } else {
        await ServiceTable.addTeamToTable(careerId, seasonId, tableTeamData);
      }

      if (teamId) {
        await ServiceTable.updateTeamInTable(
          careerId,
          seasonId,
          teamId,
          tableTeamData,
        );
        onSuccess({ type: "UPDATE_TABLE_TEAM", team: tableTeamData });
      } else {
        await ServiceTable.addTeamToTable(careerId, seasonId, tableTeamData);
        onSuccess({ type: "ADD_TABLE_TEAM", team: tableTeamData });
      }
    } catch (error) {
      console.error("Erro ao salvar time na tabela: ", error);
      alert("Ocorreu um erro ao salvar os dados. Tente novamente.");
      setIsSaving(false);
    }
  }, [
    careerId,
    seasonId,
    teamId,
    teamToEdit,
    formValues,
    season,
    career,
    onSuccess,
  ]);

  return { isSaving, saveTableTeam, deleteTableTeam };
}
