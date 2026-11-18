import { useState, useCallback, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import { AcademyService } from "../../services/AcademyService";
import { AcademyPlayers } from "../../../../../../common/interfaces/AcademyData";
import { Career } from "../../../../../../common/interfaces/Career";

export const useAcademyPlayers = (
  career: Career,
  seasonId: string,
  isGeral?: boolean,
) => {
  const [allPlayersAcademy, setAllPlayersAcademy] = useState<AcademyPlayers[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlayers = useCallback(
    async (isSilentUpdate = false) => {
      if (!isSilentUpdate) {
        setIsLoading(true);
      }

      try {
        if (isGeral) {
          const promises = career.clubData.map(async (season) => {
            const players = await AcademyService.getPlayersAcademy(
              career.id,
              season.id,
            );
            return players.map((p) => ({ ...p, seasonId: season.id }));
          });

          const results = await Promise.all(promises);

          const allPlayersMap = new Map<string, AcademyPlayers>();

          results.forEach((data) => {
            data.forEach((player) => {
              if (allPlayersMap.has(player.id)) {
                const existingPlayer = allPlayersMap.get(player.id)!;
                const combinedHistory = [
                  ...(existingPlayer.evolutionHistory || []),
                  ...(player.evolutionHistory || []),
                ];

                const uniqueHistory = Array.from(
                  new Map(
                    combinedHistory.map((item) => [item.id, item]),
                  ).values(),
                );

                allPlayersMap.set(player.id, {
                  ...player,
                  evolutionHistory: uniqueHistory,
                });
              } else {
                allPlayersMap.set(player.id, player);
              }
            });
          });

          const aggregatedPlayers = Array.from(allPlayersMap.values());
          setAllPlayersAcademy(aggregatedPlayers);
        } else {
          const data = await AcademyService.getPlayersAcademy(
            career.id,
            seasonId,
          );
          setAllPlayersAcademy(data);
        }
      } catch (error) {
        console.error("Erro ao carregar jogadores da academia:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [career, seasonId, isGeral],
  );

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const playersAcademy = useMemo(() => {
    return allPlayersAcademy.filter(
      (player) => player.status !== "released" && player.status !== "promoted",
    );
  }, [allPlayersAcademy]);

  const setPlayersAcademy: Dispatch<SetStateAction<AcademyPlayers[]>> =
    useCallback((action) => {
      setAllPlayersAcademy((current) => {
        const next = typeof action === "function" ? action(current) : action;
        return next;
      });
    }, []);

  const applyPromotedPlayer = useCallback((promoted: AcademyPlayers) => {
    setAllPlayersAcademy((current) =>
      current.map((player) =>
        player.id === promoted.id ? promoted : player,
      ),
    );
  }, []);

  return {
    playersAcademy,
    allPlayersAcademy,
    isLoading,
    setPlayersAcademy,
    applyPromotedPlayer,
    refetchPlayers: fetchPlayers,
  };
};
