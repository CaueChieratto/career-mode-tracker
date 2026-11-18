import { useCallback, useMemo } from "react";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { Teams } from "../../../../../../../common/interfaces/Teams";
import { ServiceMatches } from "../../../../../../../common/services/ServiceMatches";
import { useUserCareerTeams } from "../../../../../hooks/useUserCareerTeams";

const IGNORED_SPECIAL_CLUBS = new Set([
  "aposentadoria",
  "aposentou",
  "fim de contrato",
]);

export const ensureTeamSavedInSeason = async (
  careerId: string,
  seasonId: string,
  season: ClubData | undefined,
  teamName?: string,
): Promise<boolean> => {
  const cleanedName = teamName?.trim();
  if (!cleanedName) return false;
  if (IGNORED_SPECIAL_CLUBS.has(cleanedName.toLowerCase())) return false;

  const teamAlreadyExists = season?.teams?.some(
    (t) => t.name.toLowerCase() === cleanedName.toLowerCase(),
  );

  if (teamAlreadyExists) return false;

  const newTeam: Teams = {
    name: cleanedName,
    showMatch: false,
  };

  await ServiceMatches.addTeamToSeason(careerId, seasonId, newTeam);
  return true;
};

export interface UseGlobalTeamsOptionsParams {
  career: Career;
  season?: ClubData;
  searchQuery?: string;
  excludeCurrentClub?: boolean;
}

export const useGlobalTeamsOptions = ({
  career,
  season,
  searchQuery = "",
  excludeCurrentClub = true,
}: UseGlobalTeamsOptionsParams) => {
  const { teams, isLoading, refreshTeams } = useUserCareerTeams(career);

  const globalTeams = useMemo(() => {
    if (!excludeCurrentClub || !career?.clubName) {
      return teams;
    }
    const currentClubNormalized = career.clubName.trim().toLowerCase();
    return teams.filter(
      (teamName) => teamName.trim().toLowerCase() !== currentClubNormalized,
    );
  }, [teams, excludeCurrentClub, career?.clubName]);

  const filteredTeamOptions = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase().replace(/\s/g, "");
    if (!normalizedSearch) {
      return globalTeams;
    }
    return globalTeams.filter((teamName) =>
      teamName.toLowerCase().replace(/\s/g, "").includes(normalizedSearch),
    );
  }, [globalTeams, searchQuery]);

  const ensureTeamSaved = useCallback(
    async (teamName?: string) => {
      if (!career?.id || !season?.id) return false;
      return ensureTeamSavedInSeason(career.id, season.id, season, teamName);
    },
    [career?.id, season],
  );

  return {
    globalTeams,
    filteredTeamOptions,
    isLoading,
    refreshTeams,
    ensureTeamSavedInSeason: ensureTeamSaved,
  };
};

export default useGlobalTeamsOptions;
