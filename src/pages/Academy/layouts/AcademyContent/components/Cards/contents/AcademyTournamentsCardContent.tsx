import React from "react";
import Styles from "../../../AcademyContent.module.css";
import { AcademyTournaments } from "../../../../../../../common/interfaces/AcademyData";
import { TournamentListItem } from "../../Tournament/components/TournamentListItem";

interface AcademyTournamentsCardContentProps {
  tournamentsAcademy: AcademyTournaments[];
  activeCardIndex: number | null;
  selectedTournamentId: string | null;
  onTournamentClick: (id: string) => void;
}

export const AcademyTournamentsCardContent: React.FC<
  AcademyTournamentsCardContentProps
> = ({
  tournamentsAcademy,
  activeCardIndex,
  selectedTournamentId,
  onTournamentClick,
}) => {
  return (
    <div className={Styles.wrapper}>
      {tournamentsAcademy.length > 0 ? (
        (activeCardIndex === 1 || selectedTournamentId !== null
          ? tournamentsAcademy
          : tournamentsAcademy.slice(0, 3)
        ).map((tourn) => (
          <TournamentListItem
            key={tourn.id}
            tournament={tourn}
            onClick={() => onTournamentClick(tourn.id)}
            isSelected={tourn.id === selectedTournamentId}
          />
        ))
      ) : (
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-tertiary)",
            textAlign: "center",
            margin: "10px 0",
          }}
        >
          Nenhum torneio cadastrado.
        </p>
      )}
    </div>
  );
};
