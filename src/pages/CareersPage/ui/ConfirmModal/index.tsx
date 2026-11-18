import { ReactNode } from "react";
import Button from "../../../../components/Button";
import Modal from "../../../../components/Modal";
import Styles from "./ConfirmModal.module.css";

type ConfirmModalProps = {
  title: string;
  description: ReactNode;
  cancelText?: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export const ConfirmModal = ({
  title,
  description,
  cancelText = "Cancelar",
  confirmText,
  onCancel,
  onConfirm,
}: ConfirmModalProps) => {
  return (
    <Modal
      isOpen
      closeModal={onCancel}
      animationContainer="grow"
      text={title}
    >
      <div className={Styles.modalContent}>
        <p className={Styles.modalText}>{description}</p>
        <div className={Styles.modalActions}>
          <Button isActive={false} color="cancel" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button isActive={true} color="club_secondary" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
