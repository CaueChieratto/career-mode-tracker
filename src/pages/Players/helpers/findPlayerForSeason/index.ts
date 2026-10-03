import type { CareerPlayer } from "../../types";
import type { FindPlayerForSeasonParams } from "../../types";
import { matchesPlayerIdentity } from "../matchesPlayerIdentity";
import { isSamePlayerId } from "../../../../common/utils/playerIdentity";

export const findPlayerForSeason = ({
  actualSeason,
  career,
  groupCareers,
  isFromGroup,
  playerId,
  season,
}: FindPlayerForSeasonParams): CareerPlayer | undefined => {
  let player = actualSeason?.players.find(
    (item) => item.id === playerId || isSamePlayerId(item, playerId),
  );

  if (!player && career) {
    const referencePlayer = career.clubData
      .flatMap((item) => item.players)
      .find((item) => item.id === playerId || isSamePlayerId(item, playerId));

    if (referencePlayer && actualSeason) {
      player = actualSeason.players.find((item) =>
        matchesPlayerIdentity(item, referencePlayer),
      );

      if (!player) {
        player = referencePlayer;
      }
    }
  }

  if (!player && season) {
    player = season.players.find(
      (item) => item.id === playerId || isSamePlayerId(item, playerId),
    );
  }

  if (!player && isFromGroup) {
    const allGroupPlayers = groupCareers.flatMap((item) =>
      item.clubData.flatMap((clubSeason) => clubSeason.players),
    );

    player = allGroupPlayers.find(
      (item) => item.id === playerId || isSamePlayerId(item, playerId),
    );

    if (!player && actualSeason) {
      const refInGroup = allGroupPlayers.find(
        (item) =>
          item.id === playerId ||
          isSamePlayerId(item, playerId) ||
          item.name?.trim().toLowerCase() === playerId?.trim().toLowerCase(),
      );
      if (refInGroup) {
        player =
          actualSeason.players.find((item) =>
            matchesPlayerIdentity(item, refInGroup),
          ) || refInGroup;
      }
    }
  }

  return player;
};
