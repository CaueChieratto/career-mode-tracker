import React, { useMemo } from "react";
import { PlayerMatchStat } from "../../../../../common/interfaces/PlayerMatchStat";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { LineupTabContext, LineupTabContextValue } from "./context";

export interface LineupTabProviderProps {
  children: React.ReactNode;
  isFromGeral?: boolean;
  selectingSlotId: string | null;
  mvpId?: string | null;
  playerStats: PlayerMatchStat[];
  allPlayers?: Players[];
  openPlayerPicker: (slotId: string) => void;
  removePlayer: (slotId: string) => void;
  swapPlayers: (sourceSlotId: string, targetSlotId: string) => void;
  onPlayerClick: (playerId: string) => void;
  onOpenModal?: (playerId: string) => void;
}

export const LineupTabProvider: React.FC<LineupTabProviderProps> = ({
  children,
  isFromGeral,
  selectingSlotId,
  mvpId,
  playerStats,
  allPlayers = [],
  openPlayerPicker,
  removePlayer,
  swapPlayers,
  onPlayerClick,
  onOpenModal,
}) => {
  const playerStatsById = useMemo(() => {
    const map = new Map<string, PlayerMatchStat>();
    (playerStats || []).forEach((stat) => {
      if (stat.playerId) {
        map.set(stat.playerId, stat);
      }
    });
    return map;
  }, [playerStats]);

  const value = useMemo<LineupTabContextValue>(
    () => ({
      isFromGeral,
      selectingSlotId,
      mvpId,
      playerStatsById,
      allPlayers,
      allStats: playerStats,
      openPlayerPicker,
      removePlayer,
      swapPlayers,
      onPlayerClick,
      onOpenModal,
    }),
    [
      isFromGeral,
      selectingSlotId,
      mvpId,
      playerStatsById,
      allPlayers,
      playerStats,
      openPlayerPicker,
      removePlayer,
      swapPlayers,
      onPlayerClick,
      onOpenModal,
    ],
  );

  return (
    <LineupTabContext.Provider value={value}>
      {children}
    </LineupTabContext.Provider>
  );
};

