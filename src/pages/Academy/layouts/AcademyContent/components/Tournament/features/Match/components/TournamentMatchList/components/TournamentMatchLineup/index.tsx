import {
  AcademyPlayers,
  PlayerMatchesStats,
} from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { AcademyMatchLineupList } from "../../../../../../../../ui/AcademyMatchLineupList";
import Styles from "./TournamentMatchLineup.module.css";

type TournamentMatchLineupProps = {
  lineup?: PlayerMatchesStats[];
  allPlayersAcademy: AcademyPlayers[];
};

export const TournamentMatchLineup = ({
  lineup,
  allPlayersAcademy,
}: TournamentMatchLineupProps) => {
  if (!lineup || lineup.length === 0) return null;

  return (
    <div className={Styles.lineupContainer}>
      <span className={Styles.title}>Escalação & Estatísticas</span>
      <div className={Styles.list}>
        <AcademyMatchLineupList
          players={lineup}
          allPlayersAcademy={allPlayersAcademy}
        />
      </div>
    </div>
  );
};
