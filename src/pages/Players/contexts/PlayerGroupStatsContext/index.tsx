import { useRef, useState, useCallback, useMemo, ReactNode } from "react";
import { Career } from "../../../../common/interfaces/Career";
import { Players } from "../../../../common/interfaces/playersInfo/players";
import { ServicePlayers } from "../../../../common/services/ServicePlayers";
import {
  GroupStatsStatus,
  PlayerGroupStatsContext,
  PlayerGroupStatsContextValue,
} from "./context";

export interface PlayerGroupStatsProviderProps {
  career?: Career;
  isGeralPage?: boolean;
  children: ReactNode;
}

export const PlayerGroupStatsProvider = ({
  career,
  isGeralPage = false,
  children,
}: PlayerGroupStatsProviderProps) => {
  const [groupPlayers, setGroupPlayers] = useState<Players[]>([]);
  const [isLoadingGroup, setIsLoadingGroup] = useState<boolean>(false);
  const [status, setStatus] = useState<GroupStatsStatus>("idle");
  const [error, setError] = useState<Error | null>(null);

  const queryKey =
    isGeralPage && career?.groupId && career?.createdAt
      ? `${career.groupId}__${career.createdAt}`
      : null;

  const currentKeyRef = useRef<string | null>(queryKey);
  const statusRef = useRef<GroupStatsStatus>("idle");
  const groupPlayersRef = useRef<Players[]>([]);
  const inFlightPromiseRef = useRef<Promise<Players[]> | null>(null);
  const requestIdRef = useRef<number>(0);

  statusRef.current = status;
  groupPlayersRef.current = groupPlayers;

  // Invalidate and reset when query key changes from props
  if (currentKeyRef.current !== queryKey) {
    currentKeyRef.current = queryKey;
    inFlightPromiseRef.current = null;
    requestIdRef.current++;
    statusRef.current = "idle";
    groupPlayersRef.current = [];
    setGroupPlayers([]);
    setIsLoadingGroup(false);
    setStatus("idle");
    setError(null);
  }

  const ensureGroupPlayers = useCallback(
    async (
      targetCareer: Career,
      targetIsGeralPage: boolean,
    ): Promise<Players[]> => {
      const targetGroupId = targetCareer?.groupId;
      const targetCreatedAt = targetCareer?.createdAt;

      if (!targetIsGeralPage || !targetGroupId || !targetCreatedAt) {
        return [];
      }

      const targetKey = `${targetGroupId}__${targetCreatedAt}`;

      // Invalidate if different from active key
      if (currentKeyRef.current !== targetKey) {
        currentKeyRef.current = targetKey;
        inFlightPromiseRef.current = null;
        requestIdRef.current++;
        statusRef.current = "idle";
        groupPlayersRef.current = [];
        setGroupPlayers([]);
        setIsLoadingGroup(false);
        setStatus("idle");
        setError(null);
      }

      // If already successfully loaded for this exact key, return cached data
      if (
        statusRef.current === "success" &&
        currentKeyRef.current === targetKey
      ) {
        return groupPlayersRef.current;
      }

      // If equivalent fetch is already in flight for this exact key, deduplicate and reuse promise
      if (inFlightPromiseRef.current && currentKeyRef.current === targetKey) {
        return inFlightPromiseRef.current;
      }

      // Initiate new on-demand fetch
      const currentRequestId = ++requestIdRef.current;
      statusRef.current = "loading";
      setStatus("loading");
      setIsLoadingGroup(true);
      setError(null);

      const promise = (async () => {
        try {
          console.log(
            "[PERF_GROUP_STATS] getAggregatedGroupStats called",
            targetGroupId,
          );
          const aggregated = await ServicePlayers.getAggregatedGroupStats(
            targetGroupId,
            targetCreatedAt,
          );
          if (requestIdRef.current === currentRequestId) {
            groupPlayersRef.current = aggregated;
            statusRef.current = "success";
            inFlightPromiseRef.current = null;
            setGroupPlayers(aggregated);
            setIsLoadingGroup(false);
            setStatus("success");
          }
          return aggregated;
        } catch (err) {
          if (requestIdRef.current === currentRequestId) {
            const errorObj =
              err instanceof Error ? err : new Error(String(err));
            statusRef.current = "error";
            inFlightPromiseRef.current = null;
            setError(errorObj);
            setIsLoadingGroup(false);
            setStatus("error");
            console.error("Erro ao buscar estatísticas globais do grupo:", err);
          }
          return [];
        }
      })();

      inFlightPromiseRef.current = promise;
      return promise;
    },
    [],
  );

  const contextValue: PlayerGroupStatsContextValue = useMemo(
    () => ({
      groupPlayers,
      isLoadingGroup,
      status,
      key: currentKeyRef.current,
      error,
      ensureGroupPlayers,
    }),
    [groupPlayers, isLoadingGroup, status, error, ensureGroupPlayers],
  );

  return (
    <PlayerGroupStatsContext.Provider value={contextValue}>
      {children}
    </PlayerGroupStatsContext.Provider>
  );
};
