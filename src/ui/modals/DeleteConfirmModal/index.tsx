import { useState } from "react";
import { Career } from "../../../common/interfaces/Career";
import { ServiceCareer } from "../../../common/services/ServiceCareer";
import Button from "../../../components/Button";
import ContainerButton from "../../../components/ContainerButton";
import Styles from "./DeleteConfirmModal.module.css";
import Load from "../../../components/Load";
import { toast } from "../../../common/services/ToastService";

type DeleteConfirmModalProps = {
  closeModal: () => void;
  onConfirm?: () => void | Promise<void>;
  selectedCareer?: Career;
  successMessage?: string;
  errorMessage?: string;
};

const DeleteConfirmModal = ({
  closeModal,
  selectedCareer,
  onConfirm,
  successMessage,
  errorMessage,
}: DeleteConfirmModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const deleteCareer = async () => {
    setIsLoading(true);
    try {
      if (selectedCareer) {
        await ServiceCareer.deleteCareer(selectedCareer.id);
        toast.success(successMessage || "Carreira excluída com sucesso!");
      } else if (onConfirm) {
        await onConfirm();
        if (successMessage) {
          toast.success(successMessage);
        }
      }
      closeModal();
    } catch (error) {
      console.error("Erro na operação de exclusão:", error);
      if (errorMessage) {
        toast.error(errorMessage);
      } else if (selectedCareer) {
        toast.error("Erro ao excluir carreira. Tente novamente.");
      } else {
        toast.error("Erro na operação de exclusão. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Load />;
  }

  return (
    <ContainerButton className={Styles.container}>
      <Button
        width="normal"
        size="big"
        fontWeight="bold"
        radius="square"
        typeButton="primaryDelete"
        onClick={() => closeModal()}
      >
        Cancelar
      </Button>
      <Button
        width="normal"
        size="big"
        fontWeight="bold"
        radius="square"
        typeButton="secondaryDelete"
        onClick={deleteCareer}
      >
        Confirmar
      </Button>
    </ContainerButton>
  );
};

export default DeleteConfirmModal;
