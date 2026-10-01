import { useAcademyContext } from "../../../../../../../../../contexts/AcademyContext/hooks/useAcademyContext";
import { AcademyMatches } from "../../../../../../../../interfaces/AcademyTournaments/AcademyMatches/AcademyMatches";
import { getOpponentBadge } from "../../helpers/getOpponentBadge";
import { TournamentMatchActions } from "../TournamentMatchActions";
import { TournamentMatchBody } from "../TournamentMatchBody";
import { TournamentMatchHeader } from "../TournamentMatchHeader";
import { TournamentMatchLineup } from "../TournamentMatchLineup";
import Styles from "./TournamentMatchCard.module.css";

type TournamentMatchCardProps = {
  match: AcademyMatches;
  onEdit?: (match: AcademyMatches) => void;
  onEnterMatch?: (match: AcademyMatches) => void;
};

export const TournamentMatchCard = ({
  match,
  onEdit,
  onEnterMatch,
}: TournamentMatchCardProps) => {
  const { career, allCareers, allPlayersAcademy } = useAcademyContext();
  const opponentBadge = getOpponentBadge(allCareers, match.opponentTeam);

  return (
    <div className={Styles.matchCard}>
      <TournamentMatchHeader
        date={match.date}
        status={match.status}
        onEdit={onEdit ? () => onEdit(match) : undefined}
      />
      <TournamentMatchBody
        homeTeamName={career.clubName}
        homeTeamBadge={career.teamBadge}
        awayTeamName={match.opponentTeam}
        awayTeamBadge={opponentBadge}
        result={match.result}
        homeGoals={match.userGoals}
        awayGoals={match.opponentGoals}
        homePenalties={match.userPenalties}
        awayPenalties={match.opponentPenalties}
      />
      <TournamentMatchLineup lineup={match.lineup} allPlayersAcademy={allPlayersAcademy} />
      {onEnterMatch && (
        <TournamentMatchActions
          onEnterMatch={() => onEnterMatch(match)}
          hasLineup={match.lineup.length > 0}
        />
      )}
    </div>
  );
};
