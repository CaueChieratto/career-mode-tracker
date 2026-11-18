import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSeasonData } from "../../../../common/hooks/Seasons/UseSeasonData";
import { Match } from "../../../../common/interfaces/Match";
import { PlayerMatchStat } from "../../../../common/interfaces/PlayerMatchStat";
import { ServiceMatches } from "../../../../common/services/ServiceMatches";

export const useMatchData = () => {
  const { careerId, seasonId, matchesId } = useParams<{
    careerId: string;
    seasonId: string;
    matchesId: string;
  }>();

  const navigate = useNavigate();
  const location = useLocation();
  const isFromGeral = location.search.includes("fromGeral=true");

  const {
    career,
    season,
    loading: seasonLoading,
  } = useSeasonData(careerId, seasonId);
  const initialMatch = season?.matches?.find((m) => m.matchesId === matchesId);

  const [match, setMatch] = useState<Match | undefined>(initialMatch);
  const [loading, setLoading] = useState(true);

  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSubcollectionStats = useCallback(async () => {
    if (seasonLoading) return;

    const currentRequestId = ++requestIdRef.current;

    if (!initialMatch || !careerId || !seasonId || !matchesId) {
      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        setMatch(initialMatch);
        setLoading(false);
      }
      return;
    }

    try {
      const subcollectionStats = await ServiceMatches.getMatchPlayerStats(
        careerId,
        seasonId,
        matchesId,
      );

      if (currentRequestId !== requestIdRef.current || !isMountedRef.current) return;

      if (subcollectionStats.length === 0) {
        setMatch((prev) => prev ?? initialMatch);
      } else {
        const statsMap = new Map<string, PlayerMatchStat>();

        if (initialMatch.playerStats) {
          initialMatch.playerStats.forEach((stat) =>
            statsMap.set(stat.playerId, stat),
          );
        }

        subcollectionStats.forEach((stat) => statsMap.set(stat.playerId, stat));

        setMatch((prev) => ({
          ...(prev ?? initialMatch),
          playerStats: Array.from(statsMap.values()),
        }));
      }
    } catch (error) {
      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        console.error("Erro ao buscar as estatísticas da subcoleção:", error);
        setMatch((prev) => prev ?? initialMatch);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [initialMatch, careerId, seasonId, matchesId, seasonLoading]);

  useEffect(() => {
    fetchSubcollectionStats();
  }, [fetchSubcollectionStats]);

  const goBack = () => {
    if (isFromGeral) {
      navigate(`/Career/${careerId}/Geral`);
    } else {
      navigate(`/Career/${careerId}/Season/${seasonId}`);
    }
  };

  const updateLocalMatch = useCallback((updatedFields: Partial<Match>) => {
    requestIdRef.current++;
    setMatch((prev) => (prev ? { ...prev, ...updatedFields } : prev));
  }, []);

  return {
    careerId,
    matchesId,
    career,
    season,
    match,
    loading: seasonLoading || loading,
    goBack,
    isFromGeral,
    updateLocalMatch,
  };
};
