import type { Career } from "../../../../common/interfaces/Career";
import type { ClubData } from "../../../../common/interfaces/club/clubData";
import type { Players } from "../../../../common/interfaces/playersInfo/players";

import { getAggregatedPlayersForCareer } from "../../../../common/stats/helpers/mergeMatchStats";

interface BuildSectionViewModelParams {
  career: Career;
  season: ClubData;
  player?: Players;
  isPlayer?: boolean;
  notSeason?: boolean;
  tabStorageKey?: string;
}

interface SectionViewModel {
  augmentedSeason: ClubData;
  augmentedPlayer?: Players;
  storageKey: string;
}

const normalizePlayerField = (value: string) => value.trim().toLowerCase();

const findPlayer = (
  career: Career,
  season: ClubData,
  player?: Players,
  notSeason?: boolean,
): Players | undefined => {
  if (!player) return undefined;

  if (!notSeason) {
    return season.players.find((seasonPlayer) => seasonPlayer.id === player.id);
  }

  const normalizedName = normalizePlayerField(player.name);
  const normalizedNation = normalizePlayerField(player.nation);

  return getAggregatedPlayersForCareer(career).find(
    (aggregatedPlayer) =>
      normalizePlayerField(aggregatedPlayer.name) === normalizedName &&
      normalizePlayerField(aggregatedPlayer.nation) === normalizedNation,
  );
};

const getStorageKey = (
  career: Career,
  season: ClubData,
  player?: Players,
  isPlayer?: boolean,
  notSeason?: boolean,
  tabStorageKey?: string,
): string => {
  if (tabStorageKey) {
    return tabStorageKey;
  }
  if (isPlayer) {
    return `player-tab-${career.id}-${player?.id}`;
  }

  if (notSeason) {
    return `geral-tab-${career.id}`;
  }

  return `season-tab-${career.id}-${season.id}`;
};

export function buildSectionViewModel({
  career,
  season,
  player,
  isPlayer,
  notSeason,
  tabStorageKey,
}: BuildSectionViewModelParams): SectionViewModel {
  const augmentedSeason =
    career.clubData.find((careerSeason) => careerSeason.id === season.id) ??
    season;

  const augmentedPlayer = findPlayer(
    career,
    augmentedSeason,
    player,
    notSeason,
  );

  return {
    augmentedSeason,
    augmentedPlayer,
    storageKey:
      tabStorageKey ||
      getStorageKey(
        career,
        augmentedSeason,
        augmentedPlayer,
        isPlayer,
        notSeason,
      ),
  };
}
