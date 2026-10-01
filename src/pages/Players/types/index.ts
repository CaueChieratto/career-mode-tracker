import type { Career } from "../../../common/interfaces/Career";

type CareerSeason = NonNullable<Career["clubData"]>[number];

export type CareerPlayer = NonNullable<CareerSeason["players"]>[number];

export type PlayerIdentity = Pick<CareerPlayer, "name" | "nation">;

export interface PlayerPageParams {
  [key: string]: string | undefined;
  playerId?: string;
  seasonId?: string;
}

export interface GetGroupCareersParams {
  career: Career | null | undefined;
  allCareers: readonly Career[];
  isFromGroup: boolean;
  urlGroupId: string | null;
}

export interface FindPlayerForSeasonParams {
  actualSeason: CareerSeason | null | undefined;
  career: Career | null | undefined;
  groupCareers: readonly Career[];
  isFromGroup: boolean;
  playerId: string | undefined;
  season: CareerSeason | null | undefined;
}

export interface CreateSpoofedCareerParams {
  career: Career | null | undefined;
  isFromGroup: boolean;
  isNotSeason: boolean;
  player: CareerPlayer | undefined;
  playerId: string | undefined;
}

export interface GetPlayerCareerSummaryParams {
  careers: readonly Career[];
  player: CareerPlayer | undefined;
}

export interface PlayerCareerSummary {
  totalSeasons: number;
  totalClubs: number;
}
