import { useMemo } from "react";
import { Career } from "../../../../../../common/interfaces/Career";
import { augmentCareerWithMatchStats } from "../../../../../../common/stats/helpers/mergeMatchStats";
import { getPlayerIdentityKey } from "../../../../../../common/utils/playerIdentity";

interface PlayerStatSummary {
  name: string;
  games: number;
  goals: number;
  assists: number;
  goalContributions: number;
}

interface TransferSummary {
  name: string;
  value: number;
}

interface StatsSummary {
  mostGames: PlayerStatSummary;
  mostGoals: PlayerStatSummary;
  mostAssists: PlayerStatSummary;
  mostGoalContributions: PlayerStatSummary;
  biggestSigning: TransferSummary;
  biggestSale: TransferSummary;
}

const initialPlayerStats: PlayerStatSummary = {
  name: "",
  games: 0,
  goals: 0,
  assists: 0,
  goalContributions: 0,
};

export const useStatsSummary = (career: Career): StatsSummary => {
  const augmentedCareer = useMemo(
    () => augmentCareerWithMatchStats(career),
    [career],
  );

  return useMemo(() => {
    const playerStats: Record<string, PlayerStatSummary> = {};

    let biggestSigning: TransferSummary = {
      name: "",
      value: 0,
    };

    let biggestSale: TransferSummary = {
      name: "",
      value: 0,
    };

    (augmentedCareer.clubData || []).forEach((season) => {
      (season.players || []).forEach((player) => {
        const playerKey = getPlayerIdentityKey(player, augmentedCareer.id);
        if (!playerStats[playerKey]) {
          playerStats[playerKey] = {
            name: player.name,
            games: 0,
            goals: 0,
            assists: 0,
            goalContributions: 0,
          };
        }

        (player.statsLeagues || []).forEach((league) => {
          const goals = league.stats.goals || 0;
          const assists = league.stats.assists || 0;
          const games = league.stats.games || 0;

          playerStats[playerKey].games += games;
          playerStats[playerKey].goals += goals;
          playerStats[playerKey].assists += assists;
          playerStats[playerKey].goalContributions += goals + assists;
        });

        (player.contract || []).forEach((contract) => {
          if (
            contract.buyValue &&
            Number(contract.buyValue) > biggestSigning.value
          ) {
            biggestSigning = {
              name: player.name,
              value: Number(contract.buyValue),
            };
          }

          if (
            contract.sellValue &&
            Number(contract.sellValue) > biggestSale.value
          ) {
            biggestSale = {
              name: player.name,
              value: Number(contract.sellValue),
            };
          }
        });
      });
    });

    const allPlayersWithStats = Object.values(playerStats);

    const mostGames = allPlayersWithStats.reduce(
      (max, player) => (player.games > max.games ? player : max),
      initialPlayerStats,
    );

    const mostGoals = allPlayersWithStats.reduce(
      (max, player) => (player.goals > max.goals ? player : max),
      initialPlayerStats,
    );

    const mostAssists = allPlayersWithStats.reduce(
      (max, player) => (player.assists > max.assists ? player : max),
      initialPlayerStats,
    );

    const mostGoalContributions = allPlayersWithStats.reduce(
      (max, player) =>
        player.goalContributions > max.goalContributions ? player : max,
      initialPlayerStats,
    );

    return {
      mostGames,
      mostGoals,
      mostAssists,
      mostGoalContributions,
      biggestSigning,
      biggestSale,
    };
  }, [augmentedCareer]);
};
