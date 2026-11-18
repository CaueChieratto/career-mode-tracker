import { v4 as uuidv4 } from "uuid";
import { parseFullBrasilDate } from "../../../utils/Date";
import { Career } from "../../../interfaces/Career";
import { ColorsService } from "../../../services/ColorsService";
import { ServiceClubBadges } from "../../../services/ServiceClubBadges";

export type UseCreateCareerProps = {
  club: string;
  manager: string;
  nation: string;
  createdAt: string;
  primaryColor: string;
  secondaryColor: string;
};

export async function UseCreateCareer({
  club,
  manager,
  nation,
  createdAt,
  primaryColor,
  secondaryColor,
}: UseCreateCareerProps): Promise<Career> {
  const trimmedClub = club.trim();
  const teamBadge = await ServiceClubBadges.resolveClubBadge(trimmedClub);
  const createdAtParsed = parseFullBrasilDate(createdAt) ?? new Date();

  const newCareer: Career = {
    id: uuidv4(),
    clubName: trimmedClub,
    managerName: manager.trim(),
    createdAt: createdAtParsed,
    teamBadge,
    nation: nation.trim(),
    colorsTeams: [primaryColor, secondaryColor],
    trophies: [],
    clubData: [],
  };

  if (primaryColor) {
    ColorsService.saveColors(newCareer.id, primaryColor);
  }

  return newCareer;
}
