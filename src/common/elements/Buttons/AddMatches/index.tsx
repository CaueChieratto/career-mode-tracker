import { GiSoccerKick } from "react-icons/gi";
import { ThemedActionButton } from "../ThemedActionButton";

type AddMatchesProps = {
  onClick?: () => void;
};

export const AddMatches = ({ onClick }: AddMatchesProps) => (
  <ThemedActionButton
    label="Adicionar partida"
    icon={<GiSoccerKick />}
    onClick={onClick}
  />
);
