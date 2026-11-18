import React, { ReactNode, useContext } from "react";
import Button from "../../../../components/Button";
import { SeasonThemeContext } from "../../../../contexts/SeasonThemeContext";

export type ThemedActionButtonProps = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
};

export const ThemedActionButton: React.FC<ThemedActionButtonProps> = ({
  label,
  icon,
  onClick,
}) => {
  const { activeStyle } = useContext(SeasonThemeContext)!;

  return (
    <Button
      shadow="yes"
      typeButton="addPlayer"
      fontSize="large"
      size="big"
      onClick={onClick}
      style={{
        backgroundColor: activeStyle.darkClubColor,
        color: activeStyle.color,
        fontWeight: activeStyle.fontWeight,
        border: activeStyle.border,
      }}
    >
      {label} {icon}
    </Button>
  );
};
