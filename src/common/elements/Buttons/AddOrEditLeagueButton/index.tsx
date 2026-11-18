import Button from "../../../../components/Button";
import ContainerButton from "../../../../components/ContainerButton";
import { useSeasonTheme } from "../../../hooks/Seasons/UseSeasonTheme";
import Styles from "./AddOrEditLeagueButton.module.css";

export type AddOrEditLeagueButtonProps = {
  isEditing: boolean;
  onClick: () => void;
  addLabel?: string;
  editLabel?: string;
};

export const AddOrEditLeagueButton = ({
  isEditing,
  onClick,
  addLabel = "Adicionar Liga",
  editLabel = "Salvar Alterações",
}: AddOrEditLeagueButtonProps) => {
  const { clubColor } = useSeasonTheme();

  return (
    <ContainerButton className={Styles.container_button}>
      <Button
        shadow="yes"
        size="big"
        fontSize="large"
        fontWeight="bold"
        type="button"
        onClick={onClick}
        style={{ border: `1px solid ${clubColor}`, color: clubColor }}
      >
        {isEditing ? editLabel : addLabel}
      </Button>
    </ContainerButton>
  );
};

export default AddOrEditLeagueButton;
