import { FaFileContract } from "react-icons/fa";
import { ThemedActionButton } from "../ThemedActionButton";

type ManageClausesProps = {
  onClick?: () => void;
};

export const ManageClauses = ({ onClick }: ManageClausesProps) => (
  <ThemedActionButton
    label="Cláusulas"
    icon={<FaFileContract />}
    onClick={onClick}
  />
);
