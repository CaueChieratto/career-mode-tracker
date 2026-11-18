import React from "react";
import { Trophy } from "../../../../../common/interfaces/club/trophy";
import { LeagueStats } from "../../../../../common/interfaces/playersStats/leagueStats";
import CalculatedStatistics from "../../../../../components/Statistics/CalculatedStatistics";
import StatisticsTable_Title from "../../../../../components/Statistics/StatisticsTable_Title";
import NoTitleSeason from "./NoTitleSeason";
import LeagueStatsRow from "../SeasonsPlayerTab/components/LeagueStatsRow";
import Styles from "../PlayerTabs.module.css";

export type ExpandableLeagueStatsRowProps = {
  expandKey: string;
  leagueStats?: LeagueStats;
  fallbackLeagueName: string;
  isGoalkeeper: boolean;
  isExpanded: boolean;
  onToggleExpand: (key: string) => void;
  trophy?: Trophy;
  isTotal?: boolean;
};

const ExpandableLeagueStatsRow: React.FC<ExpandableLeagueStatsRowProps> = ({
  expandKey,
  leagueStats,
  fallbackLeagueName,
  isGoalkeeper,
  isExpanded,
  onToggleExpand,
  trophy,
  isTotal = false,
}) => (
  <>
    <section
      className={Styles.section}
      onClick={() => onToggleExpand(expandKey)}
    >
      <StatisticsTable_Title
        isPlayer
        type="expand"
        leagueImage={leagueStats?.leagueImage}
        leagueName={fallbackLeagueName}
        expand={isExpanded}
      />
      <CalculatedStatistics
        league
        isPlayer
        leagueStats={leagueStats}
        isGoalkeeper={isGoalkeeper}
      />
    </section>
    {isExpanded &&
      (trophy ? (
        <LeagueStatsRow
          isTotal={isTotal}
          leagueName={trophy.leagueName}
          leagueImage={trophy.leagueImage}
          trophy={isTotal ? trophy : undefined}
        />
      ) : (
        <NoTitleSeason text="Não ganhou a" leagueName={fallbackLeagueName} />
      ))}
  </>
);

export default ExpandableLeagueStatsRow;
