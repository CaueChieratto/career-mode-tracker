import { ThemedActionButton } from "../ThemedActionButton";

type AddStatsMatchProps = {
  onClick?: () => void;
};

export const AddStatsMatch = ({ onClick }: AddStatsMatchProps) => (
  <ThemedActionButton label="Adicionar estatísticas" onClick={onClick} />
);
