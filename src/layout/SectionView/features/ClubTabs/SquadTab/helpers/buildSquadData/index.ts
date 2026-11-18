import { POSITION_DATA } from "../../../../../../../common/types/Positions";
import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { Match } from "../../../../../../../common/interfaces/Match";
import { sortPlayers } from "../sortPlayers";
import { groupAndSortPlayersByPosition } from "../groupAndSortPlayersByPosition";

export const buildSquadData = (
  players: Players[],
  criteria: string,
  isAsc: boolean,
  matches?: Match[],
) => {
  const baseGrouped = groupAndSortPlayersByPosition(players, matches);

  const groupedData = new Map<string, Players[]>();

  POSITION_DATA.forEach((group) => {
    const groupPlayers = baseGrouped.get(group.key) || [];
    groupedData.set(group.key, sortPlayers(groupPlayers, criteria, isAsc));
  });

  const flatBase: Players[] = [];

  POSITION_DATA.forEach((group) => {
    flatBase.push(...(baseGrouped.get(group.key) || []));
  });

  const flatData = sortPlayers(flatBase, criteria, isAsc);

  return {
    groupedData,
    flatData,
  };
};
