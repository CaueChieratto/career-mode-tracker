import { useState, useEffect } from "react";
import { Career } from "../../../interfaces/Career";
import { Players } from "../../../interfaces/playersInfo/players";
import { ServicePlayers } from "../../../services/ServicePlayers";
import { usePlayerGroupStatsContext } from "../../../../pages/Players/contexts/PlayerGroupStatsContext/context";

export const useGroupAggregatedPlayers = (
  career: Career,
  isGeralPage: boolean,
) => {
  const context = usePlayerGroupStatsContext();

  // Standalone state for when outside PlayerGroupStatsContext
  const [localGroupPlayers, setLocalGroupPlayers] = useState<Players[]>([]);
  const [localIsLoading, setLocalIsLoading] = useState(isGeralPage);

  // Standalone effect (only runs when NO context is present)
  useEffect(() => {
    if (context) return;

    const groupId = career?.groupId;
    const createdAt = career?.createdAt;

    if (!isGeralPage || !groupId || !createdAt) {
      setLocalIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLocalIsLoading(true);
      try {
        const aggregated = await ServicePlayers.getAggregatedGroupStats(
          groupId,
          createdAt,
        );
        setLocalGroupPlayers(aggregated);
      } catch (error) {
        console.error("Erro ao buscar estatísticas globais do grupo:", error);
      } finally {
        setLocalIsLoading(false);
      }
    };

    fetchStats();
  }, [career, isGeralPage, context]);

  const ensureGroupPlayers = context?.ensureGroupPlayers;

  // Context demand effect (runs when context IS present)
  useEffect(() => {
    if (
      ensureGroupPlayers &&
      isGeralPage &&
      career?.groupId &&
      career?.createdAt
    ) {
      ensureGroupPlayers(career, isGeralPage).catch(() => {});
    }
  }, [career, isGeralPage, ensureGroupPlayers]);

  // If outside provider, return standalone state
  if (!context) {
    return {
      groupPlayers: localGroupPlayers,
      isLoadingGroup: localIsLoading,
    };
  }

  // Inside provider: compute effective state for this component
  const queryKey =
    isGeralPage && career?.groupId && career?.createdAt
      ? `${career.groupId}__${career.createdAt}`
      : null;

  const isMatchingKey = context.key === queryKey;

  // Report loading if applicable and data not yet resolved
  const effectiveLoading =
    queryKey !== null &&
    (!isMatchingKey ||
      context.status === "idle" ||
      context.status === "loading" ||
      context.isLoadingGroup);

  return {
    groupPlayers:
      isMatchingKey && context.status === "success" ? context.groupPlayers : [],
    isLoadingGroup: effectiveLoading,
  };
};
