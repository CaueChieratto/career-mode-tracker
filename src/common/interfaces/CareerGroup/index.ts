import { Career } from "../Career";

export interface CareerGroup {
  id: string;
  managerName: string;
  careers: Career[];
  careerIds: string[];
  createdAt: Date;
  updatedAt?: number;
  stadiums?: string[];
}

export type BoardItem =
  | { type: "single"; id: string; data: Career }
  | { type: "group"; id: string; data: CareerGroup };
