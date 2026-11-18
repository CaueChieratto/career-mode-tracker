import { Trophy } from "../../../../../../common/interfaces/club/trophy";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { LeagueStats } from "../../../../../../common/interfaces/playersStats/leagueStats";
import ExpandableLeagueStatsRow from "../../components/ExpandableLeagueStatsRow";

type LeagueStatsRowTotalProps = {
  leagueStats: LeagueStats;
  isExpanded: boolean;
  toggleExpand: (leagueName: string) => void;
  trophy?: Trophy;
  player?: Players;
};

const LeagueStatsRowTotal = ({
  leagueStats,
  isExpanded,
  toggleExpand,
  trophy,
  player,
}: LeagueStatsRowTotalProps) => {
  const isGoalkeeper = player?.position === "GOL";

  return (
    <ExpandableLeagueStatsRow
      expandKey={leagueStats.leagueName}
      leagueStats={leagueStats}
      fallbackLeagueName={leagueStats.leagueName}
      isGoalkeeper={isGoalkeeper}
      isExpanded={isExpanded}
      onToggleExpand={toggleExpand}
      trophy={trophy}
      isTotal
    />
  );
};

export default LeagueStatsRowTotal;
