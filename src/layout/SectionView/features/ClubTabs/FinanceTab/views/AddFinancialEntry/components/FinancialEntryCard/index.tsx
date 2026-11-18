import React from "react";
import { FaPencilAlt, FaTrash, FaExternalLinkAlt } from "react-icons/fa";
import { FinancialEntry } from "../../../../../../../../../common/interfaces/finance";
import { formatDisplayValue } from "../../../../../../../../../common/utils/FormatValue";
import Styles from "./FinancialEntryCard.module.css";

export interface FinancialEntryCardProps {
  entry: FinancialEntry;
  currency: string;
  isHighlighted?: boolean;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entryId: string) => void;
  onRedirect: (entry: FinancialEntry) => void;
}

export const FinancialEntryCard: React.FC<FinancialEntryCardProps> = ({
  entry,
  currency,
  isHighlighted,
  onEdit,
  onDelete,
  onRedirect,
}) => {
  const isRevenue = entry.type === "revenue";
  const isTransfer =
    entry.source === "transfer" ||
    (!entry.source && entry.isAutomatic && entry.id.startsWith("transfer_"));
  const isClause =
    entry.source === "clause" ||
    (!entry.source &&
      entry.isAutomatic &&
      (entry.id.startsWith("bonus_") ||
        entry.id.startsWith("inst_") ||
        entry.id.startsWith("sellon_") ||
        entry.id.startsWith("signing_bonus_") ||
        entry.id.startsWith("agent_fee_")));
  const isSalary =
    entry.source === "salary" ||
    (!entry.source && entry.isAutomatic && entry.id.startsWith("salary_"));
  const isManual =
    !isTransfer &&
    !isClause &&
    !isSalary &&
    !entry.isAutomatic &&
    (!entry.source || entry.source === "manual");

  const badgeClass = isSalary
    ? Styles.badgeTransfer
    : isTransfer
      ? Styles.badgeTransfer
      : isClause
        ? Styles.badgeClause
        : Styles.badgeManual;

  const badgeLabel = isSalary
    ? "Salário"
    : isTransfer
      ? "Transferência"
      : isClause
        ? "Cláusula"
        : "Manual";

  return (
    <div
      className={`${Styles.card} ${isRevenue ? Styles.cardRevenue : Styles.cardExpense} ${
        isHighlighted ? Styles.cardHighlighted : ""
      }`}
      data-testid={`financial-entry-card-${entry.id}`}
      data-category={entry.category}
    >
      <div className={Styles.headerRow}>
        <div className={Styles.categoryGroup}>
          <span className={Styles.categoryTitle}>{entry.category}</span>
          <span className={`${Styles.sourceBadge} ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
        <span
          className={isRevenue ? Styles.amountRevenue : Styles.amountExpense}
        >
          {isRevenue ? "+" : "-"} {formatDisplayValue(Math.abs(entry.amount), currency)}
        </span>
      </div>

      {entry.description && (
        <p className={Styles.description}>{entry.description}</p>
      )}

      <div className={Styles.footerRow}>
        <span className={Styles.date}>{entry.date || "Temporada Vigente"}</span>

        <div className={Styles.actionsGroup}>
          {isManual ? (
            <>
              <button
                type="button"
                className={Styles.editBtn}
                onClick={() => onEdit(entry)}
                aria-label={`Editar lançamento ${entry.category}`}
              >
                <FaPencilAlt /> Editar
              </button>
              <button
                type="button"
                className={Styles.deleteBtn}
                onClick={() => onDelete(entry.id)}
                aria-label={`Excluir lançamento ${entry.category}`}
              >
                <FaTrash /> Excluir
              </button>
            </>
          ) : isSalary ? (
            <button
              type="button"
              className={Styles.editBtn}
              onClick={() => onEdit(entry)}
              aria-label={`Editar lançamento ${entry.category}`}
            >
              <FaPencilAlt /> Editar
            </button>
          ) : (
            <button
              type="button"
              className={Styles.redirectBtn}
              onClick={() => onRedirect(entry)}
              aria-label={
                isClause
                  ? "Ver lançamento em Cláusulas"
                  : "Ver lançamento em Transferências"
              }
            >
              <FaExternalLinkAlt />
              {isClause ? "Ver em Cláusulas" : "Ver em Transferências"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialEntryCard;
