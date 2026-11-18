import { League } from "../../../../../../../../../common/interfaces/League";
import { FootballDataService } from "../../../../../../../../../common/services/FootballDataService";
import { Teams } from "../../../../../../../../../common/interfaces/Teams";
import { ServiceClubBadges } from "../../../../../../../../../common/services/ServiceClubBadges";

interface BuildTeamDataParams {
  opponentTeam: string;
  selectedLeague?: League;
}

export async function buildTeamData({
  opponentTeam,
  selectedLeague,
}: BuildTeamDataParams): Promise<Teams> {
  const teamApi = await FootballDataService.fetchTeamByClubName(opponentTeam);
  const resolvedColors = await ServiceClubBadges.resolveClubColors(opponentTeam);

  const teamData: Teams = {
    name: opponentTeam,
    badge: teamApi?.badge || "",
    ...(resolvedColors && resolvedColors.length >= 2 ? { colors: resolvedColors } : {}),
  };

  if (selectedLeague?.name) {
    teamData.leagueName = selectedLeague.name;
  }

  return teamData;
}
