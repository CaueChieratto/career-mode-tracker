import { useMemo } from "react";
import { getTableTeamFormFields } from "../../constants/TableTeamFormFields";
import { getAllLeaguesFlat } from "../../../../../../../../../common/utils/league";
import { useAddTeamsToTableContext } from "../../contexts/context";
import { getTableTeamStatPlaceholders } from "../../helpers/tableTeamFormStats";
import { TableRowData } from "../../../../../../../../../common/interfaces/Table";

interface UseTableTeamFormParams {
  addedTeamNames?: string[];
  resolvedTeamToEdit?: TableRowData;
}

const normalizeTeamName = (name?: string): string =>
  (name || "").trim().toLowerCase();

const normalizeLeagueKey = (name?: string): string =>
  (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

export function useTableTeamForm({
  addedTeamNames = [],
  resolvedTeamToEdit,
}: UseTableTeamFormParams = {}) {
  const { career, season, formValues, teamId, teamToEdit } =
    useAddTeamsToTableContext();
  const effectiveTeamToEdit = teamToEdit ?? resolvedTeamToEdit;
  const isEditing = !!teamId;

  const validLeagueKeys = useMemo(() => {
    const keys = new Set<string>();
    getAllLeaguesFlat().forEach((league) => {
      if (league.league === true) {
        keys.add(normalizeLeagueKey(league.name));
      }
    });
    season?.leagues?.forEach((league) => {
      if (league.league === true) {
        keys.add(normalizeLeagueKey(league.name));
      }
    });
    return keys;
  }, [season?.leagues]);

  const teamsInValidMatchesMap = useMemo(() => {
    const teamNames = new Map<string, string>();
    if (season?.matches) {
      season.matches.forEach((match) => {
        if (validLeagueKeys.has(normalizeLeagueKey(match.league))) {
          const home = match.homeTeam?.trim();
          const away = match.awayTeam?.trim();
          if (home) {
            const key = normalizeTeamName(home);
            if (!teamNames.has(key)) teamNames.set(key, home);
          }
          if (away) {
            const key = normalizeTeamName(away);
            if (!teamNames.has(key)) teamNames.set(key, away);
          }
        }
      });
    }
    return teamNames;
  }, [season?.matches, validLeagueKeys]);

  const validSeasonTeams = useMemo(() => {
    if (!season?.teams) return [];
    return season.teams.filter((t) => {
      const teamNameLower = normalizeTeamName(t.name);
      const hasValidLeagueInMatches = teamsInValidMatchesMap.has(teamNameLower);
      if (hasValidLeagueInMatches) return true;
      if (t.showMatch === false) return false;
      const hasValidLeagueInTeamObj =
        Boolean(t.leagueName) &&
        validLeagueKeys.has(normalizeLeagueKey(t.leagueName));
      return hasValidLeagueInTeamObj;
    });
  }, [season, validLeagueKeys, teamsInValidMatchesMap]);

  const allEligibleTeamNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];

    const addUnique = (name?: string) => {
      const trimmed = name?.trim();
      if (!trimmed) return;
      const key = normalizeTeamName(trimmed);
      if (!seen.has(key)) {
        seen.add(key);
        names.push(trimmed);
      }
    };

    validSeasonTeams.forEach((t) => addUnique(t.name));
    teamsInValidMatchesMap.forEach((name) => addUnique(name));
    addUnique(career?.clubName);
    if (isEditing && effectiveTeamToEdit?.name) {
      addUnique(effectiveTeamToEdit.name);
    }

    return names;
  }, [
    validSeasonTeams,
    teamsInValidMatchesMap,
    career?.clubName,
    isEditing,
    effectiveTeamToEdit?.name,
  ]);

  const effectiveTeamName =
    formValues.teamName !== undefined
      ? formValues.teamName
      : isEditing
        ? effectiveTeamToEdit?.name || ""
        : "";

  const teamOptions = useMemo(() => {
    let options = [...allEligibleTeamNames];
    if (addedTeamNames.length > 0) {
      const addedTeamsSet = new Set(addedTeamNames.map(normalizeTeamName));
      const editingNameKey = normalizeTeamName(
        effectiveTeamName || effectiveTeamToEdit?.name,
      );
      options = options.filter((name) => {
        const key = normalizeTeamName(name);
        const isCurrentEditingTeam = isEditing && key === editingNameKey;
        return !addedTeamsSet.has(key) || isCurrentEditingTeam;
      });
    }
    if (effectiveTeamName) {
      const searchValue = normalizeTeamName(effectiveTeamName);
      options = options.filter((name) =>
        normalizeTeamName(name).includes(searchValue),
      );
    }
    return options;
  }, [
    allEligibleTeamNames,
    addedTeamNames,
    isEditing,
    effectiveTeamName,
    effectiveTeamToEdit?.name,
  ]);

  const hasSelectedTeam = useMemo(() => {
    if (!effectiveTeamName) return false;
    const searchName = normalizeTeamName(effectiveTeamName);
    return allEligibleTeamNames.some(
      (name) => normalizeTeamName(name) === searchName,
    );
  }, [effectiveTeamName, allEligibleTeamNames]);

  const formFields = useMemo(
    () =>
      getTableTeamFormFields(
        teamOptions,
        hasSelectedTeam,
        isEditing,
        getTableTeamStatPlaceholders(effectiveTeamToEdit),
      ),
    [teamOptions, hasSelectedTeam, isEditing, effectiveTeamToEdit],
  );

  return { formFields };
}
