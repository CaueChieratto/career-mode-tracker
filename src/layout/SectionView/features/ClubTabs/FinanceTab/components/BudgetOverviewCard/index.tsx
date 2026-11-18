import React, { useEffect, useMemo, useState } from "react";
import Card from "../../../../../../../ui/Card";
import Load from "../../../../../../../components/Load";
import { Career } from "../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../common/interfaces/club/clubData";
import { FinancialEntry } from "../../../../../../../common/interfaces/finance";
import { ServiceFinance } from "../../../../../../../common/services/ServiceFinance";
import { formatDisplayValue } from "../../../../../../../common/utils/FormatValue";
import { Copy } from "../../../../../../../common/utils/Copy";
import { SectionScreen } from "../../../../../config/screens";
import BudgetDonutChart from "../BudgetDonutChart";
import { buildBudgetCopyText } from "./helpers/buildBudgetCopyText";
import Styles from "./BudgetOverviewCard.module.css";
import { AiOutlineCopy } from "react-icons/ai";

interface BudgetOverviewCardProps {
  season: ClubData;
  career: Career;
  notSeason?: boolean;
  onOpenScreen?: (screen: SectionScreen) => void;
  initialEntries?: FinancialEntry[];
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({
  season,
  career,
  notSeason,
  onOpenScreen,
  initialEntries,
}) => {
  const [entries, setEntries] = useState<FinancialEntry[]>(
    initialEntries || season?.financialReport?.entries || [],
  );
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(
    !initialEntries && !season?.financialReport?.entries,
  );

  useEffect(() => {
    if (initialEntries) {
      setEntries(initialEntries);
      setIsLoadingReport(false);
      return;
    }

    let isMounted = true;
    setIsLoadingReport(true);

    const fetchReport = async () => {
      try {
        if (notSeason) {
          const consolidated =
            await ServiceFinance.getConsolidatedReport(career);
          if (isMounted) setEntries(consolidated.entries);
        } else if (career?.id && season?.id) {
          const report = await ServiceFinance.getReportBySeason(
            career.id,
            season.id,
            season.seasonNumber,
            season,
            career,
          );
          if (isMounted) {
            if (report?.entries && report.entries.length > 0) {
              setEntries(report.entries);
            } else if (
              season?.financialReport?.entries &&
              season.financialReport.entries.length > 0
            ) {
              setEntries(season.financialReport.entries);
            } else {
              setEntries(report?.entries || []);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar relatório financeiro:", error);
        if (isMounted && season?.financialReport?.entries) {
          setEntries(season.financialReport.entries);
        }
      } finally {
        if (isMounted) setIsLoadingReport(false);
      }
    };

    fetchReport();

    const handleFinanceUpdated = (event: Event) => {
      const detail = (
        event as CustomEvent<{ careerId?: string; seasonId?: string }>
      ).detail;
      if (
        !detail?.careerId ||
        detail.careerId === career?.id ||
        notSeason
      ) {
        void fetchReport();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("finance-report-updated", handleFinanceUpdated);
    }

    return () => {
      isMounted = false;
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "finance-report-updated",
          handleFinanceUpdated,
        );
      }
    };
  }, [career, season, notSeason, initialEntries]);

  const currency = career?.currency || "EUR";
  const totals = ServiceFinance.calculateTotals(entries);

  const revenueCategories = useMemo(() => {
    const map = new Map<string, number>();
    entries
      .filter((e) => e.type === "revenue")
      .forEach((e) => {
        const cat = e.category?.trim() || "Outros";
        map.set(cat, (map.get(cat) || 0) + (e.amount || 0));
      });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          totals.totalRevenue > 0
            ? Math.round((amount / totals.totalRevenue) * 100)
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, totals.totalRevenue]);

  const expenseCategories = useMemo(() => {
    const map = new Map<string, number>();
    entries
      .filter((e) => e.type === "expense")
      .forEach((e) => {
        const cat = e.category?.trim() || "Outros";
        map.set(cat, (map.get(cat) || 0) + (e.amount || 0));
      });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          totals.totalExpense > 0
            ? Math.round((amount / totals.totalExpense) * 100)
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, totals.totalExpense]);

  const subtext = notSeason
    ? "Toda a Carreira"
    : `Temporada ${season?.seasonNumber ?? 1}`;

  const handleAddClick = () => {
    if (notSeason) return;
    onOpenScreen?.({ key: "addFinancialEntry" });
  };

  const handleCopyReport = async () => {
    if (isLoadingReport) return;

    const text = buildBudgetCopyText({
      totalRevenue: totals.totalRevenue,
      totalExpense: totals.totalExpense,
      revenueCategories,
      expenseCategories,
    });

    await Copy(text, "Relatório financeiro copiado com sucesso!");
  };

  return (
    <Card className={Styles.card}>
      <div className={Styles.container_card} data-testid="budget-overview-card">
        <div className={Styles.wrapper}>
          <h1 className={Styles.h1}>Relatório Financeiro</h1>
          <button
            type="button"
            className={Styles.icon}
            onClick={handleCopyReport}
            disabled={isLoadingReport}
            title="Copiar relatório financeiro"
            aria-label="Copiar relatório financeiro"
            data-testid="btn-copy-budget-report"
          >
            <AiOutlineCopy />
          </button>
        </div>

        {isLoadingReport ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "180px",
            }}
          >
            <Load />
          </div>
        ) : (
          <>
            <BudgetDonutChart
              totalRevenue={totals.totalRevenue}
              totalExpense={totals.totalExpense}
              netBalance={totals.netBalance}
              currency={currency}
              subtext={subtext}
            />

            <div className={Styles.columnsContainer}>
              <div className={Styles.column}>
                <span className={Styles.labelRevenue}>Receitas</span>
                <span
                  className={Styles.valueRevenue}
                  data-testid="revenue-total-value"
                >
                  {formatDisplayValue(totals.totalRevenue, currency)}
                </span>
              </div>

              <div className={Styles.columnDivider} />

              <div className={Styles.column}>
                <span className={Styles.labelExpense}>Despesas</span>
                <span
                  className={Styles.valueExpense}
                  data-testid="expense-total-value"
                >
                  {formatDisplayValue(totals.totalExpense, currency)}
                </span>
              </div>
            </div>

            <div className={Styles.categoriesSection}>
              {/* Bloco de Entradas por Categoria */}
              <div className={Styles.blockRevenue}>
                <div className={Styles.blockHeaderRevenue}>
                  <span className={Styles.blockTitleRevenue}>
                    <span className={Styles.dotRevenue} />
                    Receitas por Categoria
                  </span>
                  <span className={Styles.blockTotalRevenue}>
                    {formatDisplayValue(totals.totalRevenue, currency)}
                  </span>
                </div>

                {revenueCategories.length === 0 ? (
                  <div className={Styles.emptyCategory}>
                    Nenhuma receita registrada
                  </div>
                ) : (
                  <div className={Styles.categoryList}>
                    {revenueCategories.map((item) => (
                      <div key={item.category} className={Styles.categoryItem}>
                        <div className={Styles.categoryRow}>
                          <span
                            className={Styles.categoryName}
                            title={item.category}
                          >
                            {item.category}
                          </span>
                          <span className={Styles.categoryValueRevenue}>
                            {formatDisplayValue(item.amount, currency)}
                          </span>
                        </div>
                        <div className={Styles.progressBarBg}>
                          <div
                            className={Styles.progressBarRevenue}
                            style={{
                              width: `${Math.min(100, Math.max(3, item.percentage))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bloco de Saídas por Categoria */}
              <div className={Styles.blockExpense}>
                <div className={Styles.blockHeaderExpense}>
                  <span className={Styles.blockTitleExpense}>
                    <span className={Styles.dotExpense} />
                    Despesas por Categoria
                  </span>
                  <span className={Styles.blockTotalExpense}>
                    {formatDisplayValue(totals.totalExpense, currency)}
                  </span>
                </div>

                {expenseCategories.length === 0 ? (
                  <div className={Styles.emptyCategory}>
                    Nenhuma despesa registrada
                  </div>
                ) : (
                  <div className={Styles.categoryList}>
                    {expenseCategories.map((item) => (
                      <div key={item.category} className={Styles.categoryItem}>
                        <div className={Styles.categoryRow}>
                          <span
                            className={Styles.categoryName}
                            title={item.category}
                          >
                            {item.category}
                          </span>
                          <span className={Styles.categoryValueExpense}>
                            {formatDisplayValue(item.amount, currency)}
                          </span>
                        </div>
                        <div className={Styles.progressBarBg}>
                          <div
                            className={Styles.progressBarExpense}
                            style={{
                              width: `${Math.min(100, Math.max(3, item.percentage))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!notSeason && (
              <button
                type="button"
                className={Styles.addButton}
                onClick={handleAddClick}
                data-testid="btn-add-financial-entry"
              >
                + Nova Movimentação
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default BudgetOverviewCard;
