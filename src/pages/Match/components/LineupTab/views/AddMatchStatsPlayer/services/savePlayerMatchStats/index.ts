import { ServiceMatches } from "../../../../../../../../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import type { Career } from "../../../../../../../../common/interfaces/Career";
import type { ClubData } from "../../../../../../../../common/interfaces/club/clubData";
import type { Match } from "../../../../../../../../common/interfaces/Match";
import type { PlayerMatchStat } from "../../../../../../../../common/interfaces/PlayerMatchStat";
import type { Players } from "../../../../../../../../common/interfaces/playersInfo/players";
import { buildPlayerStats } from "../../helpers/buildPlayerStats";
import {
  calculateSubstitutionChainMinutes,
  getMaximumMatchMinutes,
} from "../../helpers/calculateSubstitutionMinutes";
import { NO_SUBSTITUTE_VALUE } from "../../constants/Substitution";
import type {
  PlayerStatsBooleanValues,
  PlayerStatsFormValues,
} from "../../types";

export interface SavePlayerMatchStatsParams {
  career: Career;
  season: ClubData;
  match: Match;
  player: Players;
  formValues: PlayerStatsFormValues;
  booleanValues: PlayerStatsBooleanValues;
}

const buildCounterpartStats = (
  existingStats: PlayerMatchStat | undefined,
  counterpart: Players,
  playerName: string,
  minutesPlayed: number,
): PlayerMatchStat => ({
  defenses: 0,
  goals: 0,
  ownGoals: 0,
  assists: 0,
  distanceKm: 0,
  rating: 0,
  yellowCard: false,
  redCard: false,
  cleanSheet: false,
  ...(existingStats || {}),
  playerId: counterpart.id,
  minutesPlayed,
  substituteIn: playerName,
});

const upsertPlayerStats = (
  playerStats: PlayerMatchStat[],
  newStats: PlayerMatchStat,
): void => {
  const statIndex = playerStats.findIndex(
    (stat) => stat.playerId === newStats.playerId,
  );

  if (statIndex >= 0) {
    playerStats[statIndex] = newStats;
    return;
  }

  playerStats.push(newStats);
};

export const savePlayerMatchStats = async ({
  career,
  season,
  match,
  player,
  formValues,
  booleanValues,
}: SavePlayerMatchStatsParams): Promise<{
  updatedPlayerStats: PlayerMatchStat[];
}> => {
  const newStats = buildPlayerStats(player.id, formValues, booleanValues);

  const currentPlayerStats = match.playerStats || [];
  let counterpartStats: PlayerMatchStat | undefined;
  const statsToSave: PlayerMatchStat[] = [newStats];

  if (newStats.substituteIn && newStats.substituteIn !== NO_SUBSTITUTE_VALUE) {
    const counterpart = season.players.find(
      (currentPlayer) => currentPlayer.name === newStats.substituteIn,
    );

    if (counterpart) {
      const existingCounterpartStats = currentPlayerStats.find(
        (stat) => stat.playerId === counterpart.id,
      );

      const hasDefinedMinutes =
        existingCounterpartStats &&
        (existingCounterpartStats.minutesPlayed ?? 0) > 0;

      if (!hasDefinedMinutes) {
        const playerStatsForChain = [...currentPlayerStats, newStats];

        const otherMinutes = calculateSubstitutionChainMinutes({
          startPlayerIds: [player.id],
          playerStats: playerStatsForChain,
          players: season.players,
          excludedPlayerIds: new Set([counterpart.id, player.id]),
          getStat: (playerId) =>
            playerId === player.id
              ? newStats
              : currentPlayerStats.find((stat) => stat.playerId === playerId),
        });

        const counterpartMinutes = Math.max(
          0,
          getMaximumMatchMinutes(match) - newStats.minutesPlayed - otherMinutes,
        );

        counterpartStats = buildCounterpartStats(
          existingCounterpartStats,
          counterpart,
          player.name,
          counterpartMinutes,
        );

        statsToSave.push(counterpartStats);
      }
    }
  }

  const updatedPlayerStats = [...currentPlayerStats];

  upsertPlayerStats(updatedPlayerStats, newStats);

  if (counterpartStats) {
    upsertPlayerStats(updatedPlayerStats, counterpartStats);
  }

  await ServiceMatches.savePlayerStatsToSubcollection(
    career.id,
    season.id,
    match.matchesId,
    statsToSave,
    updatedPlayerStats,
  );

  return {
    updatedPlayerStats,
  };
};
