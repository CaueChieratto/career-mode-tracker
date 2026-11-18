import { TransferBonus, ClauseStatus } from "./transferTerms";

export type SquadRole =
  | "Promessa"
  | "Esporádico"
  | "Rodízio"
  | "Importante"
  | "Crucial";

export const SQUAD_ROLES: readonly SquadRole[] = [
  "Promessa",
  "Esporádico",
  "Rodízio",
  "Importante",
  "Crucial",
] as const;

export const ALLOWED_WAGE_ADJUSTMENT_PERCENTAGES = [
  5, 10, 15, 20, 25,
] as const;

export interface WageAdjustmentClause {
  enabled?: boolean;
  percentage: number; // 5 a 25 (de 5 em 5)
  competitionBasis?: "league" | "cup";
  targetObjective: string;
  targetLeague?: string;
  autoSettlementDisabled?: boolean;
  direction?: "Aumentar" | "Diminuir";
  status?: ClauseStatus | "Pendente" | "Ativa" | "Liquidada" | "Expirada" | "pending" | "applied";
  applied?: boolean;
  appliedAt?: string;
  preAdjustmentSalary?: number;
  baseSalary?: number;
}

export interface ContractDetails {
  weeklyWage: number;
  durationYears: number; // 1 a 7
  signingBonus?: number; // Luvas
  agentFee?: number; // Taxa de agência (apenas transferências)
  isRenewal?: boolean;
  squadRole?: SquadRole;
  releaseClause?: number;
  wageAdjustment?: WageAdjustmentClause;
  performanceBonuses?: TransferBonus[];
}

export const validateContractDetails = (details: ContractDetails): void => {
  if (details.isRenewal && details.agentFee && details.agentFee > 0) {
    throw new Error(
      "Taxa de agência não é permitida em renovações contratuais.",
    );
  }

  if (
    details.durationYears < 1 ||
    details.durationYears > 7 ||
    !Number.isInteger(details.durationYears)
  ) {
    throw new Error(
      `Duração de contrato inválida: ${details.durationYears} anos. Deve ser entre 1 e 7 anos.`,
    );
  }

  if (details.squadRole && !SQUAD_ROLES.includes(details.squadRole)) {
    throw new Error(
      `Status no elenco inválido: ${details.squadRole}. Valores permitidos: ${SQUAD_ROLES.join(
        ", ",
      )}.`,
    );
  }

  if (details.wageAdjustment?.enabled) {
    if (
      !ALLOWED_WAGE_ADJUSTMENT_PERCENTAGES.includes(
        details.wageAdjustment
          .percentage as typeof ALLOWED_WAGE_ADJUSTMENT_PERCENTAGES[number],
      )
    ) {
      throw new Error(
        `Percentual de ajuste salarial inválido: ${details.wageAdjustment.percentage}%. Permitidos: 5% a 25% (de 5 em 5).`,
      );
    }
  }
};
