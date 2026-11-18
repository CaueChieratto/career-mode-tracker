export type BooleanValues = {
  isRetirement: boolean;
  isEndContract: boolean;
  isReturnLoan: boolean;
  hasInstallments: boolean;
  hasPlayerSwap: boolean;
  hasBonus: boolean;
  hasOtherClauses: boolean;
  firstRefusal?: boolean;
  hasBuyOption?: boolean;
};

export type FormValues = Record<string, string>;
