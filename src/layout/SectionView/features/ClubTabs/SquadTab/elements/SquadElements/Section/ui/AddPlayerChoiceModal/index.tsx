import { IoPersonOutline } from "react-icons/io5";
import { FaMoneyBillTransfer } from "react-icons/fa6";
import {
  ActionChoiceModal,
  ActionChoiceOption,
} from "../ActionChoiceModal";

export type AddPlayerChoiceModalProps = {
  onClose: () => void;
  onSelectElenco: () => void;
  onSelectTransferencia: () => void;
  clubColor?: string;
  darkClubColor?: string;
};

const ADD_PLAYER_OPTIONS: ActionChoiceOption[] = [
  {
    key: "squad",
    text: "Adicionar",
    title: "Elenco",
    icon: IoPersonOutline,
    actionLabel: "Adicionar Elenco",
  },
  {
    key: "transfer",
    text: "Adicionar",
    title: "Transferência",
    icon: FaMoneyBillTransfer,
    actionLabel: "Adicionar Transferência",
  },
];

export const AddPlayerChoiceModal = ({
  onClose,
  onSelectElenco,
  onSelectTransferencia,
  clubColor = "#ffffff",
  darkClubColor = "#000000",
}: AddPlayerChoiceModalProps) => {
  const handleConfirm = (selectedOption: string) => {
    if (selectedOption === "squad") {
      onSelectElenco();
    } else if (selectedOption === "transfer") {
      onSelectTransferencia();
    }
    onClose();
  };

  return (
    <ActionChoiceModal
      title="Adicionar Jogador"
      options={ADD_PLAYER_OPTIONS}
      onClose={onClose}
      onConfirm={handleConfirm}
      clubColor={clubColor}
      darkClubColor={darkClubColor}
    />
  );
};
