import { useContext } from "react";
import { IoColorPalette } from "react-icons/io5";
import { SeasonThemeContext } from "../../../../contexts/SeasonThemeContext";
import { ThemedActionButton } from "../ThemedActionButton";

export const ChangeClubColors = () => {
  const { changeClubColor } = useContext(SeasonThemeContext)!;

  return (
    <ThemedActionButton
      label="Trocar Cores"
      icon={<IoColorPalette />}
      onClick={changeClubColor}
    />
  );
};
