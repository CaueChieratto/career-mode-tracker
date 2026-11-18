import React from "react";
import { FaPlus, FaTrophy } from "react-icons/fa";
import Button from "../../../../../../../components/Button";
import Styles from "../../../AcademyContent.module.css";

interface AcademyActionsCardContentProps {
  onAddPlayerClick: () => void;
  onAddTournamentClick: () => void;
  onPromotePlayerClick: () => void;
}

export const AcademyActionsCardContent: React.FC<
  AcademyActionsCardContentProps
> = ({ onAddPlayerClick, onAddTournamentClick, onPromotePlayerClick }) => {
  return (
    <div className={Styles.wrapper}>
      <Button className={Styles.actionBtn} onClick={onAddPlayerClick}>
        <FaPlus /> Adicionar Jogador
      </Button>
      <Button className={Styles.actionBtn} onClick={onAddTournamentClick}>
        <FaTrophy /> Adicionar Torneio
      </Button>
      <Button
        className={`${Styles.actionBtn} ${Styles.promoteBtn}`}
        onClick={onPromotePlayerClick}
      >
        Promover ao Profissional
      </Button>
    </div>
  );
};
