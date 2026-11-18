import { createPortal } from "react-dom";
import Card from "../../../../../../../../../ui/Card";
import Styles from "./PlayerStats.module.css";
import StatisticsTable_Title from "../../../../../../../../../components/Statistics/StatisticsTable_Title";
import { useMemo, useState, useContext } from "react";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ServicePlayers } from "../../../../../../../../../common/services/ServicePlayers";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { sortLeaguesByLevel } from "../../../../../../../../../common/utils/Sorts";
import CalculatedStatistics from "../../../../../../../../../components/Statistics/CalculatedStatistics";
import Load from "../../../../../../../../../components/Load";
import { toRawPlayer } from "../../../../../../../../../common/stats/helpers/mergeMatchStats";
import { GroupCareerContext } from "../../../../../../../../../pages/GroupCareerPage/contexts/GroupCareerContext";
import {
  isSamePlayerId,
  getPlayerIdentityKey,
} from "../../../../../../../../../common/utils/playerIdentity";
import { formatPlayerName } from "../../../../../../../../../common/utils/formatPlayerName";
import { SectionScreen } from "../../../../../../../config/screens";
import { toast } from "../../../../../../../../../common/services/ToastService";

type PlayerStatsProps = {
  player: Players;
  career: Career;
  season: ClubData;
  isGeralPage: boolean;
  onEditPlayerStats: (playerId: string) => void;
  onUpdatePlayer?: (player: Players) => void;
  onOpenScreen?: (screen: SectionScreen) => void;
};

const PlayerStats = ({
  career,
  season,
  player,
  isGeralPage,
  onEditPlayerStats,
  onUpdatePlayer,
  onOpenScreen,
}: PlayerStatsProps) => {
  const [expand, setExpand] = useState(false);
  const isGoalkeeper = player.position === "GOL";
  const navigate = useNavigate();
  const location = useLocation();
  const { careerId } = useParams<{ careerId: string; groupId: string }>();
  const groupContext = useContext(GroupCareerContext);
  const [isDeletingLeague, setIsDeletingLeague] = useState(false);

  const handleDeleteLeague = async (leagueName: string): Promise<boolean> => {
    if (!player) return false;
    setIsDeletingLeague(true);
    try {
      await ServicePlayers.deleteLeagueStatsFromPlayer(
        career.id,
        season.id,
        player.id,
        leagueName,
      );
      return true;
    } catch (error) {
      console.error("Erro ao deletar a liga:", error);
      toast.error("Não foi possível remover a liga.");
      return false;
    } finally {
      setIsDeletingLeague(false);
    }
  };

  const handleDeleteLeagueAndSync = async (leagueName: string) => {
    const targetLeague = ((player as unknown as { aggregatedLeagues?: Array<{ leagueName: string; source: string }> }).aggregatedLeagues || []).find(
      (l) => l.leagueName === leagueName,
    );
    if (targetLeague?.source === "matches") {
      toast.info(
        `As estatísticas da competição "${leagueName}" são calculadas automaticamente a partir de partidas finalizadas e não podem ser excluídas por aqui. Para alterá-las ou removê-las, acesse a aba Partidas.`,
      );
      return;
    }

    const ok = await handleDeleteLeague(leagueName);
    if (ok) {
      const manualBase = player.manualStatsLeagues ?? player.statsLeagues;
      onUpdatePlayer?.({
        ...toRawPlayer(player),
        statsLeagues: manualBase.filter((l) => l.leagueName !== leagueName),
      });
      toast.success("Estatísticas da competição removidas com sucesso!");
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

        if (onOpenScreen && targetCareerId) {
          onOpenScreen({
            key: "player",
            playerId: targetPlayerId,
            careerId: targetCareerId,
            isNotSeason: true,
            isFromGroup: Boolean(resolvedGroupId),
            groupId: resolvedGroupId || undefined,
          });
          return;
        }

        if (resolvedGroupId) {
          navigate(
            `/Career/${targetCareerId}/Geral/Player/${targetPlayerId}?fromGroup=true&groupId=${resolvedGroupId}`,
          );
          return;
        }
      }

      if (onOpenScreen && targetCareerId) {
        onOpenScreen({
          key: "player",
          playerId: targetPlayerId,
          careerId: targetCareerId,
          isNotSeason: true,
          isFromGroup: false,
        });
        return;
      }

      navigate(`/Career/${targetCareerId}/Geral/Player/${targetPlayerId}`);
      return;
    }

    onEditPlayerStats(player.id);
  };

  return (
    <>
      <Card
        id={player.id ? `player-stat-${player.id}` : undefined}
        className={Styles.card}
      >
        <section
          className={isGeralPage ? Styles.section_geral : Styles.section}
          onClick={navigatePlayer}
        >
          <StatisticsTable_Title
            type="info"
            playerName={formatPlayerName(player.name)}
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
