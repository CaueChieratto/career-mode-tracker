import { FeedEvent } from "../../../../../../types/FeedEvent";
import Styles from "./LineupList.module.css";
import { AcademyPlayers } from "../../../../../../../../../../../../common/interfaces/AcademyData";
import { AcademyMatchLineupList } from "../../../../../../../../ui/AcademyMatchLineupList";

type LineupListProps = {
  details: NonNullable<FeedEvent["details"]>;
  allPlayersAcademy: AcademyPlayers[];
};

export const LineupList = ({ details, allPlayersAcademy }: LineupListProps) => {
  const playersWithStats = (details.lineup || []).filter(
    (p) => p.rating !== null || (p.goals && p.goals > 0),
  );

  return (
    <>
      {playersWithStats.length > 0 && (
        <div className={Styles.lineupList}>
          <strong>Destaques da Partida:</strong>
          <AcademyMatchLineupList
            players={playersWithStats}
            allPlayersAcademy={allPlayersAcademy}
          />
        </div>
      )}
    </>
  );
};
