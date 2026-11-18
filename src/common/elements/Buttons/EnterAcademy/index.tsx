import { IoEnterOutline } from "react-icons/io5";
import { ThemedActionButton } from "../ThemedActionButton";

type EnterAcademyProps = {
  onClick?: () => void;
};

export const EnterAcademy = ({ onClick }: EnterAcademyProps) => (
  <ThemedActionButton
    label="Acessar Base"
    icon={<IoEnterOutline />}
    onClick={onClick}
  />
);
