import { createContext, useContext } from "react";
import { Career } from "../../common/interfaces/Career";
import { Players } from "../../common/interfaces/playersInfo/players";

export type GroupStatsStatus = "idle" | "loading" | "success" | "error";

export interface PlayerGroupStatsContextValue {
  groupPlayers: Players[];
  isLoadingGroup: boolean;
  status: GroupStatsStatus;
  key: string | null;
  error: Error | null;
  ensureGroupPlayers: (
    career: Career,
    isGeralPage: boolean,
  ) => Promise<Players[]>;
  isGeralPage?: boolean;
  isFromGroup?: boolean;
  groupId?: string | null;
}

export const PlayerGroupStatsContext =
  createContext<PlayerGroupStatsContextValue | null>(null);

export const usePlayerGroupStatsContext = () =>
  useContext(PlayerGroupStatsContext);
