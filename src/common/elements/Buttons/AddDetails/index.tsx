import { ThemedActionButton } from "../ThemedActionButton";

type AddDetailsProps = {
  onClick?: () => void;
};

export const AddDetails = ({ onClick }: AddDetailsProps) => (
  <ThemedActionButton label="Adicionar resultado" onClick={onClick} />
);
