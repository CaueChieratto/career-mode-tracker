import type { PlayerMatchStat } from "../../../../../../../common/interfaces/PlayerMatchStat";
import type { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { LineupState } from "../../../types";

export interface BuildBenchRowsParams {
  lineup: LineupState;
  playerStats: PlayerMatchStat[];
  mvpId: string | null;
  allPlayers: Players[];
}

export interface GetPlayerChainInfoParams {
  playerId: string;
  starterIds: string[];
  playerStats: PlayerMatchStat[];
  allPlayers: Players[];
}

export interface PlayerChainInfo {
  subMinute: number;
  subOutName: string | undefined;
}

export type PlayerPosition = Players["position"];

export interface BottomProps {
  lineup: LineupState;
  playerStats?: PlayerMatchStat[];
  mvpId?: string | null;
  allPlayers?: Players[];
  selectingSlotId?: string | null;
  openPlayerPicker?: (slotId: string) => void;
  removePlayer?: (slotId: string) => void;
  onPlayerClick?: (playerId: string) => void;
  onOpenModal?: (playerId: string) => void;
  isFromGeral?: boolean;
}
