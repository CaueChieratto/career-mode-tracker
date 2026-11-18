import {
  doc,
  runTransaction,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../../../../common/services/Firebase";
import { PlayerMatchStat } from "../../../../common/interfaces/PlayerMatchStat";
import { SavedLineup } from "../../../../common/interfaces/Lineup";
import { Match } from "../../../../common/interfaces/Match";
import { getLineupPlayerIds } from "../../components/LineupTab/helpers/getLineupPlayerIds";
import {
  isQuotaExceededActive,
  isQuotaExceededError,
  markQuotaExceeded,
} from "../../../../common/utils/firestoreRetry";
import { updateCareerFirestore } from "../../../../common/helpers/Setters";

const saveLineupDirectly = async (
  userUid: string,
  careerId: string,
  seasonId: string,
  matchesId: string,
  lineup: SavedLineup,
  playerStats: PlayerMatchStat[],
  removedPlayerIds: string[] = [],
): Promise<PlayerMatchStat[]> => {
  const matchRef = doc(
    db,
    `users/${userUid}/careers/${careerId}/seasons/${seasonId}/matches`,
    matchesId,
  );
  const careerRef = doc(db, `users/${userUid}/careers/${careerId}`);

  const activePlayerIds = getLineupPlayerIds(lineup);
  const statsMap = new Map<string, PlayerMatchStat>(
    playerStats.map((stat) => [stat.playerId, stat]),
  );

  const effectiveRemovedIds = new Set<string>();
  for (const id of removedPlayerIds) {
    if (!activePlayerIds.has(id)) {
      effectiveRemovedIds.add(id);
    }
  }
  for (const [id] of statsMap) {
    if (!activePlayerIds.has(id)) {
      effectiveRemovedIds.add(id);
    }
  }

  for (const id of effectiveRemovedIds) {
    statsMap.delete(id);
  }

  const finalStats = Array.from(statsMap.values());

  const batch = writeBatch(db);
  for (const playerId of effectiveRemovedIds) {
    batch.delete(doc(matchRef, "playerStats", playerId));
  }
  for (const stat of finalStats) {
    batch.set(doc(matchRef, "playerStats", stat.playerId), stat, {
      merge: true,
    });
  }
  batch.set(
    matchRef,
    {
      lineup,
      playerStats: finalStats,
      _playerStatsVersion: 1,
    },
    { merge: true },
  );
  batch.update(careerRef, { updatedAt: Date.now() });

  try {
    await batch.commit();
  } catch (batchError) {
    console.warn(
      "Batch write failed in quota fallback, saving match directly.",
      batchError,
    );
    await setDoc(
      matchRef,
      {
        lineup,
        playerStats: finalStats,
        _playerStatsVersion: 1,
      },
      { merge: true },
    );
    try {
      await updateCareerFirestore(userUid, careerId, {
        updatedAt: Date.now(),
      });
    } catch {
      // ignore
    }
  }

  return finalStats;
};

export const ServiceLineup = {
  saveLineupToMatch: async (
    careerId: string,
    seasonId: string,
    matchesId: string,
    lineup: SavedLineup,
    playerStats: PlayerMatchStat[],
    removedPlayerIds: string[] = [],
  ): Promise<PlayerMatchStat[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    // Se o circuit breaker de quota estiver ativo (devido a rate limit / 429 recente),
    // salva diretamente sem passar por runTransaction para evitar chamadas de rede que geram 429 no console.
    if (isQuotaExceededActive()) {
      return await saveLineupDirectly(
        user.uid,
        careerId,
        seasonId,
        matchesId,
        lineup,
        playerStats,
        removedPlayerIds,
      );
    }

    const matchRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches`,
      matchesId,
    );
    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);

    try {
      return await runTransaction(
        db,
        async (transaction) => {
          const matchSnap = await transaction.get(matchRef);
          if (!matchSnap.exists()) {
            throw new Error("Partida não encontrada para salvar a formação.");
          }

          const matchData = matchSnap.data() as Match;
          const baseStats: PlayerMatchStat[] = matchData.playerStats || [];

          // Mapeia todas as estatísticas existentes autoritativas
          const statsMap = new Map<string, PlayerMatchStat>(
            baseStats.map((stat) => [stat.playerId, stat]),
          );

          // Se a partida não tinha stats no pai (ex: moderna/legada ou primeiro save),
          // incorpora as estatísticas recebidas do chamador
          for (const stat of playerStats) {
            if (!statsMap.has(stat.playerId)) {
              statsMap.set(stat.playerId, stat);
            }
          }

          const activePlayerIds = getLineupPlayerIds(lineup);

          // Determina quem deve ser removido:
          // Quem estiver em removedPlayerIds ou em statsMap, mas NÃO faz parte da formação salva
          const effectiveRemovedIds = new Set<string>();
          for (const id of removedPlayerIds) {
            if (!activePlayerIds.has(id)) {
              effectiveRemovedIds.add(id);
            }
          }
          for (const [id] of statsMap) {
            if (!activePlayerIds.has(id)) {
              effectiveRemovedIds.add(id);
            }
          }

          for (const id of effectiveRemovedIds) {
            statsMap.delete(id);
          }

          const finalStats = Array.from(statsMap.values());
          const writeCount = effectiveRemovedIds.size + finalStats.length + 2;
          if (writeCount > 500) {
            throw new Error(
              "A atualização de escalação excede o limite de 500 escritas para commit atômico.",
            );
          }

          for (const playerId of effectiveRemovedIds) {
            transaction.delete(doc(matchRef, "playerStats", playerId));
          }
          for (const stat of finalStats) {
            transaction.set(doc(matchRef, "playerStats", stat.playerId), stat, {
              merge: true,
            });
          }

          transaction.update(matchRef, {
            lineup,
            playerStats: finalStats,
            _playerStatsVersion: 1,
          });

          transaction.update(careerRef, { updatedAt: Date.now() });

          return finalStats;
        },
        { maxAttempts: 1 },
      );
    } catch (error: unknown) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        console.warn(
          "Firestore quota exceeded during saveLineupToMatch; falling back to direct write.",
          error,
        );

        return await saveLineupDirectly(
          user.uid,
          careerId,
          seasonId,
          matchesId,
          lineup,
          playerStats,
          removedPlayerIds,
        );
      }
      throw error;
    }
  },
};
