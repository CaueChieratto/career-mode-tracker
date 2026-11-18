import { contributesToLeagueStandings } from "../../../../../../../../../common/utils/league";

export const isLeagueCompetition = (leagueName: string): boolean => {
  return contributesToLeagueStandings(leagueName);
};
