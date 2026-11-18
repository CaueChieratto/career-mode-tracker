import { FaTrophy } from "react-icons/fa";
import { AcademyTournaments } from "../../../../../../../../common/interfaces/AcademyData";
import { AcademyListItem } from "../../../AcademyListItem";
import { DefaultCircle } from "../../../../ui/DefaultCircle";
import { InfoItem } from "../../../../ui/InfoItem";

type TournamentListItemProps = {
  tournament: AcademyTournaments;
  onClick?: () => void;
  isSelected?: boolean;
};

export const TournamentListItem = ({
  tournament,
  onClick,
  isSelected,
}: TournamentListItemProps) => {
  const currentStatus =
    tournament.matches && tournament.matches.length > 0
      ? tournament.matches[tournament.matches.length - 1].status ||
        tournament.tournamentResult
      : tournament.tournamentResult;

  return (
    <AcademyListItem
      isSelected={isSelected}
      onClick={onClick}
      iconNode={
        <DefaultCircle isActive={isSelected}>
          <FaTrophy size={14} />
        </DefaultCircle>
      }
      title={tournament.name}
      subtitle={`Início: ${tournament.date}`}
      rightContent={
        <>
          <InfoItem isTitle>Status</InfoItem>
          <InfoItem>
            {tournament.isFinished ? (
              <span>{tournament.tournamentResult}</span>
            ) : (
              <span>{currentStatus}</span>
            )}
          </InfoItem>
        </>
      }
    />
  );
};
