import { AcademyMatches } from "../../../../../../../../../../common/interfaces/AcademyData";
import { TournamentMatchCard } from "./components/TournamentMatchCard";
import Styles from "./TournamentMatchList.module.css";

type TournamentMatchListProps = {
  matches?: AcademyMatches[];
  onEdit?: (match: AcademyMatches) => void;
  onEnterMatch?: (match: AcademyMatches) => void;
};

export const TournamentMatchList = ({
  matches,
  onEdit,
  onEnterMatch,
}: TournamentMatchListProps) => {
  if (!matches || matches.length === 0) {
    return <p className={Styles.emptyText}>Nenhuma partida registrada.</p>;
  }

  return (
    <div className={Styles.matchList}>
      {matches.map((match) => (
        <TournamentMatchCard
          key={match.id}
          match={match}
          onEdit={onEdit}
          onEnterMatch={onEnterMatch}
        />
      ))}
    </div>
  );
};
