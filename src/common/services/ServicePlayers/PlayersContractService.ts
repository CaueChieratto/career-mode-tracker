import { transferExecutionService } from "./contractServices/transferExecutionService";
import { transferEditRevertService } from "./contractServices/transferEditRevertService";
import { clauseSettlementService } from "./contractServices/clauseSettlementService";
import { objectiveBonusAutoSettlementService } from "./contractServices/objectiveBonusAutoSettlement";
import { playerRenewalService } from "./contractServices/playerRenewalService";
import {
  createTransferInstallments,
  validateLoanTerms,
  validateSellOnPercentage,
} from "../../interfaces/playersInfo/transferTerms";
import { validateContractDetails } from "../../interfaces/playersInfo/contractClauses";

export * from "./contractServices/types";

export const PlayersContractService = {
  createTransferInstallments,
  validateContractDetails,
  validateLoanTerms,
  validateSellOnPercentage,
  ...transferExecutionService,
  ...transferEditRevertService,
  ...clauseSettlementService,
  ...objectiveBonusAutoSettlementService,
  ...playerRenewalService,
};
