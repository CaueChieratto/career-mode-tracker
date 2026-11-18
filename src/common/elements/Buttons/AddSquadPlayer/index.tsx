import { IoMdPersonAdd } from "react-icons/io";
import { ThemedActionButton } from "../ThemedActionButton";

type AddSquadPlayerProps = {
  onClick?: () => void;
};

export const AddSquadPlayer = ({ onClick }: AddSquadPlayerProps) => (
  <ThemedActionButton
    label="Adicionar jogador"
    icon={<IoMdPersonAdd />}
    onClick={onClick}
  />
);
