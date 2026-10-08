import { Players } from "../../../../../../../common/interfaces/playersInfo/players";
import { Match } from "../../../../../../../common/interfaces/Match";
import { League } from "../../../../../../../common/interfaces/League";
import { LeagueStats } from "../../../../../../../common/interfaces/playersStats/leagueStats";
import {
  matchPlayerStatToPlayer,
  isSamePlayerId,
} from "../../../../../../../common/utils/playerIdentity";
import {
  AggregatedClubPlayer,
  AggregatedLeagueStats,
  LeagueStatSource,
} from "../../types/clubStats.types";

interface PlayerMatchLeagueAccumulator {
  leagueName: string;
  leagueImage: string;
  games: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  defenses: number;
  minutesPlayed: number;
  ratingSum: number;
}

export interface AggregateSeasonClubStatsOptions {
  players: Players[];
  matches?: Match[];
  leagues?: League[];
  clubName: string;
}

export const getResilientMatchKey = (match: Match, fallbackIndex: number): string => {
  if (match.matchesId) return match.matchesId;
  if ((match as unknown as { id?: string }).id) return (match as unknown as { id?: string }).id as string;
  return `${match.date || ""}_${match.homeTeam || ""}_${match.awayTeam || ""}_${match.league || ""}_${fallbackIndex}`;
};

/**
 * Motor puro de agregação de estatísticas para o StatsTab_Club.
 *
 * Características arquiteturais:
 * 1. Não muta referências existentes (cria novas projeções).
 * 2. Filtro estrito: apenas partidas com status === "FINISHED" são computadas.
 * 3. Deduplicação resiliente com chave composta (nunca descarta partidas sem matchesId).
 * 4. Normalização textual de nomes de competição (evita ligas duplicadas por espaços/letras maiúsculas).
 * 5. Vinculação tolerante de atletas por ID, apelido de base e lineup.
 * 6. Marcação da origem dos dados (matches, manual, both) para orientar o comportamento da lixeira.
 */
export const aggregateSeasonClubStats = ({
  players,
  matches = [],
  leagues = [],
  clubName,
}: AggregateSeasonClubStatsOptions): AggregatedClubPlayer[] => {
  if (!players || players.length === 0) return [];

  // 1. Deduplicação de partidas com chave resiliente (preserva a versão mais recente)
  const uniqueMatchesMap = new Map<string, Match>();
  matches.forEach((m, idx) => {
    const key = getResilientMatchKey(m, idx);
    uniqueMatchesMap.set(key, m);
  });

  // 2. Filtro estrito: apenas partidas finalizadas contam estatísticas
  const finishedMatches = Array.from(uniqueMatchesMap.values()).filter(
    (m) => m.status === "FINISHED",
  );

  // Mapa de logo das ligas por nome normalizado
  const leagueLogoMap = new Map<string, string>();
  leagues.forEach((l) => {
    if (l.name) {
      leagueLogoMap.set(l.name.trim().toLowerCase(), l.logo || "");
    }
  });

  // 3. Acumulador de estatísticas de partidas: playerId -> normalizedLeagueName -> PlayerMatchLeagueAccumulator
  const playerMatchStatsByPlayerId = new Map<
    string,
    Map<string, PlayerMatchLeagueAccumulator>
  >();

  finishedMatches.forEach((match) => {
    const rawLeagueName = match.league ? match.league.trim() : "";
    if (!rawLeagueName) return;

    const normLeagueKey = rawLeagueName.toLowerCase();
    const leagueLogo = leagueLogoMap.get(normLeagueKey) || "";

    const isHome = match.homeTeam === clubName;
    const concededGoals = isHome ? match.awayScore || 0 : match.homeScore || 0;
    const earnedCleanSheet = concededGoals === 0 ? 1 : 0;

    (match.playerStats || []).forEach((pStat) => {
      // Identifica o atleta no elenco
      let matchedPlayer = matchPlayerStatToPlayer(pStat.playerId, players);
      if (!matchedPlayer && (match as unknown as { lineup?: Array<{ id?: string; playerId?: string; name?: string }> }).lineup) {
        const lineupPlayer = (match as unknown as { lineup: Array<{ id?: string; playerId?: string; name?: string }> }).lineup.find(
          (lp) => lp.id === pStat.playerId || lp.playerId === pStat.playerId,
        );
        if (lineupPlayer?.name) {
          const normName = lineupPlayer.name.trim().toLowerCase();
          matchedPlayer = players.find(
            (p) => p.name?.trim().toLowerCase() === normName,
          );
        }
      }

      if (!matchedPlayer) return;

      const playerId = matchedPlayer.id;
      if (!playerMatchStatsByPlayerId.has(playerId)) {
        playerMatchStatsByPlayerId.set(playerId, new Map());
      }
      const playerLeagues = playerMatchStatsByPlayerId.get(playerId)!;

      if (!playerLeagues.has(normLeagueKey)) {
        playerLeagues.set(normLeagueKey, {
          leagueName: rawLeagueName,
          leagueImage: leagueLogo,
          games: 0,
          goals: 0,
          assists: 0,
          cleanSheets: 0,
          defenses: 0,
          minutesPlayed: 0,
          ratingSum: 0,
        });
      }

      const acc = playerLeagues.get(normLeagueKey)!;
      acc.games += 1;
      acc.goals += pStat.goals || 0;
      acc.assists += pStat.assists || 0;
      acc.cleanSheets += earnedCleanSheet;
      acc.minutesPlayed += pStat.minutesPlayed || 0;
      acc.defenses += pStat.defenses || 0;
      acc.ratingSum += pStat.rating || 0;
      if (!acc.leagueImage && leagueLogo) {
        acc.leagueImage = leagueLogo;
      }
    });
  });

  // 4. Projeção final de cada atleta combinando manual + partidas
  return players.map((player) => {
    const manualLeagues: LeagueStats[] =
      player.manualStatsLeagues ?? player.statsLeagues ?? [];

    const mergedLeagueMap = new Map<
      string,
      {
        leagueName: string;
        leagueImage: string;
        manual?: LeagueStats["stats"];
        match?: PlayerMatchLeagueAccumulator;
      }
    >();

    // Insere ligas manuais no mapa
    manualLeagues.forEach((m) => {
      const key = (m.leagueName || "").trim().toLowerCase();
      mergedLeagueMap.set(key, {
        leagueName: m.leagueName,
        leagueImage: m.leagueImage || leagueLogoMap.get(key) || "",
        manual: { ...m.stats },
        match: undefined,
      });
    });

    // Mescla ligas de partidas
    const playerMatches = playerMatchStatsByPlayerId.get(player.id);
    if (playerMatches) {
      playerMatches.forEach((mStat, key) => {
        const existing = mergedLeagueMap.get(key);
        if (existing) {
          existing.match = mStat;
          if (!existing.leagueImage && mStat.leagueImage) {
            existing.leagueImage = mStat.leagueImage;
          }
        } else {
          mergedLeagueMap.set(key, {
            leagueName: mStat.leagueName,
            leagueImage: mStat.leagueImage || leagueLogoMap.get(key) || "",
            manual: undefined,
            match: mStat,
          });
        }
      });
    }

    // Calcula os números finais por liga com source tagging
    const aggregatedLeagues: AggregatedLeagueStats[] = Array.from(
      mergedLeagueMap.values(),
    ).map((entry) => {
      const manualStats = entry.manual;
      const matchStats = entry.match;

      const manualGames = manualStats?.games || 0;
      const matchGames = matchStats?.games || 0;
      const totalGames = manualGames + matchGames;

      const goals = (manualStats?.goals || 0) + (matchStats?.goals || 0);
      const assists = (manualStats?.assists || 0) + (matchStats?.assists || 0);
      const cleanSheets =
        (manualStats?.cleanSheets || 0) + (matchStats?.cleanSheets || 0);
      const minutesPlayed =
        (manualStats?.minutesPlayed || 0) + (matchStats?.minutesPlayed || 0);
      const defenses =
        (manualStats?.defenses || 0) + (matchStats?.defenses || 0);

      const manualRatingSum = (manualStats?.rating || 0) * manualGames;
      const matchRatingSum = matchStats?.ratingSum || 0;
      const totalRatingSum = manualRatingSum + matchRatingSum;

      const averageRating =
        totalGames > 0
          ? Number((totalRatingSum / totalGames).toFixed(2))
          : 0;

      const hasManual = Boolean(manualStats);
      const hasMatch = Boolean(matchStats && matchStats.games > 0);

      let source: LeagueStatSource = "manual";
      if (hasManual && hasMatch) {
        source = "both";
      } else if (hasMatch) {
        source = "matches";
      } else {
        source = "manual";
      }

      return {
        leagueName: entry.leagueName,
        leagueImage: entry.leagueImage || "",
        stats: {
          games: totalGames,
          goals,
          assists,
          cleanSheets,
          rating: averageRating,
          minutesPlayed,
          defenses,
        },
        source,
        ratingSum: totalRatingSum,
        matchGamesCount: matchGames,
        manualGamesCount: manualGames,
      };
    });

    const hasAnyStats =
      aggregatedLeagues.some(
        (l) =>
          (l.stats.games || 0) > 0 ||
          (l.stats.minutesPlayed || 0) > 0 ||
          (l.stats.goals || 0) > 0 ||
          (l.stats.assists || 0) > 0 ||
          (l.stats.cleanSheets || 0) > 0 ||
          (l.stats.defenses || 0) > 0,
      ) || manualLeagues.length > 0;

    return {
      ...player,
      statsLeagues: aggregatedLeagues,
      manualStatsLeagues: manualLeagues,
      aggregatedLeagues,
      hasAnyStats,
    };
  });
};

/**
 * Filtra atletas superseded (vendidos/substituídos na mesma temporada)
 */
export const filterSupersededPlayers = (
  players: AggregatedClubPlayer[],
): AggregatedClubPlayer[] => {
  return players.filter((p) => {
    const isSuperseded = players.some((other) => {
      if (other.id === p.id) return false;
      if (other.playedWithUs === p.id) return true;
      if (!other.sell && p.sell && isSamePlayerId(other, p)) return true;
      if (
        Boolean(other.playedWithUs) &&
        isSamePlayerId(other, p) &&
        (!other.sell || (other.overall || 0) >= (p.overall || 0))
      ) {
        return true;
      }
      return false;
    });
    return !isSuperseded;
  });
};
