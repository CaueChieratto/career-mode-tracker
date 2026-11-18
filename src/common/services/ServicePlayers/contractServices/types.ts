import { Players } from "../../../interfaces/playersInfo/players";
import { Contract } from "../../../interfaces/playersInfo/contract";
import {
  TransferTiming,
  TransferInstallments,
  PlayerSwapTerm,
  TransferClauses,
  TransferBonus,
  LoanTerms,
} from "../../../interfaces/playersInfo/transferTerms";
import {
  ContractDetails,
  WageAdjustmentClause,
} from "../../../interfaces/playersInfo/contractClauses";
import { PlayerNegotiationStage } from "../../../interfaces/proposals/transferProposal";

export interface CreatePlayerRenewalParams {
  careerId: string;
  seasonId: string;
  playerId: string;
  salary?: string;
  contractUntil?: string;
  contractTime?: number;
  signingBonus?: string;
  releaseClause?: string;
  wageAdjustment?: WageAdjustmentClause;
  bonuses?: TransferBonus[];
  newCustomObjectives?: string[];
}

export interface DeletePlayerRenewalParams {
  careerId: string;
  seasonId: string;
  playerId: string;
  contractIndex: number;
}

export interface UpdateRenewalClausesParams {
  careerId: string;
  seasonId: string;
  playerId: string;
  contractIndex: number;
  salary?: string;
  contractUntil?: string;
  contractTime?: number;
  signingBonus?: string;
  releaseClause?: string;
  wageAdjustment?: WageAdjustmentClause;
  bonuses?: TransferBonus[];
  newCustomObjectives?: string[];
}

export type EditTransferParams = {
  careerId: string;
  seasonId: string;
  playerId: string;
  contractIndex: number;
  direction: "exit" | "arrivals";
  transferType?: string;
  clubName?: string;
  transferValue?: string;
  date: string;
  loanDuration?: string;
  wagePercentage?: string;
  buyOptionValue?: string;
  buyOption?: string;
  timing?: string;
  salary?: string | number;
  contractTime?: string | number;
  contractUntil?: string;
  signingBonus?: string;
  agentFee?: string;
  installments?: TransferInstallments;
  swapPlayer?: PlayerSwapTerm;
  bonuses?: TransferBonus[];
  transferClauses?: TransferClauses;
  loanTerms?: LoanTerms;
  contractDetails?: ContractDetails;
  releaseClause?: string;
  wageAdjustment?: WageAdjustmentClause;
  squadRole?: string;
};

export type RevertTransferParams = {
  careerId: string;
  seasonId: string;
  playerId: string;
  contractIndex: number;
  direction: "exit" | "arrivals";
};

export interface SellPlayerOptions {
  timing?: TransferTiming;
  installments?: TransferInstallments;
  swapPlayer?: PlayerSwapTerm;
  transferClauses?: TransferClauses;
  bonuses?: TransferBonus[];
  settledBuybackContractIndex?: number;
  swapPlayerNegotiation?: PlayerNegotiationStage;
}

export interface SignPlayerWithTermsParams {
  careerId: string;
  seasonId: string;
  player: Partial<Players>;
  contract: Partial<Contract>;
  swapPlayer?: PlayerSwapTerm;
}

export const READ_ONLY_GERAL_ERROR =
  "Mutações de contratos e transferências não são permitidas no modo somente leitura (Geral).";

