import {
  TransferTiming,
  TransferInstallments,
  PlayerSwapTerm,
  TransferBonus,
  TransferClauses,
  LoanTerms,
} from "./transferTerms";
import { ContractDetails } from "./contractClauses";

export interface Contract {
  buyValue: number | string;
  sellValue: number;
  fromClub: string;
  leftClub: string;
  dataArrival: Date | null;
  dataExit?: Date | null;
  isLoan?: boolean;
  loanDuration?: number;
  wagePercentage?: number;
  buyOptionValue?: number;
  fullSalary?: number;
  timing?: TransferTiming;
  installments?: TransferInstallments;
  swapPlayer?: PlayerSwapTerm;
  bonuses?: TransferBonus[];
  transferClauses?: TransferClauses;
  loanTerms?: LoanTerms;
  contractDetails?: ContractDetails;
  contractClauses?: {
    releaseClause?: number;
    wageAdjustment?: import("./contractClauses").WageAdjustmentClause;
  };
  fromScheduledAgreement?: boolean;
  isLoanBackReturn?: boolean;
  fromLoanBuyOption?: boolean;
  buyOptionFinalized?: boolean;
  sourceLoanContractIndex?: number;
  isRenewal?: boolean;
  seasonId?: string;
  contractUntil?: string;
  signingBonus?: string;
  releaseClause?: string;
  salary?: number | string;
  contractTime?: number;
  previousSalary?: number | string;
  previousContractTime?: number;
  previousContractUntil?: string;
}
