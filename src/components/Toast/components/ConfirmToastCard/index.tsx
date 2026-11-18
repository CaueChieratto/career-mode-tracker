import React, { useCallback, useEffect, useRef } from "react";
import {
  ConfirmToastItem,
  settleConfirm,
} from "../../../../common/services/ToastService";
import { CONFIRM_VISUAL_CONFIG } from "../../constants/toastVisualConfig";
import Styles from "../../Toast.module.css";

interface ConfirmToastCardProps {
  item: ConfirmToastItem;
}

export const ConfirmToastCard: React.FC<ConfirmToastCardProps> = ({ item }) => {
  const settledRef = useRef(false);
  const titleId = `toast-confirm-title-${item.id}`;
  const descId = `toast-confirm-desc-${item.id}`;

  const handleDecision = useCallback(
    (decision: boolean) => {
      if (settledRef.current) return;
      settledRef.current = true;
      settleConfirm(item.id, decision);
    },
    [item.id],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleDecision(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDecision]);

  const variantClass =
    item.tone === "danger"
      ? CONFIRM_VISUAL_CONFIG.dangerClass
      : CONFIRM_VISUAL_CONFIG.warningClass;

  const acceptClass =
    item.tone === "danger" ? Styles.acceptButtonDanger : Styles.acceptButton;

  const title = item.title ?? "Confirmação";

  return (
    <article
      className={`${Styles.card} ${variantClass}`}
      data-testid="toast-confirm"
      data-toast-type="confirm"
      role="alertdialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className={Styles.iconWrapper}>{CONFIRM_VISUAL_CONFIG.icon}</div>
      <div className={Styles.content}>
        <div className={Styles.header}>
          <span id={titleId} className={Styles.title}>
            {title}
          </span>
        </div>
        <p id={descId} className={Styles.message}>
          {item.message}
        </p>
        <div className={Styles.actions}>
          <button
            type="button"
            className={`${Styles.button} ${Styles.cancelButton}`}
            data-testid="toast-confirm-cancel"
            onClick={() => handleDecision(false)}
          >
            {item.cancelLabel}
          </button>
          <button
            type="button"
            className={`${Styles.button} ${acceptClass}`}
            data-testid="toast-confirm-accept"
            onClick={() => handleDecision(true)}
          >
            {item.confirmLabel}
          </button>
        </div>
      </div>
    </article>
  );
};

