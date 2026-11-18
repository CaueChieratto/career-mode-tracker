import React from "react";
import { createPortal } from "react-dom";
import { useToast } from "../../common/hooks/UseToast";
import { ConfirmToastCard } from "./components/ConfirmToastCard";
import { ToastCard } from "./components/ToastCard";
import Styles from "./Toast.module.css";

export const ToastViewport: React.FC = () => {
  const { toasts } = useToast();

  if (typeof document === "undefined" || toasts.length === 0) {
    return null;
  }

  return createPortal(
    <section
      className={Styles.viewport}
      aria-label="Notificações"
      data-testid="toast-viewport"
    >
      {toasts.map((toastItem) =>
        toastItem.type === "confirm" ? (
          <ConfirmToastCard key={toastItem.id} item={toastItem} />
        ) : (
          <ToastCard key={toastItem.id} item={toastItem} />
        ),
      )}
    </section>,
    document.body,
  );
};

export default ToastViewport;

