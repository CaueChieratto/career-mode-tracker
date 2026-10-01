import { useMemo } from "react";
import { getTableTeamFormFields } from "../../constants/TableTeamFormFields";
import { leaguesByContinent } from "../../../../../../../../../common/utils/league";
import { useAddTeamsToTableContext } from "../../contexts/context";
import { getTableTeamStatPlaceholders } from "../../helpers/tableTeamFormStats";

interface UseTableTeamFormParams {
  addedTeamNames?: string[];
}

export function useTableTeamForm({
  addedTeamNames = [],
}: UseTableTeamFormParams = {}) {
  const { career, season, formValues, teamId, teamToEdit } =
    useAddTeamsToTableContext();
  const isEditing = !!teamId;

  const validLeagueNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(leaguesByContinent).forEach((continent) => {
      Object.values(continent).forEach((countryLeagues) => {
        countryLeagues.forEach((league) => {
          if (league.league === true) {
            names.add(league.name);
          }
        });
      });
    });
    return names;
  }, []);

  const teamsInValidMatches = useMemo(() => {
    const teamNames = new Set<string>();
    if (season?.matches) {
      season.matches.forEach((match) => {
        if (validLeagueNames.has(match.league)) {
          teamNames.add(match.homeTeam.toLowerCase().trim());
          teamNames.add(match.awayTeam.toLowerCase().trim());
        }
      });
    }
    return teamNames;
  }, [season?.matches, validLeagueNames]);

  const validSeasonTeams = useMemo(() => {
    if (!season?.teams) return [];
    return season.teams.filter((t) => {
      if (t.showMatch === false) return false;
      const teamNameLower = t.name.toLowerCase().trim();
      const hasValidLeagueInTeamObj =
        t.leagueName && validLeagueNames.has(t.leagueName);
      const hasValidLeagueInMatches = teamsInValidMatches.has(teamNameLower);
      if (!hasValidLeagueInTeamObj && !hasValidLeagueInMatches) return false;
      return true;
    });
  }, [season, validLeagueNames, teamsInValidMatches]);

  const teamOptions = useMemo(() => {
    let options = validSeasonTeams.map((t) => t.name);
    if (
      career?.clubName &&
      !options.some(
        (name) =>
          name.trim().toLowerCase() === career.clubName.trim().toLowerCase(),
      )
    ) {
      options.push(career.clubName);
    }
    if (addedTeamNames.length > 0) {
      const addedTeamsSet = new Set(addedTeamNames);
      options = options.filter((name) => {
        const isCurrentEditingTeam = isEditing && name === formValues.teamName;
        return !addedTeamsSet.has(name) || isCurrentEditingTeam;
      });
    }
    if (formValues.teamName) {
      const searchValue = formValues.teamName.trim().toLowerCase();
      options = options.filter((name) =>
        name.toLowerCase().includes(searchValue),
      );
    }
    return options;
  }, [
    validSeasonTeams,
    career,
    formValues.teamName,
    addedTeamNames,
    isEditing,
  ]);

  const hasSelectedTeam = useMemo(() => {
    if (!formValues.teamName) return false;
    const searchName = formValues.teamName.trim().toLowerCase();
    const allOptions = validSeasonTeams.map((t) => t.name);
    if (career?.clubName) allOptions.push(career.clubName);
    return allOptions.some((name) => name.trim().toLowerCase() === searchName);
  }, [formValues.teamName, validSeasonTeams, career]);

  const formFields = useMemo(
    () =>
      getTableTeamFormFields(
        teamOptions,
        hasSelectedTeam,
        isEditing,
        getTableTeamStatPlaceholders(teamToEdit),
      ),
    [teamOptions, hasSelectedTeam, isEditing, teamToEdit],
  );

  return { formFields };
}
