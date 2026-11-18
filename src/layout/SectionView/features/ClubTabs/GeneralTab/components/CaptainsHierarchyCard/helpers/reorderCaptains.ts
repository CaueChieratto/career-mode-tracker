import { arrayMove } from "@dnd-kit/sortable";
import { Players } from "../../../../../../../../common/interfaces/playersInfo/players";

export const reorderCaptains = (
  captains: Players[],
  activeId: string,
  overId: string,
): Players[] => {
  const oldIndex = captains.findIndex((c) => c.id === activeId);
  const newIndex = captains.findIndex((c) => c.id === overId);

  if (oldIndex === -1 || newIndex === -1) {
    return captains;
  }

  return arrayMove(captains, oldIndex, newIndex).map((item, index) => ({
    ...item,
    captainRank: index + 1,
  }));
};

