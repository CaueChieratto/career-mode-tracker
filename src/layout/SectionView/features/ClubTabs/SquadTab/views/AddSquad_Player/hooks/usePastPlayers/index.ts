import { useState, useEffect, useMemo } from "react";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { Players } from "../../../../../../../../../common/interfaces/playersInfo/players";
import { ServicePlayers } from "../../../../../../../../../common/services/ServicePlayers";
import {
  getPlayerIdentityKey,
  isSamePlayerId,
} from "../../../../../../../../../common/utils/playerIdentity";

const isExitRecord = (p: Players): boolean => {
  if (p.sell) return true;
  const exitContracts = (p.contract || []).filter(
    (c) => Boolean(c.leftClub) && !c.isLoan,
  );
  return exitContracts.length > 0;
};

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
    // 1. Jogadores atualmente ativos no squadTab da temporada atual
    // Quando em edição de currentPlayer, ele não entra na lista de bloqueadores ativos
    const otherActivePlayers = (season?.players || []).filter(
      (p) =>
        !p.sell && (!isEditing || (currentPlayer && p.id !== currentPlayer.id)),
    );

    const isAlreadyActive = (candidate: Players): boolean => {
      return otherActivePlayers.some(
        (active) =>
          isSamePlayerId(active, candidate) ||
          (active.name.trim().toLowerCase() ===
            candidate.name.trim().toLowerCase() &&
            active.nation.trim().toLowerCase() ===
              candidate.nation.trim().toLowerCase()),
      );
    };

    // 2. Coletar todas as temporadas da carreira
    const allSeasonsMap = new Map<string, ClubData>();
    if (career?.clubData) {
      for (const s of career.clubData) {
        if (s.id) allSeasonsMap.set(s.id, s);
      }
    }
    if (season?.id) {
      allSeasonsMap.set(season.id, season);
    }
    const allSeasons = Array.from(allSeasonsMap.values());
    if (season && !allSeasons.some((s) => s.id === season.id)) {
      allSeasons.push(season);
    }

    // 3. Mapear jogadores que tiveram saída registrada em QUALQUER temporada
    const playersWithExit = new Set<string>();
    for (const s of allSeasons) {
      for (const p of s.players || []) {
        if (isExitRecord(p)) {
          playersWithExit.add(getPlayerIdentityKey(p, career?.id));
        }
      }
    }

    // 4. Coletar candidatos elegíveis:
    //    - Jogadores que saíram do time (hasExit === true)
    //    - Casos de bugs (jogadores de temporadas passadas que nunca tiveram saída registrada em nenhuma temporada, e não estão mais ativos no squadTab)
    const rawCandidates: Players[] = [];

    for (const s of allSeasons) {
      const isPastSeason =
        Boolean(season?.id && s.id !== season.id) ||
        Boolean(season?.seasonNumber && s.seasonNumber < season.seasonNumber);

      for (const p of s.players || []) {
        const key = getPlayerIdentityKey(p, career?.id);
        const hasExit = playersWithExit.has(key);

        if (hasExit) {
          rawCandidates.push({
            ...p,
            originCareerId: p.originCareerId || career?.id,
          });
        } else if (isPastSeason && !isAlreadyActive(p)) {
          rawCandidates.push({
            ...p,
            originCareerId: p.originCareerId || career?.id,
          });
        }
      }
    }

    // 5. Incluir jogadores de outros clubes do grupo
    for (const gp of groupPlayers) {
      rawCandidates.push(gp);
    }

    // 6. Deduplicação por chave de identidade canônica mantendo maior overall
    const deduplicatedMap = new Map<string, Players>();
    for (const p of rawCandidates) {
      const key = getPlayerIdentityKey(p, career?.id);
      const existing = deduplicatedMap.get(key);
      if (!existing || (p.overall || 0) >= (existing.overall || 0)) {
        deduplicatedMap.set(key, {
          ...p,
          originCareerId: p.originCareerId || existing?.originCareerId,
        });
      }
    }

    // 7. Filtro final: não pode ser o próprio jogador sendo editado e não pode estar atualmente ativo no squadTab
    const available = Array.from(deduplicatedMap.values()).filter(
      (candidate) => {
        if (isEditing && currentPlayer && candidate.id === currentPlayer.id) {
          return false;
        }

        return !isAlreadyActive(candidate);
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
