import React from "react";
import { formatDisplayValue } from "../../../../../../../common/utils/FormatValue";
import Styles from "./BudgetDonutChart.module.css";

interface BudgetDonutChartProps {
  totalRevenue: number;
  totalExpense: number;
  netBalance: number;
  currency?: string;
  subtext?: string;
}

export const BudgetDonutChart: React.FC<BudgetDonutChartProps> = ({
  totalRevenue,
  totalExpense,
  netBalance,
  currency = "EUR",
  subtext,
}) => {
  const radius = 68;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const totalMovement = totalRevenue + totalExpense;

  let revenueArc = 0;
  let expenseArc = 0;

  if (totalMovement > 0) {
    revenueArc = (totalRevenue / totalMovement) * circumference;
    expenseArc = (totalExpense / totalMovement) * circumference;
  }

  const formatBalance = (val: number): string => {
    if (val === 0) return `${formatDisplayValue(0, currency)}`;
    if (val < 0) {
      return `-${formatDisplayValue(Math.abs(val), currency)}`;
    }
    return formatDisplayValue(val, currency);
  };

  const balanceColor =
    netBalance > 0 ? "#0bb32a" : netBalance < 0 ? "#c81419" : "#ffffff";

  return (
    <div className={Styles.chartContainer} data-testid="budget-donut-chart">
      <svg
        className={Styles.donutSvg}
        viewBox="0 0 180 180"
        aria-label="Gráfico de Visão Geral Financeira"
      >
        {/* Anel base / trilha neutra */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          className={Styles.track}
          strokeWidth={strokeWidth}
        />

        {/* Arco Verde: Receitas */}
        {revenueArc > 0 && (
          <circle
            data-testid="donut-revenue-arc"
            cx="90"
            cy="90"
            r={radius}
            stroke="#0bb32a"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${revenueArc} ${circumference}`}
            strokeDashoffset={0}
            transform="rotate(-90 90 90)"
          />
        )}

        {/* Arco Vermelho: Despesas */}
        {expenseArc > 0 && (
          <circle
            data-testid="donut-expense-arc"
            cx="90"
            cy="90"
            r={radius}
            stroke="#c81419"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${expenseArc} ${circumference}`}
            strokeDashoffset={-revenueArc}
            transform="rotate(-90 90 90)"
          />
        )}
      </svg>

      {/* Conteúdo Central */}
      <div className={Styles.centerContent}>
        <span className={Styles.centerLabel}>SALDO LÍQUIDO</span>
        <span
          className={Styles.centerValue}
          data-testid="donut-net-balance"
          style={{ color: balanceColor }}
        >
          {formatBalance(netBalance)}
        </span>
        <span className={Styles.centerSubtext}>
          {subtext || "Saldo Atual"}
        </span>
      </div>
    </div>
  );
};

export default BudgetDonutChart;

