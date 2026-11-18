import { ServiceTable } from "../ServiceTable";
import {
  collection,
  deleteField,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  getDoc,
  writeBatch,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "../Firebase";
import { Match } from "../../interfaces/Match";
import { updateCareerFirestore } from "../../helpers/Setters";
import { Career } from "../../interfaces/Career";
import { Teams } from "../../interfaces/Teams";
import { PlayerMatchStat } from "../../interfaces/PlayerMatchStat";
import { ClubData } from "../../interfaces/club/clubData";
import { TableTeamData } from "../../interfaces/TableTeamData";
import { OpponentPlayer } from "../../interfaces/OpponentPlayer";
import { ServiceClubBadges } from "../ServiceClubBadges";
import { isClubNameMatch } from "../../helpers/clubMatching";
import {
  buildStandingsRows,
  getAffectedStandingsTeams,
} from "../ServiceTable/buildStandingsRows";
import {
  isQuotaExceededActive,
  isQuotaExceededError,
  markQuotaExceeded,
  withFirestoreRetry,
} from "../../utils/firestoreRetry";
import { sanitizeFirestoreData } from "../../utils/sanitizeFirestore";

const MATCH_STATS_FIELDS = [
  "homePossession",
  "awayPossession",
  "homeXG",
  "awayXG",
  "homeBallRecovery",
  "awayBallRecovery",
  "homeFinishings",
  "awayFinishings",
  "homeFinishingsOnTarget",
  "awayFinishingsOnTarget",
  "homePasses",
  "awayPasses",
  "homePassesCompleted",
  "awayPassesCompleted",
  "homeDefenses",
  "awayDefenses",
  "homeYellowCards",
  "awayYellowCards",
  "homeRedCards",
  "awayRedCards",
] as const satisfies readonly (keyof Match)[];

const MATCH_DETAILS_FIELDS = [
  "homeScore",
  "awayScore",
  "stoppage1T",
  "stoppage2T",
  "stoppageET1",
  "stoppageET2",
  "hasExtraTime",
  "status",
  "result",
  "opponentEvents",
  "opponentMvpName",
  "opponentMvpRating",
] as const satisfies readonly (keyof Match)[];

const getLocalTable = (
  season: ClubData,
  previous: Match,
  next?: Match,
): TableTeamData[] => {
  const affected = getAffectedStandingsTeams(previous, next, season);
  if (affected.length === 0) return [];
  if (!season.matches || !season.table) {
    throw new Error(
      "Snapshot local de partidas/classificação indisponível para atualização sem leituras.",
    );
  }
  return season.table as unknown as TableTeamData[];
};

const createStableTableRowId = (teamName: string) =>
  `team-${encodeURIComponent(teamName.trim().toLowerCase())}`;

const savePlayerStatsDirectly = async (
  userUid: string,
  careerId: string,
  seasonId: string,
  matchId: string,
  playerStats: PlayerMatchStat[],
  updatedPlayerStats?: PlayerMatchStat[],
  primaryPlayerId?: string,
): Promise<PlayerMatchStat[]> => {
  const matchRef = doc(
    db,
    `users/${userUid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
  );
  const careerRef = doc(db, `users/${userUid}/careers/${careerId}`);

  const statsByPlayer = new Map<string, PlayerMatchStat>(
    (updatedPlayerStats || playerStats).map((stat) => [stat.playerId, stat]),
  );

  const alteredStatsToPersist: PlayerMatchStat[] = [];
  for (const stat of playerStats) {
    const existingStat = statsByPlayer.get(stat.playerId);
    let finalStat: PlayerMatchStat;

    if (primaryPlayerId && stat.playerId !== primaryPlayerId && existingStat) {
      finalStat = {
        ...existingStat,
        minutesPlayed: stat.minutesPlayed,
        substituteIn: stat.substituteIn,
      };
    } else {
      finalStat = stat;
    }

    statsByPlayer.set(stat.playerId, finalStat);
    alteredStatsToPersist.push(finalStat);
  }

  const finalPlayerStats = Array.from(statsByPlayer.values());

  const batch = writeBatch(db);
  for (const stat of alteredStatsToPersist) {
    batch.set(doc(matchRef, "playerStats", stat.playerId), stat, {
      merge: true,
    });
  }
  batch.set(
    matchRef,
    {
      playerStats: finalPlayerStats,
      _playerStatsVersion: 1,
    },
    { merge: true },
  );
  batch.update(careerRef, { updatedAt: Date.now() });

  try {
    await batch.commit();
  } catch (batchError) {
    console.warn(
      "Batch write failed in quota fallback, saving match stats directly.",
      batchError,
    );
    await setDoc(
      matchRef,
      {
        playerStats: finalPlayerStats,
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

  return finalPlayerStats;
};

export const ServiceMatches = {
  getAllTeamsAcrossUserCareers: async (): Promise<string[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careersRef = collection(db, `users/${user.uid}/careers`);
    const snapshot = await getDocs(careersRef);

    const teamsSet = new Set<string>();

    for (const careerDoc of snapshot.docs) {
      const careerData = careerDoc.data() as Career;
      if (!careerData.clubData) continue;

      for (const season of careerData.clubData) {
        season.teams?.forEach((t) => {
          if (t.name) teamsSet.add(t.name);
        });
      }
    }

    return Array.from(teamsSet).sort();
  },

  findTeamInSpecialUserCareers: async (
    specialUserId: string,
    teamName: string,
  ): Promise<Teams | null> => {
    return ServiceClubBadges.findTeamInSpecialUserCareers(
      specialUserId,
      teamName,
    );
  },

  getMatchesBySeason: async (
    careerId: string,
    seasonId: string,
  ): Promise<Match[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const matchesCollectionRef = collection(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches`,
    );
    const snapshot = await getDocs(matchesCollectionRef);

    return Promise.all(
      snapshot.docs.map(async (matchDoc) => {
        const match = matchDoc.data() as Match;
        const matchesId = match.matchesId || matchDoc.id;

        if (match._playerStatsVersion === 1) {
          return { ...match, matchesId };
        }

        const statsSnap = await getDocs(
          collection(matchDoc.ref, "playerStats"),
        );
        if (statsSnap.empty) return { ...match, matchesId };

        const statsMap = new Map<string, PlayerMatchStat>();
        (match.playerStats || []).forEach((s) => statsMap.set(s.playerId, s));
        statsSnap.docs.forEach((d) =>
          statsMap.set(d.id, d.data() as PlayerMatchStat),
        );

        return { ...match, matchesId, playerStats: Array.from(statsMap.values()) };
      }),
    );
  },

  getMatchPlayerStats: async (
    careerId: string,
    seasonId: string,
    matchId: string,
  ): Promise<PlayerMatchStat[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const statsRef = collection(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}/playerStats`,
    );
    const statsSnap = await getDocs(statsRef);
    return statsSnap.docs.map((doc) => doc.data() as PlayerMatchStat);
  },

  addMatchToSeason: async (
    careerId: string,
    seasonId: string,
    match: Match,
  ): Promise<void> => {
    if (match.status === "FINISHED") {
      await ServiceTable.reconcileMatch(
        careerId,
        seasonId,
        match.matchesId,
        match,
      );
      return;
    }
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const matchRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches`,
      match.matchesId,
    );

    const cleanedMatch = Object.entries(match).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );

    await setDoc(matchRef, cleanedMatch);

    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  addTeamToSeason: async (
    careerId: string,
    seasonId: string,
    team: Teams,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
      const careerSnap = await getDoc(careerRef);
      if (!careerSnap.exists()) return;

      const careerData = careerSnap.data() as Career;
      const updatedClubData = careerData.clubData?.map((season) => {
        if (season.id === seasonId) {
          return { ...season, teams: [...(season.teams || []), team] };
        }
        return season;
      });

      await withFirestoreRetry(() =>
        updateDoc(careerRef, sanitizeFirestoreData({
          clubData: updatedClubData,
          updatedAt: Date.now(),
        })),
      );
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        return;
      }
      throw error;
    }
  },

  updateSeasonTeams: async (
    careerId: string,
    seasonId: string,
    teams: Teams[],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
      const careerSnap = await getDoc(careerRef);
      if (!careerSnap.exists()) return;

      const careerData = careerSnap.data() as Career;
      const updatedClubData = careerData.clubData?.map((season) => {
        if (season.id === seasonId) {
          return { ...season, teams: teams };
        }
        return season;
      });

      await withFirestoreRetry(() =>
        updateDoc(careerRef, sanitizeFirestoreData({
          clubData: updatedClubData,
          updatedAt: Date.now(),
        })),
      );
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        return;
      }
      throw error;
    }
  },

  removeTeamFromSeason: async (
    careerId: string,
    seasonId: string,
    team: Teams,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    try {
      const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
      const careerSnap = await getDoc(careerRef);
      if (!careerSnap.exists()) return;

      const careerData = careerSnap.data() as Career;
      const updatedClubData = careerData.clubData?.map((season) => {
        if (season.id === seasonId) {
          return {
            ...season,
            teams: (season.teams || []).filter((t) => t.name !== team.name),
          };
        }
        return season;
      });

      await withFirestoreRetry(() =>
        updateDoc(careerRef, sanitizeFirestoreData({
          clubData: updatedClubData,
          updatedAt: Date.now(),
        })),
      );
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        return;
      }
      throw error;
    }
  },

  updateMatchInSeason: async (
    careerId: string,
    seasonId: string,
    updatedMatch: Match,
    removePenalties = false,
    previousMatch?: Match,
  ): Promise<void> => {
    if (
      previousMatch &&
      previousMatch.status !== "FINISHED" &&
      updatedMatch.status !== "FINISHED"
    ) {
      const user = auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado");

      const matchRef = doc(
        db,
        `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches`,
        updatedMatch.matchesId,
      );

      const cleanedMatch = Object.entries(updatedMatch).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        },
        {},
      );

      if (removePenalties) {
        delete cleanedMatch.homePenScore;
        delete cleanedMatch.awayPenScore;
        cleanedMatch.homePenScore = deleteField();
        cleanedMatch.awayPenScore = deleteField();
      }

      await setDoc(matchRef, cleanedMatch, { merge: true });

      const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
      try {
        await updateCareerFirestore(user.uid, careerId, {
          updatedAt: Date.now(),
        });
      } catch {
        try {
          await updateDoc(careerRef, { updatedAt: Date.now() });
        } catch {
          // ignore
        }
      }
      return;
    }

    await ServiceTable.reconcileMatch(
      careerId,
      seasonId,
      updatedMatch.matchesId,
      updatedMatch,
      removePenalties,
    );
  },

  updateMatchStatsInSeason: async (
    careerId: string,
    seasonId: string,
    updatedMatch: Match,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const matchRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches`,
      updatedMatch.matchesId,
    );
    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);

    const statsUpdate = Object.fromEntries(
      MATCH_STATS_FIELDS.map((field) => [
        field,
        updatedMatch[field] ?? null,
      ]),
    );

    const batch = writeBatch(db);
    batch.update(matchRef, statsUpdate);
    batch.update(careerRef, { updatedAt: Date.now() });

    try {
      await withFirestoreRetry(() => batch.commit());
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        console.warn(
          "Firestore quota exceeded during updateMatchStatsInSeason, falling back to setDoc.",
          error,
        );
        await setDoc(matchRef, statsUpdate, { merge: true });
        try {
          await updateCareerFirestore(user.uid, careerId, {
            updatedAt: Date.now(),
          });
        } catch {
          // ignore
        }
        return;
      }
      throw error;
    }
  },

  updateMatchDetailsInSeason: async (
    career: Career,
    season: ClubData,
    previousMatch: Match,
    updatedMatch: Match,
    removePenalties = false,
    newOpponentPlayers?: OpponentPlayer[],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const base = `users/${user.uid}/careers/${career.id}/seasons/${season.id}`;
    const matchRef = doc(db, `${base}/matches/${updatedMatch.matchesId}`);
    const careerRef = doc(db, `users/${user.uid}/careers/${career.id}`);
    const table = getLocalTable(season, previousMatch, updatedMatch);
    const rows = buildStandingsRows({
      career,
      season,
      previous: previousMatch,
      next: updatedMatch,
      matches: season.matches || [],
      table,
      createRowId: createStableTableRowId,
    });
    const writeCount = rows.length + 2;
    if (writeCount > 500) {
      throw new Error(
        "A atualização da partida excede o limite de 500 escritas para commit atômico.",
      );
    }

    const detailsUpdate = Object.fromEntries(
      MATCH_DETAILS_FIELDS.map((field) => [
        field,
        updatedMatch[field] ?? null,
      ]),
    );
    const isUserHome = updatedMatch.homeTeam === career.clubName;
    const opponentCardUpdates = isUserHome
      ? {
          awayYellowCards: updatedMatch.awayYellowCards ?? 0,
          awayRedCards: updatedMatch.awayRedCards ?? 0,
        }
      : {
          homeYellowCards: updatedMatch.homeYellowCards ?? 0,
          homeRedCards: updatedMatch.homeRedCards ?? 0,
        };

    const batch = writeBatch(db);
    batch.update(matchRef, {
      ...detailsUpdate,
      ...opponentCardUpdates,
      ...(removePenalties
        ? { homePenScore: deleteField(), awayPenScore: deleteField() }
        : {
            homePenScore: updatedMatch.homePenScore ?? null,
            awayPenScore: updatedMatch.awayPenScore ?? null,
          }),
    });
    for (const row of rows) {
      batch.set(doc(db, `${base}/table/${row.id}`), row, { merge: true });
    }
    const careerUpdate: {
      updatedAt: number;
      opponentPlayers?: OpponentPlayer[];
    } = {
      updatedAt: Date.now(),
    };
    if (newOpponentPlayers && !career.groupId) {
      careerUpdate.opponentPlayers = newOpponentPlayers;
    }
    batch.update(careerRef, careerUpdate);

    try {
      await withFirestoreRetry(() => batch.commit());
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        console.warn(
          "Firestore quota exceeded during updateMatchDetailsInSeason, falling back to setDoc.",
          error,
        );
        await setDoc(
          matchRef,
          {
            ...detailsUpdate,
            ...opponentCardUpdates,
            ...(removePenalties
              ? { homePenScore: deleteField(), awayPenScore: deleteField() }
              : {
                  homePenScore: updatedMatch.homePenScore ?? null,
                  awayPenScore: updatedMatch.awayPenScore ?? null,
                }),
          },
          { merge: true },
        );
        try {
          await updateCareerFirestore(user.uid, career.id, {
            updatedAt: Date.now(),
          });
        } catch {
          // ignore
        }
        return;
      }
      throw error;
    }
  },

  deleteMatchFromSeason: async (
    career: Career,
    season: ClubData,
    match: Match,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const base = `users/${user.uid}/careers/${career.id}/seasons/${season.id}`;
    const matchRef = doc(db, `${base}/matches/${match.matchesId}`);
    const careerRef = doc(db, `users/${user.uid}/careers/${career.id}`);
    const playerIds = Array.from(
      new Set((match.playerStats || []).map((stat) => stat.playerId)),
    );
    const table = getLocalTable(season, match, undefined);
    const rows = buildStandingsRows({
      career,
      season,
      previous: match,
      matches: season.matches || [],
      table,
      createRowId: createStableTableRowId,
    });
    const writeCount = playerIds.length + rows.length + 2;
    if (writeCount > 500) {
      throw new Error(
        "A exclusão da partida excede o limite de 500 escritas para commit atômico.",
      );
    }

    const batch = writeBatch(db);
    for (const playerId of playerIds) {
      batch.delete(doc(matchRef, "playerStats", playerId));
    }
    for (const row of rows) {
      batch.set(doc(db, `${base}/table/${row.id}`), row, { merge: true });
    }
    batch.delete(matchRef);
    batch.update(careerRef, { updatedAt: Date.now() });

    try {
      await withFirestoreRetry(() => batch.commit());
    } catch (error) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        console.warn(
          "Firestore quota exceeded during deleteMatchFromSeason, falling back to direct delete.",
          error,
        );
        await setDoc(matchRef, { deleted: true }, { merge: true });
        return;
      }
      throw error;
    }
  },

  savePlayerStatsToSubcollection: async (
    careerId: string,
    seasonId: string,
    matchId: string,
    playerStats: PlayerMatchStat[],
    updatedPlayerStats?: PlayerMatchStat[],
    primaryPlayerId?: string,
  ): Promise<PlayerMatchStat[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    // Se o circuit breaker de quota estiver ativo, salva diretamente sem passar por runTransaction
    // para evitar chamadas de rede que geram 429 no console do navegador.
    if (isQuotaExceededActive()) {
      return await savePlayerStatsDirectly(
        user.uid,
        careerId,
        seasonId,
        matchId,
        playerStats,
        updatedPlayerStats,
        primaryPlayerId,
      );
    }

    const matchRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
    );
    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);

    try {
      return await runTransaction(
        db,
        async (transaction) => {
          const matchSnap = await transaction.get(matchRef);
          if (!matchSnap.exists()) {
            throw new Error("Partida não encontrada para salvar estatísticas.");
          }

          const matchData = matchSnap.data() as Match;
          const baseStats: PlayerMatchStat[] = matchData.playerStats || [];

          const statsByPlayer = new Map<string, PlayerMatchStat>(
            baseStats.map((stat) => [stat.playerId, stat]),
          );

          if (baseStats.length === 0 && updatedPlayerStats) {
            for (const stat of updatedPlayerStats) {
              if (!statsByPlayer.has(stat.playerId)) {
                statsByPlayer.set(stat.playerId, stat);
              }
            }
          }

          const alteredStatsToPersist: PlayerMatchStat[] = [];

          for (const stat of playerStats) {
            const existingStat = statsByPlayer.get(stat.playerId);
            let finalStat: PlayerMatchStat;

            if (primaryPlayerId && stat.playerId !== primaryPlayerId && existingStat) {
              finalStat = {
                ...existingStat,
                minutesPlayed: stat.minutesPlayed,
                substituteIn: stat.substituteIn,
              };
            } else {
              finalStat = stat;
            }

            statsByPlayer.set(stat.playerId, finalStat);
            alteredStatsToPersist.push(finalStat);
          }

          const finalPlayerStats = Array.from(statsByPlayer.values());
          const writeCount = alteredStatsToPersist.length + 2;
          if (writeCount > 500) {
            throw new Error(
              "A atualização das estatísticas excede o limite de 500 escritas para commit atômico.",
            );
          }

          for (const stat of alteredStatsToPersist) {
            transaction.set(doc(matchRef, "playerStats", stat.playerId), stat);
          }

          transaction.update(matchRef, {
            playerStats: finalPlayerStats,
            _playerStatsVersion: 1,
          });

          transaction.update(careerRef, {
            updatedAt: Date.now(),
          });

          return finalPlayerStats;
        },
        { maxAttempts: 1 },
      );
    } catch (error: unknown) {
      if (isQuotaExceededError(error)) {
        markQuotaExceeded();
        console.warn(
          "Firestore quota exceeded during savePlayerStatsToSubcollection; falling back to direct write.",
          error,
        );

        return await savePlayerStatsDirectly(
          user.uid,
          careerId,
          seasonId,
          matchId,
          playerStats,
          updatedPlayerStats,
          primaryPlayerId,
        );
      }
      throw error;
    }
  },

  findTeamAcrossUserCareers: async (
    teamName: string,
  ): Promise<Teams | null> => {
    return ServiceClubBadges.findTeamAcrossUserCareers(teamName);
  },

  findBadgeAcrossUserCareers: async (
    uid: string,
    clubName: string,
  ): Promise<string | null> => {
    if (!clubName || !clubName.trim()) return null;
    const cleanTarget = clubName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    try {
      const teamFromHistory =
        await ServiceMatches.findTeamAcrossUserCareers(clubName);
      if (teamFromHistory?.badge) {
        return teamFromHistory.badge;
      }

      const careersRef = collection(db, `users/${uid}/careers`);
      const snapshot = await getDocs(careersRef);
      for (const careerDoc of snapshot.docs) {
        const careerData = careerDoc.data() as Career;
        if (
          careerData.clubName &&
          (careerData.clubName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase() === cleanTarget ||
            isClubNameMatch(careerData.clubName, clubName)) &&
          careerData.teamBadge
        ) {
          return careerData.teamBadge;
        }
        if (careerData.clubData) {
          for (const s of careerData.clubData) {
            const tMatch = s.teams?.find(
              (t) =>
                t.name &&
                (t.name
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .trim()
                  .toLowerCase() === cleanTarget ||
                  isClubNameMatch(t.name, clubName)) &&
                t.badge,
            );
            if (tMatch?.badge) return tMatch.badge;

            const tblMatch = s.table?.find(
              (t) =>
                t.name &&
                (t.name
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .trim()
                  .toLowerCase() === cleanTarget ||
                  isClubNameMatch(t.name, clubName)) &&
                t.badge,
            );
            if (tblMatch?.badge) return tblMatch.badge;
          }
        }
      }
    } catch {
      // Ignora falhas transitórias
    }
    return null;
  },

  findBadgeInSpecialUserCareers: async (
    specialUserId: string,
    clubName: string,
  ): Promise<string | null> => {
    if (!specialUserId || !clubName || !clubName.trim()) return null;
    const cleanTarget = clubName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    try {
      const teamFromSpecial =
        await ServiceMatches.findTeamInSpecialUserCareers(
          specialUserId,
          clubName,
        );
      if (teamFromSpecial?.badge) {
        return teamFromSpecial.badge;
      }

      const specialCareersRef = collection(
        db,
        `users/${specialUserId}/careers`,
      );
      const snapshot = await getDocs(specialCareersRef);
      for (const careerDoc of snapshot.docs) {
        const careerData = careerDoc.data() as Career;
        if (
          careerData.clubName &&
          (careerData.clubName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase() === cleanTarget ||
            isClubNameMatch(careerData.clubName, clubName)) &&
          careerData.teamBadge
        ) {
          return careerData.teamBadge;
        }
        if (careerData.clubData) {
          for (const s of careerData.clubData) {
            const tMatch = s.teams?.find(
              (t) =>
                t.name &&
                (t.name
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .trim()
                  .toLowerCase() === cleanTarget ||
                  isClubNameMatch(t.name, clubName)) &&
                t.badge,
            );
            if (tMatch?.badge) return tMatch.badge;

            const tblMatch = s.table?.find(
              (t) =>
                t.name &&
                (t.name
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .trim()
                  .toLowerCase() === cleanTarget ||
                  isClubNameMatch(t.name, clubName)) &&
                t.badge,
            );
            if (tblMatch?.badge) return tblMatch.badge;
          }
        }
      }
    } catch {
      // Ignora falhas transitórias
    }
    return null;
  },

  saveStadium: async (
    careerId: string,
    stadium: string,
    groupId?: string | null,
  ): Promise<void> => {
    const trimmedStadium = stadium.trim();
    if (!trimmedStadium) return;

    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const careerSnap = await getDoc(careerRef);
    if (careerSnap.exists()) {
      const careerData = careerSnap.data() as Career;
      const existingStadiums = careerData.stadiums || [];
      if (!existingStadiums.includes(trimmedStadium)) {
        await updateDoc(careerRef, {
          stadiums: [...existingStadiums, trimmedStadium],
          updatedAt: Date.now(),
        });
      }
    }

    if (groupId) {
      const groupRef = doc(db, `users/${user.uid}/careerGroups/${groupId}`);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const groupData = groupSnap.data() as { stadiums?: string[] };
        const existingGroupStadiums = groupData.stadiums || [];
        if (!existingGroupStadiums.includes(trimmedStadium)) {
          await updateDoc(groupRef, {
            stadiums: [...existingGroupStadiums, trimmedStadium],
            updatedAt: Date.now(),
          });
        }
      }
    }
  },

  getStadiumsByCareerOrGroup: async (
    careerId: string,
    groupId?: string | null,
  ): Promise<string[]> => {
    const user = auth.currentUser;
    if (!user) return [];

    const stadiumsSet = new Set<string>();

    try {
      const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
      const careerSnap = await getDoc(careerRef);
      if (careerSnap.exists()) {
        const careerData = careerSnap.data() as Career;
        careerData.stadiums?.forEach((s) => {
          if (s?.trim()) stadiumsSet.add(s.trim());
        });
        careerData.clubData?.forEach((season) => {
          season.matches?.forEach((m) => {
            if (m.stadium?.trim()) stadiumsSet.add(m.stadium.trim());
          });
        });
      }

      if (groupId) {
        const groupRef = doc(db, `users/${user.uid}/careerGroups/${groupId}`);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const groupData = groupSnap.data() as { stadiums?: string[] };
          groupData.stadiums?.forEach((s) => {
            if (s?.trim()) stadiumsSet.add(s.trim());
          });
        }
      }
    } catch (error) {
      console.error("Erro ao buscar estádios:", error);
    }

    return Array.from(stadiumsSet).sort((a, b) => a.localeCompare(b, "pt-BR"));
  },
};
