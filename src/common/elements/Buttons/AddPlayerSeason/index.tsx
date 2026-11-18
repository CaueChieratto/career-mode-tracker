import { BsGraphUp } from "react-icons/bs";
import { ThemedActionButton } from "../ThemedActionButton";

type AddPlayerSeasonProps = {
  onClick?: () => void;
};

export const AddPlayerSeason = ({ onClick }: AddPlayerSeasonProps) => (
  <ThemedActionButton
    label="Adicionar estatísticas"
    icon={<BsGraphUp />}
    onClick={onClick}
  />
);
