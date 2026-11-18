import { iconMap } from "../../../common/constants/StatsIconMap";
import { Players } from "../../../common/interfaces/playersInfo/players";
import { LeagueStats } from "../../../common/interfaces/playersStats/leagueStats";
import Statistic from "./components/Statistic";
import { useStatistics } from "./hooks/UseStatistics";

type CalculatedStatisticsProps = {
  info?: boolean;
  total?: boolean;
  league?: boolean;
  isPlayer?: boolean;
  isGoalkeeper?: boolean;
  player?: Players;
  leagueStats?: LeagueStats;
  handleDeleteLeague?: (leagueName: string) => void;
};

const CalculatedStatistics = (props: CalculatedStatisticsProps) => {
  const { filteredStats } = useStatistics(props);

  return (
    <>
      {filteredStats.map((stat, index) => (
        <Statistic
          key={index}
          label={stat.label}
          icon={!stat.showOnlyForLeague ? iconMap[stat.label] : undefined}
          deleteIcon={stat.showOnlyForLeague ? iconMap[stat.label] : undefined}
          value={"getValue" in stat ? stat.getValue?.() : undefined}
          isLeague={props.league}
          isInfo={props.info}
          getColor={stat.getColor}
          className={stat.className}
          onClick={stat.onClick}
          isPlayer={props.isPlayer}
        />
      ))}
    </>
  );
};

export default CalculatedStatistics;
