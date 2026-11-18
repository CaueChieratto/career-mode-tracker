import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { Match } from "../../../../../../../common/interfaces/Match";
import { isPlayerSoldOrDeparted } from "../../../../../../../common/services/ServicePlayers/helpers/transferTimingHelpers";
import {
  POSITION_DATA,
  getGroupForPosition,
} from "../../../../../../../common/types/Positions";
import { sortPlayersByPositionWithinGroup } from "../../../../../../../common/utils/Sorts";

export const groupAndSortPlayersByPosition = (
  players: Players[],
  matches?: Match[],
): Map<string, Players[]> => {
  const activePlayers = (players || []).filter(
    (player) => !isPlayerSoldOrDeparted(player, matches),
  );

  const grouped = new Map<string, Players[]>(
    POSITION_DATA.map((group) => [group.key, []]),
  );

  for (const player of activePlayers) {
    if (player.loan) {
      grouped.get("loaned")?.push(player);
    } else {
      const group = getGroupForPosition(player.position as string);
      if (group) {
        grouped.get(group.key)?.push(player);
      }
    }
  }

  grouped.forEach((playersInGroup, groupKey) => {
    if (playersInGroup.length > 1) {
      const groupConfig = POSITION_DATA.find((g) => g.key === groupKey);
      if (groupConfig?.sortOrder) {
        const sortedPlayers = sortPlayersByPositionWithinGroup(
          playersInGroup,
          groupConfig.sortOrder,
        );
        grouped.set(groupKey, sortedPlayers);
      }
    }
  });

  return grouped;
};
