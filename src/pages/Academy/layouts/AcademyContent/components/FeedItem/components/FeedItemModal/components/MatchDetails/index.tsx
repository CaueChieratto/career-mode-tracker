import { Career } from "../../../../../../../../../../common/interfaces/Career";
import { getOpponentBadge } from "../../../../../Tournament/features/Match/components/TournamentMatchList/helpers/getOpponentBadge";
import { FeedEvent } from "../../../../types/FeedEvent";
import Styles from "./MatchDetails.module.css";
import { LineupList } from "./ui/LineupList";
import { ScoreBoard } from "./ui/ScoreBoard";
import { TournamentResult } from "./ui/TournamentResult";
import { AcademyPlayers } from "../../../../../../interfaces/AcademyPlayers/AcademyPlayers";

type MatchDetailsProps = {
  allCareers: Career[];
  details: NonNullable<FeedEvent["details"]>;
  clubName: string;
  teamBadge: string;
  allPlayersAcademy: AcademyPlayers[];
};

export const MatchDetails = ({
  allCareers,
  details,
  clubName,
  teamBadge,
  allPlayersAcademy,
}: MatchDetailsProps) => {
  const opponentBadge = getOpponentBadge(
    allCareers,
    details.opponentTeam ?? "",
  );

  return (
    <div className={Styles.matchDetails}>
      <TournamentResult details={details} />

      <ScoreBoard
        clubName={clubName}
        details={details}
        opponentBadge={opponentBadge}
        clubBadge={teamBadge}
      />

      <LineupList details={details} allPlayersAcademy={allPlayersAcademy} />
    </div>
  );
};
