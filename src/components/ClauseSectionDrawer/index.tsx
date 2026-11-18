import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "../../common/utils/bodyScrollLock";
import Styles from "./ClauseSectionDrawer.module.css";

export interface ClauseSectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  saveLabel?: string;
  onSave?: () => void | Promise<void>;
  cancelLabel?: string;
  onCancel?: () => void;
  isSaving?: boolean;
  hubContainerId?: string;
  confirmTestId?: string;
  isConfirmDisabled?: boolean;
}

export const ClauseSectionDrawer: React.FC<ClauseSectionDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  confirmLabel,
  onConfirm,
  saveLabel = "Salvar",
  onSave,
  cancelLabel = "Cancelar",
  onCancel,
  isSaving = false,
  isConfirmDisabled = false,
  hubContainerId,
  confirmTestId,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const unlockScroll = lockBodyScroll();

    const drawerBody = document.getElementById("clauseSectionDrawerBody");
    if (drawerBody) {
      drawerBody.scrollTop = 0;
    }

    const drawerOverlay = document.querySelector("[data-testid='clause-section-drawer-overlay']");
    if (drawerOverlay) {
      drawerOverlay.scrollTop = 0;
    }

    let hubElement: HTMLElement | null = null;
    if (hubContainerId) {
      hubElement = document.getElementById(hubContainerId);
      if (hubElement) {
        hubElement.setAttribute("inert", "");
        hubElement.style.pointerEvents = "none";
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockScroll();
      if (hubElement) {
        hubElement.removeAttribute("inert");
        hubElement.style.pointerEvents = "";
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, hubContainerId, onClose]);

  if (!isOpen) return null;

  const handleSaveClick = async () => {
    if (onSave) {
      await onSave();
    } else if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const drawerContent = (
    <div
      className={Styles.drawerOverlay}
      onClick={handleCancelClick}
      data-testid="clause-section-drawer-overlay"
    >
      <div
        className={Styles.drawerPanel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className={Styles.drawerHeader}>
          <h3 className={Styles.drawerTitle}>{title}</h3>
          <button
            type="button"
            className={Styles.drawerCloseBtn}
            onClick={handleCancelClick}
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>
        <div className={Styles.drawerBody} id="clauseSectionDrawerBody">{children}</div>
        <footer className={Styles.drawerFooter}>
          <button
            type="button"
            className={Styles.btnCancel}
            onClick={handleCancelClick}
            disabled={isSaving}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={Styles.btnConfirm}
            onClick={handleSaveClick}
            disabled={isSaving || isConfirmDisabled}
            data-testid={confirmTestId}
          >
            {isSaving ? "Salvando..." : (confirmLabel || saveLabel)}
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};

export default ClauseSectionDrawer;
