import type { CareerPlayer, CreateSpoofedCareerParams } from "../../types";
import { isSamePlayerId } from "../../../../common/utils/playerIdentity";

const isSelectedPlayer = (
  player: CareerPlayer,
  selectedPlayer: CareerPlayer,
  playerId: string | undefined,
): boolean =>
  (playerId ? player.id === playerId || player.playedWithUs === playerId : false) ||
  isSamePlayerId(player, selectedPlayer) ||
  (player.name === selectedPlayer.name &&
    player.nation === selectedPlayer.nation);

export const createSpoofedCareer = ({
  career,
  isFromGroup,
  isNotSeason,
  player,
  playerId,
}: CreateSpoofedCareerParams) => {
  let baseCareer = career;

  if (career && !isFromGroup) {
    baseCareer = {
      ...career,
      groupId: undefined,
    };
  }

  if (!baseCareer || !player || isNotSeason) {
    return baseCareer;
  }

  const newClubData = [...baseCareer.clubData];
  const latestIndex = newClubData.length - 1;
  const latestSeason = newClubData[latestIndex];

  if (!latestSeason) {
    return baseCareer;
  }

  newClubData[latestIndex] = {
    ...latestSeason,
    players: latestSeason.players.map((seasonPlayer) =>
      isSelectedPlayer(seasonPlayer, player, playerId)
        ? {
            ...seasonPlayer,
            shirtNumber: player.shirtNumber,
            overall: player.overall,
            age: player.age,
            position: player.position,
          }
        : seasonPlayer,
    ),
  };

  return {
    ...baseCareer,
    clubData: newClubData,
  };
};
