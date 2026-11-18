import { Trophy } from "../../../../../../common/interfaces/club/trophy";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { LeagueStats } from "../../../../../../common/interfaces/playersStats/leagueStats";
import ExpandableLeagueStatsRow from "../../components/ExpandableLeagueStatsRow";

type TrophyRowProps = {
  trophy?: Trophy;
  playerInSeason?: Players;
  seasonId: string;
  isExpanded: boolean;
  toggleExpand: (key: string) => void;
  leagueStats: LeagueStats;
};

const TrophyRow = ({
  trophy,
  playerInSeason,
  seasonId,
  isExpanded,
  toggleExpand,
  leagueStats,
}: TrophyRowProps) => {
  const trophyKey = `${seasonId}-${
    trophy?.leagueName ?? leagueStats.leagueName
  }`;
  const detailedLeagueStats = playerInSeason?.statsLeagues.find(
    (stats) => stats.leagueName === leagueStats.leagueName,
  );

  const isGoalkeeper = playerInSeason?.position === "GOL";

  return (
    <ExpandableLeagueStatsRow
      expandKey={trophyKey}
      leagueStats={detailedLeagueStats}
      fallbackLeagueName={leagueStats.leagueName}
      isGoalkeeper={isGoalkeeper}
      isExpanded={isExpanded}
      onToggleExpand={toggleExpand}
      trophy={trophy}
      isTotal={false}
    />
  );
};

export default TrophyRow;
