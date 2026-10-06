import { Career } from "../Career";
import { OpponentPlayer } from "../OpponentPlayer";

export interface CareerGroup {
  id: string;
  managerName: string;
  careers: Career[];
  careerIds: string[];
  createdAt: Date;
  updatedAt?: number;
  stadiums?: string[];
  opponentPlayers?: OpponentPlayer[];
}

export type BoardItem =
  | { type: "single"; id: string; data: Career }
  | { type: "group"; id: string; data: CareerGroup };
