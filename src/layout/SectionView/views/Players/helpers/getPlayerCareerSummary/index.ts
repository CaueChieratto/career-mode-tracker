import { calculateTotalStats } from "../../../../../../common/stats/helpers/calculateTotalStats";
import { augmentCareerWithMatchStats } from "../../../../../../common/stats/helpers/mergeMatchStats";
import type {
  GetPlayerCareerSummaryParams,
  PlayerCareerSummary,
} from "../../types";
import { matchesPlayerIdentity } from "../matchesPlayerIdentity";

export const getPlayerCareerSummary = ({
  careers,
  player,
}: GetPlayerCareerSummaryParams): PlayerCareerSummary => {
  if (!player) {
    return {
      totalSeasons: 0,
      totalClubs: 0,
    };
  }

  let totalSeasons = 0;
  let totalClubs = 0;

  for (const career of careers) {
    const augmentedCareer = augmentCareerWithMatchStats(career);
    let playedAtThisClub = false;

    for (const season of augmentedCareer.clubData) {
      const playerInSeason = season.players.find((item) =>
        matchesPlayerIdentity(item, player),
      );

      if (!playerInSeason) {
        continue;
      }

      const totalStats = calculateTotalStats(playerInSeason);

      if (totalStats.games < 1) {
        continue;
      }

      totalSeasons += 1;
      playedAtThisClub = true;
    }

    if (playedAtThisClub) {
      totalClubs += 1;
    }
  }

  return {
    totalSeasons,
    totalClubs,
  };
};

