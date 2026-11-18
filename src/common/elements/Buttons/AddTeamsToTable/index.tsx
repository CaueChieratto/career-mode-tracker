import { BiShieldAlt } from "react-icons/bi";
import { ThemedActionButton } from "../ThemedActionButton";

type AddTeamsToTableProps = {
  onClick?: () => void;
};

export const AddTeamsToTable = ({ onClick }: AddTeamsToTableProps) => (
  <ThemedActionButton
    label="Adicionar times"
    icon={<BiShieldAlt />}
    onClick={onClick}
  />
);
