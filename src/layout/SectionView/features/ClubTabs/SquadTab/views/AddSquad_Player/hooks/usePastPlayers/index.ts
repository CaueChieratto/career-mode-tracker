import { useState, useEffect, useMemo } from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { ServicePlayers } from "../../../../../../../../../common/services/ServicePlayers";
import {
  getPlayerIdentityKey,
  isSamePlayerId,
} from "../../../../../../../../../common/utils/playerIdentity";

export const usePastPlayers = (
  career: Career,
  season: ClubData,
  isEditing: boolean,
  currentPlayer?: Players,
) => {
  const [groupPlayers, setGroupPlayers] = useState<Players[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchGroupPlayers = async () => {
      if (career?.groupId && career?.createdAt && career?.id) {
        const cacheKey = `pastPlayers_${career.groupId}_${career.id}`;
        const cachedData = sessionStorage.getItem(cacheKey);

        if (cachedData) {
          try {
            if (isMounted) {
              setGroupPlayers(JSON.parse(cachedData) as Players[]);
            }
            return;
          } catch {
            sessionStorage.removeItem(cacheKey);
          }
        }

        try {
          const players = await ServicePlayers.getPastGroupPlayers(
            career.groupId,
            career.createdAt,
            career.id,
          );
          if (isMounted) {
            setGroupPlayers(players);
            sessionStorage.setItem(cacheKey, JSON.stringify(players));
          }
        } catch (error) {
          console.error("Erro ao buscar jogadores do grupo:", error);
        }
      }
    };

    fetchGroupPlayers();
    return () => {
      isMounted = false;
    };
  }, [career?.groupId, career?.createdAt, career?.id]);

  const { pastPlayers, pastPlayerOptions } = useMemo(() => {
    const rawCandidates: Players[] = [];

    if (career?.clubData) {
      const sortedSeasons = [...career.clubData].sort(
        (a, b) => a.seasonNumber - b.seasonNumber,
      );
      for (const s of sortedSeasons) {
        for (const p of s.players || []) {
          if (p.sell) {
            rawCandidates.push(p);
          }
        }
      }
    }

    if (season?.players) {
      for (const p of season.players) {
        if (p.sell) {
          rawCandidates.push(p);
        }
      }
    }

    for (const gp of groupPlayers) {
      rawCandidates.push(gp);
    }

    const deduplicatedMap = new Map<string, Players>();
    for (const p of rawCandidates) {
      const key = getPlayerIdentityKey(p, career?.id);
      const existing = deduplicatedMap.get(key);
      if (!existing || (p.overall || 0) >= (existing.overall || 0)) {
        deduplicatedMap.set(key, p);
      }
    }

    const otherActivePlayers = (season?.players || []).filter(
      (p) =>
        !p.sell &&
        (!isEditing || (currentPlayer && p.id !== currentPlayer.id)),
    );

    const available = Array.from(deduplicatedMap.values()).filter(
      (candidate) => {
        if (isEditing && currentPlayer && candidate.id === currentPlayer.id) {
          return false;
        }

        const isAlreadyActive = otherActivePlayers.some(
          (active) =>
            isSamePlayerId(active, candidate) ||
            (active.name.trim().toLowerCase() ===
              candidate.name.trim().toLowerCase() &&
              active.nation.trim().toLowerCase() ===
                candidate.nation.trim().toLowerCase()),
        );

        return !isAlreadyActive;
      },
    );

    available.sort((a, b) => a.name.localeCompare(b.name));

    return {
      pastPlayers: available,
      pastPlayerOptions: available.map((p) => p.name),
    };
  }, [career, season, groupPlayers, isEditing, currentPlayer]);

  return { pastPlayers, pastPlayerOptions };
};
