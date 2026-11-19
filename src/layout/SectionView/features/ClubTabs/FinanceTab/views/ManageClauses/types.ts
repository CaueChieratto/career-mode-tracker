import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { Contract } from "../../../../../../../common/interfaces/playersInfo/contract";

export interface TransferItem {
  player: Players;
  contract: Contract;
  contractIndex: number;
  direction: "exit" | "arrivals" | "renewals";
  loanOriginDirection?: "arrivals" | "exit";
  cardKey?: string;
}

export type ClauseEditScope = "club" | "player";

export interface ActiveInlineState {
  cardKey: string;
  mode: "edit" | "manage" | "chooseScope";
  scope?: ClauseEditScope;
  returnToChooseScope?: boolean;
}

export type DrawerSection =
  | "transferDetails"
  | "contract"
  | "installments"
  | "swap"
  | "bonus"
  | "other"
  | "playerBonus"
  | "playerOther"
  | "loanBuyOption"
  | null;
