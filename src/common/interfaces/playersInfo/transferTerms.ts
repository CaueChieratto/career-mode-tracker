export type TransferTiming =
  | "Imediato"
  | "Imediata"
  | "Proxima janela"
  | "Proxima Janela"
  | "Próxima Janela"
  | "Proxima temporada"
  | "Proxima Temporada"
  | "Próxima Temporada";

export type ClauseStatus = "pending" | "paid" | "expired";
export type FinancialFlowDirection = "payable" | "receivable"; // a serem pagas vs a serem recebidas

export interface TransferInstallmentItem {
  number: number;
  value: number;
  paid: boolean;
  paidSeasonNumber?: number;
  paidSeasonId?: string;
}

export interface TransferInstallments {
  id: string;
  direction: FinancialFlowDirection; // "payable" (compras) ou "receivable" (vendas)
  status: ClauseStatus;
  percentage: number; // 20, 40, 60, 80, 100
  totalInstallments: number; // 1 a 7
  remainingInstallments: number;
  annualInstallmentValue: number;
  upfrontValue: number;
  firstPaymentSeasonNumber: number;
  partnerClub: string; // Clube credor ou devedor
  paidSeasonId?: string;
  paidSeasonNumber?: number;
  installmentsList?: TransferInstallmentItem[];
}

export interface PlayerSwapTerm {
  playerId?: string;
  playerName: string;
  estimatedValue?: number;
  playerValue?: number;
  incomingSwap?: boolean;
  sector?: string;
  position?: string;
  isCounterpart?: boolean;
  overall?: number;
  age?: number;
}

export const DEFAULT_OBJECTIVE_BONUSES = [
  "Ser campeão",
  "Chegar à final",
  "Lutar pelo acesso",
  "Evitar o rebaixamento",
  "Terminar no meio da tabela",
  "Chegar às semifinais",
  "Classificar para a Europa",
  "Chegar aos 16 avos de final",
  "Chegar às oitavas de final",
  "Chegar às quartas de final",
] as const;

export const DEFAULT_AWARD_BONUSES = [
  "Bola de Ouro",
  "Artilheiro da liga",
  "Líder em assistências",
  "Atleta da temporada",
] as const;

export const DEFAULT_PERFORMANCE_BONUSES = [
  "Partidas",
  "Assistências",
  "Partidas sem sofrer gols",
  "Gols marcados",
] as const;

export interface TransferBonus {
  id: string;
  direction: FinancialFlowDirection; // "receivable" (vendas) ou "payable" (compras)
  category: "objective" | "award" | "performance";
  bonusCategory?: "Objetivo atingido" | "Prêmio" | "Desempenho";
  name: string;
  description?: string;
  competitionType?: "playoffs" | "league" | "cup";
  targetObjective?: string;
  bonusTarget?: string;
  targetLeague?: string;
  metric?: "matches" | "goals" | "assists" | "cleanSheets";
  metricTarget?: number; // 1 a 100
  targetCount?: number;
  currentMetricProgress?: number;
  value: number;
  partnerClub?: string;
  status: ClauseStatus;
  paid?: boolean;
  paidSeasonId?: string;
  paidSeasonNumber?: number;
  bonusOrigin?: "club" | "player";
  autoEvaluated?: boolean; // Se monitorado/alimentado pelo motor de matches
  autoSettlementDisabled?: boolean; // Se o usuário alterou manualmente para pendente
  achievedInMatchId?: string; // Opcional: ID da partida onde o objetivo foi batido
}

export interface TransferClauses {
  loanBackDuration?: 1 | 2;
  loanEndSeasonNumber?: number;
  buybackValue?: number;
  buybackExercised?: boolean;
  buybackExpired?: boolean;
  firstRefusal?: boolean;
  sellOnPercentage?: number; // 5 a 30 (de 5 em 5)
  sellOnReceived?: boolean;
  sellOnExercised?: boolean;
  partnerClub?: string;
  status?: ClauseStatus;
}

export interface LoanTerms {
  durationYears: number;
  ourWagePercentage?: number;
  theirWagePercentage?: number;
  hasBuyOption: boolean;
  buyOptionFee?: number;
  sellOnPercentage?: number;
  sellOnReceived?: boolean;
  sellOnExercised?: boolean;
  partnerClub?: string;
  buyOptionExercised?: boolean;
  buyOptionExpired?: boolean;
  buyOptionFinalized?: boolean;
  exercisedDate?: string;
}

export const ALLOWED_INSTALLMENT_PERCENTAGES = [20, 40, 60, 80, 100] as const;
export const ALLOWED_SELL_ON_PERCENTAGES = [5, 10, 15, 20, 25, 30] as const;

export interface CalculateInstallmentsParams {
  totalValue: number;
  percentage: number;
  totalInstallments: number;
  currentSeasonNumber: number;
  direction: FinancialFlowDirection;
  partnerClub: string;
  id?: string;
  paidInstallments?: number;
  remainingInstallments?: number;
  status?: ClauseStatus;
}

export const createTransferInstallments = ({
  totalValue,
  percentage,
  totalInstallments,
  currentSeasonNumber,
  direction,
  partnerClub,
  id,
  paidInstallments,
  remainingInstallments: explicitRemaining,
  status,
}: CalculateInstallmentsParams): TransferInstallments => {
  if (
    !ALLOWED_INSTALLMENT_PERCENTAGES.includes(
      percentage as (typeof ALLOWED_INSTALLMENT_PERCENTAGES)[number],
    )
  ) {
    throw new Error(
      `Percentual de parcelamento inválido: ${percentage}%. Valores permitidos: 20%, 40%, 60%, 80%, 100%.`,
    );
  }

  if (
    totalInstallments < 1 ||
    totalInstallments > 7 ||
    !Number.isInteger(totalInstallments)
  ) {
    throw new Error(
      `Número de parcelas inválido: ${totalInstallments}. Deve ser um número inteiro de 1 a 7.`,
    );
  }

  const installmentTotal = Math.round(totalValue * (percentage / 100));
  const upfrontValue = percentage === 100 ? 0 : totalValue - installmentTotal;
  const annualInstallmentValue = Math.round(
    installmentTotal / totalInstallments,
  );

  let finalRemaining = totalInstallments;
  if (explicitRemaining !== undefined) {
    finalRemaining = Math.max(
      0,
      Math.min(totalInstallments, explicitRemaining),
    );
  } else if (paidInstallments !== undefined) {
    finalRemaining = Math.max(0, totalInstallments - paidInstallments);
  }

  const finalStatus: ClauseStatus =
    status || (finalRemaining === 0 ? "paid" : "pending");

  return {
    id:
      id || `inst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    direction,
    status: finalStatus,
    percentage,
    totalInstallments,
    remainingInstallments: finalRemaining,
    annualInstallmentValue,
    upfrontValue,
    firstPaymentSeasonNumber: currentSeasonNumber + 1,
    partnerClub,
  };
};

/**
 * Normaliza a lista itemizada de parcelas a partir do resumo de parcelamento.
 */
export const normalizeInstallmentsList = (
  inst: TransferInstallments,
): TransferInstallmentItem[] => {
  const total = Math.max(1, inst.totalInstallments || 1);
  const remaining = Math.max(
    0,
    Math.min(total, inst.remainingInstallments ?? total),
  );
  const paidCount = Math.max(0, total - remaining);

  if (
    Array.isArray(inst.installmentsList) &&
    inst.installmentsList.length === total
  ) {
    return inst.installmentsList.map((item, idx) => ({
      ...item,
      number: item.number || idx + 1,
      value: item.value || inst.annualInstallmentValue || 0,
    }));
  }

  return Array.from({ length: total }, (_, idx) => {
    const isPaid = idx < paidCount;
    return {
      number: idx + 1,
      value: inst.annualInstallmentValue || 0,
      paid: isPaid,
      ...(isPaid && inst.paidSeasonId
        ? { paidSeasonId: inst.paidSeasonId }
        : {}),
      ...(isPaid && inst.paidSeasonNumber !== undefined
        ? { paidSeasonNumber: inst.paidSeasonNumber }
        : {}),
    };
  });
};

/**
 * Liquida a próxima parcela pendente, decrementando remainingInstallments e
 * registrando o vínculo com a temporada do pagamento.
 */
export const applyInstallmentSettlement = (
  inst: TransferInstallments,
  seasonId: string,
  seasonNumber?: number,
): {
  updated: TransferInstallments;
  settledItem?: TransferInstallmentItem;
  paidInSeasonCount: number;
} => {
  const total = Math.max(1, inst.totalInstallments || 1);
  const currentRemaining = Math.max(
    0,
    Math.min(total, inst.remainingInstallments ?? total),
  );
  const list = normalizeInstallmentsList(inst);

  if (currentRemaining <= 0) {
    return {
      updated: {
        ...inst,
        remainingInstallments: 0,
        status: "paid",
        installmentsList: list,
      },
      settledItem: undefined,
      paidInSeasonCount: list.filter(
        (i) => i.paid && i.paidSeasonId === seasonId,
      ).length,
    };
  }

  const firstUnpaidIdx = list.findIndex((i) => !i.paid);
  const targetIdx =
    firstUnpaidIdx >= 0
      ? firstUnpaidIdx
      : Math.min(total - 1, Math.max(0, total - currentRemaining));

  const settledItem: TransferInstallmentItem = {
    ...list[targetIdx],
    paid: true,
    paidSeasonId: seasonId,
    ...(seasonNumber !== undefined ? { paidSeasonNumber: seasonNumber } : {}),
  };
  list[targetIdx] = settledItem;

  const newRemaining = Math.max(0, currentRemaining - 1);
  const paidInSeasonCount = list.filter(
    (i) => i.paid && i.paidSeasonId === seasonId,
  ).length;

  return {
    updated: {
      ...inst,
      remainingInstallments: newRemaining,
      status: newRemaining === 0 ? "paid" : "pending",
      paidSeasonId: seasonId,
      ...(seasonNumber !== undefined ? { paidSeasonNumber: seasonNumber } : {}),
      installmentsList: list,
    },
    settledItem,
    paidInSeasonCount,
  };
};

/**
 * Estorna a última parcela paga, incrementando remainingInstallments e
 * mantendo o status pendente.
 */
export const revertInstallmentSettlement = (
  inst: TransferInstallments,
): {
  updated: TransferInstallments;
  undoneItem?: TransferInstallmentItem;
} => {
  const total = Math.max(1, inst.totalInstallments || 1);
  const currentRemaining = Math.max(
    0,
    Math.min(total, inst.remainingInstallments ?? total),
  );
  const list = normalizeInstallmentsList(inst);

  let lastPaidIdx = -1;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].paid) {
      lastPaidIdx = i;
      break;
    }
  }

  const undoneItem = lastPaidIdx >= 0 ? { ...list[lastPaidIdx] } : undefined;
  if (lastPaidIdx >= 0) {
    list[lastPaidIdx] = {
      number: list[lastPaidIdx].number,
      value: list[lastPaidIdx].value,
      paid: false,
    };
  }

  const newRemaining = Math.min(total, currentRemaining + 1);
  let lastRemainingPaid: TransferInstallmentItem | undefined;
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].paid) {
      lastRemainingPaid = list[i];
      break;
    }
  }

  const nextInst: TransferInstallments = {
    ...inst,
    remainingInstallments: newRemaining,
    status: "pending",
    installmentsList: list,
  };

  if (lastRemainingPaid?.paidSeasonId) {
    nextInst.paidSeasonId = lastRemainingPaid.paidSeasonId;
  } else {
    delete nextInst.paidSeasonId;
  }

  if (lastRemainingPaid?.paidSeasonNumber !== undefined) {
    nextInst.paidSeasonNumber = lastRemainingPaid.paidSeasonNumber;
  } else {
    delete nextInst.paidSeasonNumber;
  }

  return {
    updated: nextInst,
    undoneItem,
  };
};

export const validateSellOnPercentage = (percentage?: number): void => {
  if (percentage === undefined || percentage === null) return;
  if (
    !ALLOWED_SELL_ON_PERCENTAGES.includes(
      percentage as (typeof ALLOWED_SELL_ON_PERCENTAGES)[number],
    )
  ) {
    throw new Error(
      `Taxa de futura venda inválida: ${percentage}%. Valores permitidos: 5% a 30% (de 5 em 5).`,
    );
  }
};

export const validateLoanTerms = (terms: LoanTerms): void => {
  if (terms.durationYears !== 1 && terms.durationYears !== 2) {
    throw new Error("Duração de empréstimo deve ser de 1 ou 2 anos.");
  }

  if (
    terms.ourWagePercentage !== undefined &&
    (terms.ourWagePercentage < 0 || terms.ourWagePercentage > 100)
  ) {
    throw new Error(
      "Porcentagem de salário do nosso clube deve estar entre 0 e 100.",
    );
  }

  if (
    terms.theirWagePercentage !== undefined &&
    (terms.theirWagePercentage < 0 || terms.theirWagePercentage > 100)
  ) {
    throw new Error(
      "Porcentagem de salário do clube parceiro deve estar entre 0 e 100.",
    );
  }

  if (
    terms.sellOnPercentage !== undefined &&
    terms.sellOnPercentage !== null &&
    (isNaN(terms.sellOnPercentage) ||
      terms.sellOnPercentage <= 0 ||
      terms.sellOnPercentage > 100)
  ) {
    throw new Error("A cláusula de futura venda deve estar entre 1% e 100%.");
  }
};
