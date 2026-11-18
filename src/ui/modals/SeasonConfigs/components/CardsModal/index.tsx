import React from "react";
import ContainerButton from "../../../../../components/ContainerButton";
import Styles from "./CardsModal.module.css";

type CardsModalProps = {
  icon?: React.ReactNode;
  customIconNode?: React.ReactNode;
  label: string;
  title: string;
  onClick: () => void;
  clubColor: string;
  darkClubColor: string;
  className?: string;
  isSelected?: boolean;
  selectedClassName?: string;
};

export const CardsModal = ({
  icon,
  customIconNode,
  label,
  title,
  onClick,
  clubColor,
  darkClubColor,
  className,
  isSelected = false,
  selectedClassName,
}: CardsModalProps) => {
  const selectedClass = isSelected
    ? `${Styles.selected} ${selectedClassName ?? ""}`.trim()
    : "";

  return (
    <ContainerButton
      className={`${Styles.card} ${selectedClass} ${className ?? ""}`.trim()}
      style={
        {
          "--club-color": clubColor,
          "--club-color-dark": darkClubColor,
        } as React.CSSProperties
      }
    >
      <div className={Styles.card_inner} onClick={onClick}>
        {customIconNode ?? <div className={Styles.icon_wrap}>{icon}</div>}

        <div className={Styles.card_content}>
          <span className={Styles.card_label}>{label}</span>
          <span className={Styles.card_title}>{title}</span>
        </div>
      </div>
    </ContainerButton>
  );
};
