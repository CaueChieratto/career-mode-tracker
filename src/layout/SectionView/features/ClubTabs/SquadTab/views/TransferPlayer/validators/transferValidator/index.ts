import { FormValues, BooleanValues } from "../../types";
import { parseValue } from "../../../../../../../../../common/utils/FormatValue";
import {
  TransferTiming,
  TransferInstallments,
  PlayerSwapTerm,
  TransferBonus,
  TransferClauses,
  createTransferInstallments,
  ALLOWED_INSTALLMENT_PERCENTAGES,
  ALLOWED_SELL_ON_PERCENTAGES,
} from "../../../../../../../../../common/interfaces/playersInfo/transferTerms";

export interface ValidatedTransferData {
  sellValue: string;
  toClub: string;
  dateExit: string;
  timing?: TransferTiming;
  installments?: TransferInstallments;
  swapPlayer?: PlayerSwapTerm;
  bonuses?: TransferBonus[];
  transferClauses?: TransferClauses;
}

export interface ValidateTransferResult {
  isValid: boolean;
  error?: string;
  data?: ValidatedTransferData;
}

export const validateTransfer = (
  formValues: FormValues,
  booleanValues: BooleanValues,
  currentSeasonNumber: number = 1,
  draftedBonuses?: TransferBonus[],
): ValidateTransferResult => {
  const dateExit = formValues.dateExit || "";
  let toClub = formValues.toClub || "";
  let sellValue = formValues.sellValue || "";

  if (booleanValues.isRetirement) {
    toClub = "Aposentadoria";
    sellValue = "0";
  } else if (booleanValues.isEndContract) {
    toClub = "Fim de Contrato";
    sellValue = "0";
  }

  if (!dateExit) {
    return { isValid: false, error: "Por favor, preencha a data do acordo." };
  }

  if (!booleanValues.isRetirement && !booleanValues.isEndContract) {
    if (!sellValue || !toClub) {
      return { isValid: false, error: "Por favor, preencha todos os campos." };
    }

    if (sellValue && !/[kmb]$/i.test(sellValue.trim()) && sellValue !== "0") {
      return {
        isValid: false,
        error:
          "A taxa de transferência deve terminar com 'k', 'm' ou 'b'. Ex: 150k, 50M, 1.2B",
      };
    }

    const timing = (formValues.timing as TransferTiming) || "Imediato";

    let installments: TransferInstallments | undefined;
    if (booleanValues.hasInstallments) {
      const pctNum = parseInt(formValues.installmentsPercentage || "20", 10);
      if (
        isNaN(pctNum) ||
        !ALLOWED_INSTALLMENT_PERCENTAGES.includes(
          pctNum as (typeof ALLOWED_INSTALLMENT_PERCENTAGES)[number],
        )
      ) {
        return {
          isValid: false,
          error:
            "Por favor, selecione uma porcentagem válida para o parcelamento.",
        };
      }

      const seasonsNum = parseInt(formValues.installmentsYears || "1", 10);
      if (isNaN(seasonsNum) || seasonsNum < 1 || seasonsNum > 7) {
        return {
          isValid: false,
          error:
            "Por favor, selecione o número de temporadas de parcelamento (1 a 7).",
        };
      }

      const totalFeeNum = parseValue(sellValue);
      installments = createTransferInstallments({
        totalValue: totalFeeNum,
        percentage: pctNum,
        totalInstallments: seasonsNum,
        currentSeasonNumber,
        direction: "receivable",
        partnerClub: toClub,
      });
    }

    let swapPlayer: PlayerSwapTerm | undefined;
    if (booleanValues.hasPlayerSwap) {
      const swapName = (formValues.swapPlayerName || "").trim();
      if (!swapName) {
        return {
          isValid: false,
          error: "Por favor, preencha o nome do atleta para troca.",
        };
      }

      const swapSector = (formValues.swapPlayerSector || "").trim();
      if (!swapSector) {
        return {
          isValid: false,
          error: "Por favor, selecione o setor do atleta para troca.",
        };
      }

      const swapPos = (formValues.swapPlayerPosition || "").trim();
      if (!swapPos) {
        return {
          isValid: false,
          error: "Por favor, selecione a posição do atleta para troca.",
        };
      }

      const swapVal = (formValues.swapPlayerValue || "").trim();
      if (swapVal && !/[kmb]$/i.test(swapVal) && swapVal !== "0") {
        return {
          isValid: false,
          error:
            "O valor de mercado do atleta para troca deve terminar com 'k', 'm' ou 'b'.",
        };
      }

      swapPlayer = {
        playerName: swapName,
        estimatedValue: swapVal ? parseValue(swapVal) : 0,
        incomingSwap: true,
        sector: swapSector,
        position: swapPos,
      };
    }

    let bonuses: TransferBonus[] | undefined;
    if (booleanValues.hasBonus) {
      if (draftedBonuses && draftedBonuses.length > 0) {
        const seenPerf = new Set<string>();
        for (const b of draftedBonuses) {
          const isPerf =
            b.bonusCategory === "Desempenho" ||
            b.category === "performance" ||
            Boolean(b.metric);
          if (isPerf) {
            const bObj = (b.bonusTarget || b.targetObjective || b.name || "")
              .trim()
              .toLowerCase();
            if (bObj) {
              if (seenPerf.has(bObj)) {
                return {
                  isValid: false,
                  error:
                    "O objetivo de desempenho já foi selecionado em outro bônus.",
                };
              }
              seenPerf.add(bObj);
            }
          }
        }
        bonuses = draftedBonuses;
      } else {
        const category = (formValues.bonusCategory || "Objetivo atingido").trim();
        const objective = (formValues.bonusObjective || "").trim();
        if (!objective) {
          return {
            isValid: false,
            error: "Por favor, selecione ou informe o objetivo do bônus.",
          };
        }

      let countNum: number | undefined;
      if (category === "Desempenho") {
        countNum = parseInt(formValues.bonusCount || "", 10);
        if (isNaN(countNum) || countNum < 1 || countNum > 100) {
          return {
            isValid: false,
            error:
              "A contagem de desempenho do bônus deve ser entre 1 e 100.",
          };
        }
      }

      const bonusVal = (formValues.bonusValue || "").trim();
      if (!bonusVal) {
        return {
          isValid: false,
          error: "Por favor, informe o valor do bônus.",
        };
      }
      if (!/[kmb]$/i.test(bonusVal) && bonusVal !== "0") {
        return {
          isValid: false,
          error: "O valor do bônus deve terminar com 'k', 'm' ou 'b'.",
        };
      }

      const bonusCatType: "objective" | "award" | "performance" =
        category === "Prêmio"
          ? "award"
          : category === "Desempenho"
            ? "performance"
            : "objective";

      const targetLeague = (formValues.bonusLeague || "").trim();

      bonuses = [
        {
          id: `bonus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          direction: "receivable",
          category: bonusCatType,
          name: objective,
          targetObjective: objective,
          ...(category === "Objetivo atingido" && targetLeague
            ? { targetLeague }
            : {}),
          value: parseValue(bonusVal),
          partnerClub: toClub,
          status: "pending",
          ...(category === "Desempenho"
            ? {
                metricTarget: countNum,
                metric:
                  objective === "Partidas"
                    ? "matches"
                    : objective === "Gols marcados"
                      ? "goals"
                      : objective === "Assistências"
                        ? "assists"
                        : objective === "Partidas sem sofrer gols"
                          ? "cleanSheets"
                          : undefined,
              }
            : {}),
        },
      ];
      }
    }

    let transferClauses: TransferClauses | undefined;
    if (booleanValues.hasOtherClauses) {
      const buybackVal = (formValues.buybackValue || "").trim();
      if (buybackVal && !/[kmb]$/i.test(buybackVal) && buybackVal !== "0") {
        return {
          isValid: false,
          error:
            "O valor da cláusula de recompra deve terminar com 'k', 'm' ou 'b'.",
        };
      }

      let loanBackDuration: 1 | 2 | undefined;
      if (formValues.loanBackDuration === "1 temporada") loanBackDuration = 1;
      else if (formValues.loanBackDuration === "2 temporadas")
        loanBackDuration = 2;

      let sellOnPercentage: number | undefined;
      if (
        formValues.sellOnPercentage &&
        formValues.sellOnPercentage !== "Nenhum"
      ) {
        const parsedSellOn = parseInt(formValues.sellOnPercentage, 10);
        if (
          ALLOWED_SELL_ON_PERCENTAGES.includes(
            parsedSellOn as (typeof ALLOWED_SELL_ON_PERCENTAGES)[number],
          )
        ) {
          sellOnPercentage = parsedSellOn;
        }
      }

      transferClauses = {
        loanBackDuration,
        buybackValue: buybackVal ? parseValue(buybackVal) : undefined,
        firstRefusal:
          booleanValues.firstRefusal ||
          formValues.firstRefusal === "true" ||
          undefined,
        sellOnPercentage,
        partnerClub: toClub,
        status: "pending",
      };
    }

    return {
      isValid: true,
      data: {
        sellValue,
        toClub,
        dateExit,
        timing,
        installments,
        swapPlayer,
        bonuses,
        transferClauses,
      },
    };
  }

  return { isValid: true, data: { sellValue, toClub, dateExit } };
};
