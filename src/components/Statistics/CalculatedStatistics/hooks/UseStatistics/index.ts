import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import Styles from "../../components/Statistic/CalculatedStatistics.module.css";
import { Players } from "../../../../../common/interfaces/playersInfo/players";
import { LeagueStats } from "../../../../../common/interfaces/playersStats/leagueStats";
import { calculateTotalStats } from "../../../../../layout/SectionView/features/ClubTabs/StatsTab_Club/components/PlayerStatsList/utils/calculateTotalStats";
import { isMetricEnabledForClubTab } from "../../../../../common/stats/registry/metricsRegistry";

type UseStatisticsProps = {
  total?: boolean;
  league?: boolean;
  isGoalkeeper?: boolean;
  player?: Players;
  leagueStats?: LeagueStats;
  handleDeleteLeague?: (leagueName: string) => void;
  isPlayer?: boolean;
};

export const useStatistics = ({
  total,
  league,
  isGoalkeeper,
  player,
  leagueStats,
  handleDeleteLeague,
  isPlayer,
}: UseStatisticsProps) => {
  const location = useLocation();
  const isGeralPage = location.pathname.includes("/Geral");

  const totalStats = useMemo(() => {
    if (!total || !player) return null;
    return calculateTotalStats(player);
  }, [player, total]);

  const statsData = useMemo(
    () => [
      {
        label: "Jogos",
        getValue: () => (total ? totalStats?.games : leagueStats?.stats.games),
      },
      {
        label: "Minutos",
        getValue: () =>
          total ? totalStats?.minutesPlayed : leagueStats?.stats.minutesPlayed,
      },
      {
        label: "Gols + Assistências",
        getValue: () =>
          total
            ? (totalStats?.goals ?? 0) + (totalStats?.assists ?? 0)
            : (leagueStats?.stats.goals ?? 0) +
              (leagueStats?.stats.assists ?? 0),
        hideForGoalkeeper: true,
      },
      {
        label: "Jogos Sem Sofrer Gols",
        getValue: () =>
          total ? totalStats?.cleanSheets : leagueStats?.stats.cleanSheets,
        showForGoalkeeper: true,
      },
      {
        label: "Gols",
        getValue: () => (total ? totalStats?.goals : leagueStats?.stats.goals),
        hideForGoalkeeper: true,
      },
      {
        label: "Defesas",
        getValue: () =>
          total ? totalStats?.defenses : leagueStats?.stats.defenses,
        showForGoalkeeper: true,
      },
      {
        label: "Assistências",
        getValue: () =>
          total ? totalStats?.assists : leagueStats?.stats.assists,
      },
      {
        label: "Média",
        getValue: () =>
          total ? totalStats?.averageRating : leagueStats?.stats.rating,
        className: !league ? Styles.rating : Styles.ratingLeague,
        getColor: true,
      },
      {
        label: "Bola de Ouro",
        getValue: () => player?.ballonDor,
        showOnlyForTotal: true,
        hideInGeralPage: true,
      },
      {
        label: "Deletar",
        showOnlyForLeague: true,
        onClick: () => {
          if (!leagueStats) return;

          const source = (leagueStats as { source?: "matches" | "manual" | "both" }).source;

          if (source === "matches") {
            alert(
              `As estatísticas da competição "${leagueStats.leagueName}" são calculadas automaticamente a partir de partidas finalizadas e não podem ser excluídas por aqui. Para alterá-las ou removê-las, acesse a aba Partidas.`,
            );
            return;
          }

          if (source === "both") {
            const confirmed = window.confirm(
              `Esta competição possui dados manuais e partidas disputadas.\n\nDeseja excluir apenas as anotações manuais da "${leagueStats.leagueName}"? Os números gerados a partir das partidas continuarão salvos normalmente.`,
            );
            if (confirmed) {
              handleDeleteLeague?.(leagueStats.leagueName);
            }
            return;
          }

          const confirmed = window.confirm(
            `Deseja excluir permanentemente as estatísticas manuais da "${leagueStats.leagueName}"?`,
          );
          if (confirmed) {
            handleDeleteLeague?.(leagueStats.leagueName);
          }
        },
      },
    ],
    [totalStats, leagueStats, total, league, player, handleDeleteLeague],
  );

  const filteredStats = useMemo(
    () =>
      statsData.filter((stat) => {
        if (isPlayer && stat.label === "Bola de Ouro") return false;
        if (
          stat.label === "Deletar" &&
          (isGeralPage || isPlayer || !handleDeleteLeague)
        )
          return false;

        if (isGeralPage && stat.hideInGeralPage) return false;
        if (stat.showOnlyForLeague && !league) return false;
        if (stat.showOnlyForTotal && !total) return false;

        // Filtro por registro central de métricas
        if (stat.label === "Jogos" && !isMetricEnabledForClubTab("matches")) return false;
        if (stat.label === "Minutos" && !isMetricEnabledForClubTab("minutesPlayed")) return false;
        if (
          stat.label === "Gols + Assistências" &&
          !isMetricEnabledForClubTab("goalContributions")
        )
          return false;
        if (
          stat.label === "Jogos Sem Sofrer Gols" &&
          !isMetricEnabledForClubTab("cleanSheets")
        )
          return false;
        if (stat.label === "Gols" && !isMetricEnabledForClubTab("goals")) return false;
        if (stat.label === "Defesas" && !isMetricEnabledForClubTab("defenses")) return false;
        if (stat.label === "Assistências" && !isMetricEnabledForClubTab("assists")) return false;
        if (stat.label === "Média" && !isMetricEnabledForClubTab("rating")) return false;

        if (isGoalkeeper) {
          return !stat.hideForGoalkeeper;
        } else {
          return !stat.showForGoalkeeper;
        }
      }),
    [
      statsData,
      isGeralPage,
      league,
      total,
      isGoalkeeper,
      isPlayer,
      handleDeleteLeague,
    ],
  );

  return { filteredStats };
};
