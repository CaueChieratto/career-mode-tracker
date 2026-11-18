export interface BudgetCategoryCopyItem {
  category: string;
  amount: number;
}

export interface BuildBudgetCopyTextParams {
  totalRevenue: number;
  totalExpense: number;
  revenueCategories: BudgetCategoryCopyItem[];
  expenseCategories: BudgetCategoryCopyItem[];
}

export const formatFinanceCopyValue = (value: number): string => {
  if (!Number.isFinite(value) || value === 0) {
    return "0";
  }

  const abs = Math.abs(value);

  if (abs >= 1_000_000_000) {
    const billions = value / 1_000_000_000;
    const formatted = billions.toFixed(2).replace(".", ",");
    const unit = Math.abs(Number(billions.toFixed(2))) === 1 ? "Bilhão" : "Bilhões";
    return `${formatted} ${unit}`;
  }

  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted = millions.toFixed(2).replace(".", ",");
    const unit = Math.abs(Number(millions.toFixed(2))) === 1 ? "Milhão" : "Milhões";
    return `${formatted} ${unit}`;
  }

  if (abs >= 1_000) {
    const thousands = value / 1_000;
    const formatted = thousands.toFixed(2).replace(".", ",");
    return `${formatted} Mil`;
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(".", ",");
};

export const buildBudgetCopyText = ({
  totalRevenue,
  totalExpense,
  revenueCategories,
  expenseCategories,
}: BuildBudgetCopyTextParams): string => {
  const lines: string[] = [
    "Receitas:",
    `Total - ${formatFinanceCopyValue(totalRevenue)}`,
    ...revenueCategories.map(
      (item) => `${item.category} - ${formatFinanceCopyValue(item.amount)}`,
    ),
    "Despesas:",
    `Total - ${formatFinanceCopyValue(totalExpense)}`,
    ...expenseCategories.map(
      (item) => `${item.category} - ${formatFinanceCopyValue(item.amount)}`,
    ),
  ];

  return lines.join("\n");
};
