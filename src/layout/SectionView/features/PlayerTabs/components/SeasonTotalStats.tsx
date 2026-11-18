import Styles from "../PlayerTabs.module.css";
import { FcCalculator } from "react-icons/fc";
import { useState } from "react";
import TrophyList from "../SeasonsPlayerTab/components/TrophyList";
import { Trophy } from "../../../../../common/interfaces/club/trophy";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import StatisticsTable_Title from "../../../../../components/Statistics/StatisticsTable_Title";
import CalculatedStatistics from "../../../../../components/Statistics/CalculatedStatistics";

type SeasonTotalStatsProps = {
  playerInSeason?: Players;
  trophiesWonInSeason: Trophy[];
  isTotal?: boolean;
};

const SeasonTotalStats = ({
  playerInSeason,
  trophiesWonInSeason,
  isTotal,
}: SeasonTotalStatsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!playerInSeason) {
    return null;
  }

  const isGoalkeeper = playerInSeason.position === "GOL";

  return (
    <>
      <section
        className={Styles.section}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <StatisticsTable_Title
          isPlayer
          type="expand"
          icon={<FcCalculator size={28} />}
          expand={isExpanded}
        />

        <CalculatedStatistics
          total
          isPlayer
          player={playerInSeason}
          isGoalkeeper={isGoalkeeper}
        />
      </section>
      {isExpanded && (
        <TrophyList
          isTotal={isTotal}
          trophies={trophiesWonInSeason}
          player={playerInSeason}
        />
      )}
    </>
  );
};

export default SeasonTotalStats;
