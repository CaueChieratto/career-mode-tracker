export type FinancialEntrySource = "manual" | "transfer" | "clause" | "salary";

export interface FinancialEntry {
  id: string;
  type: "revenue" | "expense";
  category: string; // Ex: "Ingressos", "Salários de atletas" ou categoria customizada
  amount: number; // Normalizado em número inteiro
  date?: string; // Data no formato DD/MM ou ISO
  description?: string;
  isAutomatic?: boolean; // true se foi gerado por transferência ou folha
  source?: FinancialEntrySource;
  sourceId?: string;
  transferDirection?: "arrivals" | "exit";
  contractIndex?: number;
  clauseType?: "installment" | "bonus" | "sellOn" | "signingBonus" | "agentFee";
  /** Valor base calculado automaticamente pelo motor (ex.: salários acumulados sem o delta manual) */
  calculatedAmount?: number;
  /** Delta de correção manual aplicado pelo usuário sobre o lançamento consolidado (amount - calculatedAmount) */
  manualAdjustment?: number;
  /** Última data de partida processada (formato DD/MM) no lançamento consolidado de salários */
  lastProcessedDate?: string;
}

export interface SeasonFinancialReport {
  seasonId: string;
  seasonNumber: number;
  entries: FinancialEntry[];
  customCategories?: {
    revenues: string[];
    expenses: string[];
  };
}

export interface FinancialTotals {
  totalRevenue: number;
  totalExpense: number;
  netBalance: number;
  totalMovement: number;
  revenuePercentage: number;
  expensePercentage: number;
}

export const DEFAULT_REVENUE_CATEGORIES = [
  "Ingressos",
  "Produtos (Merchandising)",
  "Sócio Torcedor",
  "Bônus de conquista",
  "Transferências (vendas de atletas)",
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Transferências (compras de atletas)",
  "Salários de atletas",
  "Salários Auxiliares Técnicos",
  "Transferências pré-contrato",
  "Salários pré-contrato",
  "Manutenção estádio",
  "Instalações da base",
  "Custos de viagens",
  "Bônus de conquista",
  "Despesas de auxiliares",
  "Rede de observação",
  "Taxa de agência",
] as const;

