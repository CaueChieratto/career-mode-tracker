import { useState, useCallback } from "react";
import { ServiceTable } from "../../../../../../../../../common/services/ServiceTable";
import { useAddTeamsToTableContext } from "../../contexts/context";
import { v4 as uuidv4 } from "uuid";
import { resolveTableTeamStatValues } from "../../helpers/tableTeamFormStats";
import { toast } from "../../../../../../../../../common/services/ToastService";
import { NavigationSessionStore } from "../../../../../../../../../common/services/NavigationSessionStore";

import { TableRowData } from "../../../../../../../../../common/interfaces/Table";

export function useTableTeamActions(resolvedTeamToEdit?: TableRowData) {
  const {
    career,
    season,
    teamId,
    teamToEdit: contextTeamToEdit,
    formValues,
    onClose: onSuccess,
  } = useAddTeamsToTableContext();
  const teamToEdit = contextTeamToEdit ?? resolvedTeamToEdit;
  const careerId = career.id;
  const seasonId = season.id;

  const [isSaving, setIsSaving] = useState(false);

  const deleteTableTeam = useCallback(async () => {
    if (!teamId) return;
    try {
      setIsSaving(true);
      await ServiceTable.deleteTeamFromTable(careerId, seasonId, teamId);
      toast.success("Time removido da tabela com sucesso!");
      onSuccess({ type: "DELETE_TABLE_TEAM", teamId });
    } catch (error) {
      console.error("Erro ao deletar time da tabela: ", error);
      toast.error("Ocorreu um erro ao deletar os dados. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }, [careerId, seasonId, teamId, onSuccess]);

  const saveTableTeam = useCallback(async () => {
    if (!formValues.teamName) {
      toast.warning("Por favor, selecione um time.");
      return;
    }
    const searchName = formValues.teamName.trim().toLowerCase();
    const existingTeam = season.teams?.find(
      (t) => t.name.trim().toLowerCase() === searchName,
    );
    const isCareerTeam = career?.clubName.trim().toLowerCase() === searchName;
    const isEditingCurrentTeam = Boolean(
      teamId &&
        teamToEdit?.name &&
        teamToEdit.name.trim().toLowerCase() === searchName,
    );
    const isMatchTeam = Boolean(
      season.matches?.some(
        (m) =>
          m.homeTeam?.trim().toLowerCase() === searchName ||
          m.awayTeam?.trim().toLowerCase() === searchName,
      ),
    );

    if (
      !existingTeam &&
      !isCareerTeam &&
      !isEditingCurrentTeam &&
      !isMatchTeam
    ) {
      toast.warning("Por favor, selecione um time válido da lista.");
      return;
    }

    try {
      setIsSaving(true);
      let teamBadge = "";
      if (existingTeam) {
        teamBadge =
          existingTeam.badge ||
          (isEditingCurrentTeam ? teamToEdit?.badge || "" : "");
      } else if (isCareerTeam) {
        teamBadge = career.teamBadge || "";
      } else if (isEditingCurrentTeam && teamToEdit?.badge) {
        teamBadge = teamToEdit.badge;
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

      NavigationSessionStore.saveClickAnchor("table", {
        scrollY: 0,
        anchorSelector: `#table-row-${newId}`,
        updatedAt: Date.now(),
      });

      if (teamId) {
        await ServiceTable.updateTeamInTable(
          careerId,
          seasonId,
          teamId,
          tableTeamData,
        );
        toast.success("Dados do time atualizados com sucesso!");
        onSuccess({ type: "UPDATE_TABLE_TEAM", team: tableTeamData });
      } else {
        await ServiceTable.addTeamToTable(careerId, seasonId, tableTeamData);
        toast.success("Time adicionado à tabela com sucesso!");
        onSuccess({ type: "ADD_TABLE_TEAM", team: tableTeamData });
      }
    } catch (error) {
      console.error("Erro ao salvar time na tabela: ", error);
      toast.error("Ocorreu um erro ao salvar os dados. Tente novamente.");
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
