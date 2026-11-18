import { useCallback, useEffect, useState } from "react";
import type { Career } from "../../../../common/interfaces/Career";
import { ServicePlayers } from "../../../../common/services/ServicePlayers";
import { ServiceFinance } from "../../../../common/services/ServiceFinance";
import { ServiceMatches } from "../../../../common/services/ServiceMatches";
import {
  applyOptimisticUpdate,
  OptimisticUpdateData,
  replaceSeasonData,
} from "../../helpers/updateSectionCareer";
import { ServiceTable } from "../../../../common/services/ServiceTable";
import { TableRowData } from "../../../../common/interfaces/Table";

interface UseSectionCareerResult {
  localCareer: Career;
  refreshSeason: (targetSeasonId?: string) => Promise<void>;
  updateMatchesOptimistically: (
    optimisticData: OptimisticUpdateData,
    targetSeasonId?: string,
  ) => void;
}

export function useSectionCareer(
  career: Career,
  defaultSeasonId: string,
): UseSectionCareerResult {
  const [localCareer, setLocalCareer] = useState<Career>(career);

  useEffect(() => {
    setLocalCareer((previousCareer) => {
      if (previousCareer.id !== career.id) {
        return career;
      }

      const incomingTime = Number(career.updatedAt || 0);
      const localTime = Number(previousCareer.updatedAt || 0);
      const isIncomingNewer = incomingTime >= localTime;

      return {
        ...career,
        trophies: isIncomingNewer
          ? (career.trophies ?? previousCareer.trophies)
          : (previousCareer.trophies ?? career.trophies),
        clubData: career.clubData.map((incomingSeason) => {
          const localSeason = previousCareer.clubData.find(
            (season) => season.id === incomingSeason.id,
          );

          if (!localSeason) {
            return incomingSeason;
          }

          const resolveSubcollection = <T>(
            incoming: T[] | undefined,
            local: T[] | undefined,
          ): T[] | undefined => {
            if (isIncomingNewer) {
              if (Array.isArray(incoming) && incoming.length > 0) {
                return incoming;
              }
              return local ?? incoming;
            }
            return local ?? incoming;
          };

          return {
            ...incomingSeason,
            table: (resolveSubcollection(
              incomingSeason.table,
              localSeason.table,
            ) as unknown as typeof incomingSeason.table) ?? incomingSeason.table,
            matches:
              resolveSubcollection(
                incomingSeason.matches,
                localSeason.matches,
              ) ?? incomingSeason.matches,
            players:
              resolveSubcollection(
                incomingSeason.players,
                localSeason.players,
              ) ?? incomingSeason.players,
            teams: isIncomingNewer
              ? (incomingSeason.teams ?? localSeason.teams)
              : (localSeason.teams ?? incomingSeason.teams),
            financialReport: isIncomingNewer
              ? (incomingSeason.financialReport ?? localSeason.financialReport)
              : (localSeason.financialReport ?? incomingSeason.financialReport),
          };
        }),
      };
    });
  }, [career]);

  const refreshSeason = useCallback(
    async (targetSeasonId = defaultSeasonId) => {
      try {
        const targetSeason = career.clubData?.find((s) => s.id === targetSeasonId);
        const [matches, players, tableData] = await Promise.all([
          ServiceMatches.getMatchesBySeason(career.id, targetSeasonId),
          ServicePlayers.getPlayersBySeason(career.id, targetSeasonId),
          ServiceTable.getTableBySeason(career.id, targetSeasonId),
        ]);

        const seasonForFinance = targetSeason
          ? {
              ...targetSeason,
              players: players ?? targetSeason.players,
              matches: matches ?? targetSeason.matches,
            }
          : undefined;

        const financialReport = await ServiceFinance.getReportBySeason(
          career.id,
          targetSeasonId,
          targetSeason?.seasonNumber,
          seasonForFinance,
          career,
        );

        setLocalCareer((currentCareer) =>
          replaceSeasonData(
            currentCareer,
            targetSeasonId,
            {
              matches,
              players,
              table: tableData as unknown as TableRowData[],
              financialReport,
            },
            Date.now(),
          ),
        );
      } catch (erro) {
        console.error("Erro: ", erro);
      }
    },
    [career, defaultSeasonId],
  );

  const updateMatchesOptimistically = useCallback(
    (
      optimisticData: OptimisticUpdateData,
      targetSeasonId = defaultSeasonId,
    ) => {
      setLocalCareer((currentCareer) =>
        applyOptimisticUpdate(currentCareer, targetSeasonId, optimisticData),
      );
    },
    [defaultSeasonId],
  );

  return {
    localCareer,
    refreshSeason,
    updateMatchesOptimistically,
  };
}
