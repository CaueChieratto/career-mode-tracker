import { FormValues, BooleanValues } from "../../types";
import { parseValue } from "../../../../../../../../../common/utils/FormatValue";
import { LoanTerms } from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";
import { parseLoanDuration } from "../../../../../../../../../common/utils/parseLoanDuration";

export const validateLoan = (
  formValues: FormValues,
  booleanValues: Partial<BooleanValues> = {},
) => {
  const dateLoan = formValues.dateExit || "";

  if (booleanValues.isReturnLoan) {
    if (!dateLoan) {
      return {
        isValid: false,
        error: "Por favor, preencha a data de retorno.",
      };
    }
    return { isValid: true, data: { isReturning: true, dateLoan } };
  }

  const toClub = (formValues.toClub || "").trim();
  const loanDuration = (formValues.loanDuration || "").trim();
  const wagePercentage = (formValues.wagePercentage || "").trim();
  const hasBuyOption = Boolean(booleanValues.hasBuyOption);
  const buyOption = hasBuyOption ? (formValues.buyOption || "").trim() : "";
  const sellOnRaw = hasBuyOption
    ? (formValues.sellOnPercentage || "").trim()
    : "";

  if (!toClub || !loanDuration || !wagePercentage) {
    return {
      isValid: false,
      error: "Por favor, preencha os campos obrigatórios de empréstimo.",
    };
  }

  let loanTerms: LoanTerms | undefined;

  if (hasBuyOption) {
    if (!buyOption) {
      return {
        isValid: false,
        error:
          "Por favor, preencha a taxa de transferência da opção de compra.",
      };
    }

    if (!/[kmb]$/i.test(buyOption) || parseValue(buyOption) <= 0) {
      return {
        isValid: false,
        error:
          "A taxa de transferência deve terminar com 'k', 'm' ou 'b'. Ex: 150k, 50M, 1.2B",
      };
    }

    let parsedSellOn: number | undefined;
    if (sellOnRaw !== "") {
      parsedSellOn = Number(sellOnRaw.replace("%", "").trim());
      if (isNaN(parsedSellOn) || parsedSellOn <= 0 || parsedSellOn > 100) {
        return {
          isValid: false,
          error:
            "A cláusula de futura venda deve ser uma porcentagem válida entre 1 e 100.",
        };
      }
    }

    const wageNum = Number(wagePercentage) || 0;
    const durationNum =
      parseLoanDuration(loanDuration) ?? (Number(loanDuration) || 1);

    loanTerms = {
      durationYears: durationNum,
      ourWagePercentage: Math.max(0, 100 - wageNum),
      theirWagePercentage: Math.min(100, Math.max(0, wageNum)),
      hasBuyOption: true,
      buyOptionFee: parseValue(buyOption),
      ...(parsedSellOn !== undefined ? { sellOnPercentage: parsedSellOn } : {}),
      partnerClub: toClub,
    };
  }

  return {
    isValid: true,
    data: {
      isReturning: false,
      dateLoan,
      toClub,
      loanDuration,
      wagePercentage,
      buyOption,
      loanTerms,
    },
  };
};
