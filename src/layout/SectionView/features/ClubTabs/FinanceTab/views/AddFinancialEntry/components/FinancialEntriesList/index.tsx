import React, { useMemo } from "react";
import { FinancialEntry } from "../../../../../../../../../common/interfaces/finance";
import { FinancialEntryCard } from "../FinancialEntryCard";
import Styles from "./FinancialEntriesList.module.css";

export interface FinancialEntriesListProps {
  entries: FinancialEntry[];
  currency: string;
  currentType?: "revenue" | "expense";
  editingEntryId?: string | null;
  highlightedCategory?: string | null;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entryId: string) => void;
  onRedirect: (entry: FinancialEntry) => void;
}

export const FinancialEntriesList: React.FC<FinancialEntriesListProps> = ({
  entries,
  currency,
  currentType,
  editingEntryId,
  highlightedCategory,
  onEdit,
  onDelete,
  onRedirect,
}) => {
  const filteredEntries = useMemo(() => {
    let list = entries;
    if (editingEntryId) {
      list = list.filter((e) => e.id !== editingEntryId);
    }
    if (currentType) {
      list = list.filter((e) => e.type === currentType);
    }
    return list;
  }, [entries, currentType, editingEntryId]);

  const isRevenue = currentType === "revenue";
  const isExpense = currentType === "expense";

  const title = isRevenue
    ? "Receitas da Temporada"
    : isExpense
      ? "Despesas da Temporada"
      : "Lançamentos da Temporada";

  const countLabel = isRevenue
    ? filteredEntries.length === 1
      ? "receita"
      : "receitas"
    : isExpense
      ? filteredEntries.length === 1
        ? "despesa"
        : "despesas"
      : filteredEntries.length === 1
        ? "lançamento"
        : "lançamentos";

  const emptyMessage = isRevenue
    ? "Nenhuma receita registrada nesta temporada."
    : isExpense
      ? "Nenhuma despesa registrada nesta temporada."
      : "Nenhum lançamento registrado nesta temporada.";

  return (
    <section
      className={Styles.section}
      data-testid="financial-entries-list"
      aria-labelledby="financial-entries-title"
    >
      <div className={Styles.header}>
        <h3 id="financial-entries-title" className={Styles.title}>
          {title}
        </h3>
        <span className={Styles.badgeCount}>
          {filteredEntries.length} {countLabel}
        </span>
      </div>

      {filteredEntries.length === 0 ? (
        <div className={Styles.emptyState}>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className={Styles.list}>
          {filteredEntries.map((entry) => {
            const isHighlighted = Boolean(
              highlightedCategory &&
                entry.category?.trim().toLowerCase() ===
                  highlightedCategory.trim().toLowerCase(),
            );
            return (
              <FinancialEntryCard
                key={entry.id}
                entry={entry}
                currency={currency}
                isHighlighted={isHighlighted}
                onEdit={onEdit}
                onDelete={onDelete}
                onRedirect={onRedirect}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};

export default FinancialEntriesList;
