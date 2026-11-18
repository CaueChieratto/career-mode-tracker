import { createContext, useContext } from "react";
import { PlayerMatchStat } from "../../../../../common/interfaces/PlayerMatchStat";
import { Players } from "../../../../../common/interfaces/playersInfo/players";

export interface LineupTabContextValue {
  isFromGeral?: boolean;
  selectingSlotId: string | null;
  mvpId?: string | null;
  playerStatsById: Map<string, PlayerMatchStat>;
  allPlayers: Players[];
  allStats: PlayerMatchStat[];
  openPlayerPicker: (slotId: string) => void;
  removePlayer: (slotId: string) => void;
  swapPlayers: (sourceSlotId: string, targetSlotId: string) => void;
  onPlayerClick: (playerId: string) => void;
  onOpenModal?: (playerId: string) => void;
}

export const LineupTabContext = createContext<LineupTabContextValue | null>(null);

export const useLineupTabContext = (): LineupTabContextValue => {
  const ctx = useContext(LineupTabContext);
  if (!ctx) {
    return {
      isFromGeral: false,
      selectingSlotId: null,
      mvpId: null,
      playerStatsById: new Map(),
      allPlayers: [],
      allStats: [],
      openPlayerPicker: () => {},
      removePlayer: () => {},
      swapPlayers: () => {},
      onPlayerClick: () => {},
      onOpenModal: () => {},
    };
  }
  return ctx;
};

