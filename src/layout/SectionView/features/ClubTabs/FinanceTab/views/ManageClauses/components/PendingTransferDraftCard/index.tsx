import React from "react";
import { FaHistory, FaTrashAlt, FaArrowRight } from "react-icons/fa";
import { PendingTransferDraft } from "../../../../../../../../../common/services/TransferDraftService";
import {
  formatDisplayValue,
  parseValue,
} from "../../../../../../../../../common/utils/FormatValue";
import Styles from "./PendingTransferDraftCard.module.css";

export interface PendingTransferDraftCardProps {
  draft: PendingTransferDraft;
  currency?: string;
  onResume: () => void;
  onCancel: () => void;
}

export const PendingTransferDraftCard: React.FC<
  PendingTransferDraftCardProps
> = ({ draft, currency = "EUR", onResume, onCancel }) => {
  const rawFee = draft.transferFee || draft.playerValue;
  const parsedFee = rawFee ? parseValue(rawFee) : 0;
  const feeDisplay =
    parsedFee > 0
      ? formatDisplayValue(parsedFee, currency)
      : rawFee;

  return (
    <div
      className={Styles.card}
      data-testid="pending-transfer-draft-card"
    >
      <div className={Styles.header}>
        <span className={Styles.badge}>
          <FaHistory size={11} /> Rascunho Pendente (Backup)
        </span>
      </div>

      <div className={Styles.body}>
        <h4 className={Styles.playerName}>
          {draft.playerName || "Jogador sem nome"}
        </h4>
        <div className={Styles.details}>
          {draft.position && (
            <span className={Styles.detailItem}>{draft.position}</span>
          )}
          {draft.fromClub && (
            <>
              <span className={Styles.bullet}>•</span>
              <span className={Styles.detailItem}>
                Origem: <strong>{draft.fromClub}</strong>
              </span>
            </>
          )}
          {feeDisplay && (
            <>
              <span className={Styles.bullet}>•</span>
              <span className={Styles.detailItem}>
                Valor: <strong>{feeDisplay}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      <div className={Styles.footer}>
        <button
          type="button"
          className={Styles.btnCancel}
          onClick={onCancel}
          data-testid="btn-cancel-draft"
        >
          <FaTrashAlt size={12} /> Descartar
        </button>
        <button
          type="button"
          className={Styles.btnResume}
          onClick={onResume}
          data-testid="btn-resume-draft"
        >
          Continuar <FaArrowRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default PendingTransferDraftCard;
