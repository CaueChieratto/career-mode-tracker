import { useState } from "react";
import Button from "../../../components/Button";
import ContainerButton from "../../../components/ContainerButton";
import Form from "../../../components/Form";
import SellFormField from "../../../components/SellFormField";
import { BsCalendar2Event } from "react-icons/bs";
import Styles from "../DeleteConfirmModal/DeleteConfirmModal.module.css";
import { formatDateInputShort } from "../../../common/utils/Date";
import { toast } from "../../../common/services/ToastService";

type ReturnLoanConfirmModalProps = {
  closeModal: () => void;
  onConfirm: (returnDate: string) => void | Promise<void>;
  isAcademy?: boolean;
};

const ReturnLoanConfirmModal = ({
  closeModal,
  onConfirm,
  isAcademy,
}: ReturnLoanConfirmModalProps) => {
  const [returnDate, setReturnDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnDate) {
      toast.warning("Por favor, preencha a data.");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onConfirm(returnDate);
      toast.success("Jogador retornado do empréstimo com sucesso!");
      closeModal();
    } catch (error) {
      console.error("Erro ao retornar o jogador do empréstimo:", error);
      toast.error("Erro ao retornar o jogador do empréstimo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      onSubmit={handleReturn}
      className={Styles.container}
      style={{ flexDirection: "column" }}
    >
      <div style={{ marginBottom: "20px", width: "100%" }}>
        <SellFormField
          isAcademy={isAcademy}
          id="returnDate"
          name="Data de Retorno"
          icon={<BsCalendar2Event />}
          placeholder="Ex: 11/07"
          value={returnDate}
          onChange={(e) => setReturnDate(formatDateInputShort(e.target.value))}
        />
      </div>
      <ContainerButton>
        <Button
          width="normal"
          size="big"
          fontWeight="bold"
          radius="square"
          typeButton="primaryDelete"
          type="button"
          onClick={closeModal}
        >
          Cancelar
        </Button>
        <Button
          width="normal"
          size="big"
          fontWeight="bold"
          radius="square"
          typeButton="secondaryDelete"
          type="submit"
          disabled={isLoading}
          style={{ backgroundColor: "#4CAF50", color: "#FFF" }}
        >
          {isLoading ? "Confirmando..." : "Confirmar"}
        </Button>
      </ContainerButton>
    </Form>
  );
};

export default ReturnLoanConfirmModal;
