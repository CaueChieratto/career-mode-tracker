import { ThemedActionButton } from "../ThemedActionButton";

type SaveFormationProps = {
  onClick?: () => void;
};

export const SaveFormation = ({ onClick }: SaveFormationProps) => (
  <ThemedActionButton label="Salvar Formação" onClick={onClick} />
);
