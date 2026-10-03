import { createPortal } from "react-dom";
import Card from "../../../../../../../../../ui/Card";
import Styles from "./PlayerStats.module.css";
import StatisticsTable_Title from "../../../../../../../../../components/Statistics/StatisticsTable_Title";
import { useMemo, useRef, useState, useContext } from "react";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { usePlayerSeasonStats } from "../../../../../../../../../common/hooks/Players/UsePlayerSeasonStats";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { sortLeaguesByLevel } from "../../../../../../../../../common/utils/Sorts";
import CalculatedStatistics from "../../../../../../../../../components/Statistics/CalculatedStatistics";
import Load from "../../../../../../../../../components/Load";
import { toRawPlayer } from "../../../../../../../helpers/mergeMatchStats";
import { GroupCareerContext } from "../../../../../../../../../pages/GroupCareerPage/contexts/GroupCareerContext";
import {
  isSamePlayerId,
  getPlayerIdentityKey,
} from "../../../../../../../../../common/utils/playerIdentity";

type PlayerStatsProps = {
  player: Players;
  career: Career;
  season: ClubData;
  isGeralPage: boolean;
  onEditPlayerStats: (playerId: string) => void;
  onUpdatePlayer?: (player: Players) => void;
};

const PlayerStats = ({
  career,
  season,
  player,
  isGeralPage,
  onEditPlayerStats,
  onUpdatePlayer,
}: PlayerStatsProps) => {
  const [expand, setExpand] = useState(false);
  const isGoalkeeper = player.position === "GOL";
  const navigate = useNavigate();
  const location = useLocation();
  const { careerId } = useParams<{ careerId: string; groupId: string }>();
  const groupContext = useContext(GroupCareerContext);
  const leagueFormRef = useRef(null);

  const { handleDeleteLeague, isDeletingLeague } = usePlayerSeasonStats({
    career,
    season,
    player,
    leagueFormRef,
  });

  const handleDeleteLeagueAndSync = async (leagueName: string) => {
    const ok = await handleDeleteLeague(leagueName);
    if (ok) {
      const manualBase = player.manualStatsLeagues ?? player.statsLeagues;
      onUpdatePlayer?.({
        ...toRawPlayer(player),
        statsLeagues: manualBase.filter((l) => l.leagueName !== leagueName),
      });
    }
  };

  const sortedLeagues = useMemo(
    () => sortLeaguesByLevel(player.statsLeagues),
    [player.statsLeagues],
  );

  const navigatePlayer = () => {
    const isGroup = location.pathname.includes("/CareerGroup");
    let targetCareerId = careerId || career.id;
    let targetPlayerId = player.id;

    if (location.pathname.includes("/Geral")) {
      if (isGroup) {
        const groupMatch = location.pathname.match(/\/CareerGroup\/([^/]+)/);
        const resolvedGroupId = groupMatch ? groupMatch[1] : "";

        if (groupContext?.seasonsByCareer) {
          const targetKey = getPlayerIdentityKey(player);
          const isMatch = (p: Players) =>
            p.id === player.id ||
            isSamePlayerId(p, player) ||
            (Boolean(targetKey) && getPlayerIdentityKey(p) === targetKey);

          const matchingEntries = groupContext.seasonsByCareer.filter((entry) =>
            entry.season.players?.some(isMatch),
          );

          if (matchingEntries.length > 0) {
            const latestEntry = matchingEntries[matchingEntries.length - 1];
            targetCareerId = latestEntry.career.id;
            const playerInSeason = latestEntry.season.players.find(isMatch);
            if (playerInSeason?.id) {
              targetPlayerId = playerInSeason.id;
            }
          }
        }

        if (resolvedGroupId) {
          navigate(
            `/Career/${targetCareerId}/Geral/Player/${targetPlayerId}?fromGroup=true&groupId=${resolvedGroupId}`,
          );
          return;
        }
      }
      navigate(`/Career/${targetCareerId}/Geral/Player/${targetPlayerId}`);
      return;
    }

    onEditPlayerStats(player.id);
  };

  return (
    <>
      <Card className={Styles.card}>
        <section
          className={isGeralPage ? Styles.section_geral : Styles.section}
          onClick={navigatePlayer}
        >
          <StatisticsTable_Title
            type="info"
            playerName={player.name}
            overall={player.overall}
          />
          <CalculatedStatistics
            info
            total
            isGoalkeeper={isGoalkeeper}
            player={player}
          />
        </section>
        <section
          className={isGeralPage ? Styles.section_geral : Styles.section}
          onClick={() => setExpand(!expand)}
        >
          <StatisticsTable_Title
            setExpand={setExpand}
            expand={expand}
            type="expand"
          />
          <CalculatedStatistics
            total
            player={player}
            isGoalkeeper={isGoalkeeper}
          />
        </section>
        {expand && (
          <>
            {sortedLeagues.map((league) => (
              <section
                className={
                  isGeralPage
                    ? Styles.section_leagues_geral
                    : Styles.section_leagues
                }
                key={league.leagueName}
              >
                <StatisticsTable_Title
                  type="league"
                  leagueName={league.leagueName}
                  leagueImage={league.leagueImage}
                />
                <CalculatedStatistics
                  league
                  leagueStats={league}
                  isGoalkeeper={isGoalkeeper}
                  handleDeleteLeague={handleDeleteLeagueAndSync}
                />
              </section>
            ))}
          </>
        )}
      </Card>
      {isDeletingLeague && createPortal(<Load />, document.body)}
    </>
  );
};

export default PlayerStats;
