import { AcademyData } from "./AcademyData";
import { ClubData } from "./club/clubData";
import { Trophy } from "./club/trophy";

export interface Career {
  id: string;
  clubName: string;
  managerName: string;
  createdAt: Date;
  teamBadge: string;
  nation: string;
  currency?: string;
  updatedAt?: number;
  academy?: AcademyData;
  groupId?: string | null;
  colorsTeams: string[];
  trophies: Trophy[];
  clubData: ClubData[];
  stadiums?: string[];
  stages?: string[];
}
