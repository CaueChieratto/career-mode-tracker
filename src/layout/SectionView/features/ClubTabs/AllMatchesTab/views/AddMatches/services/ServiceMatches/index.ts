import { ServiceTable } from "../../../../../TableTab/views/AddTeamsToTable/services/ServiceTable";
import {
  collection,
  deleteField,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../../../../../../../../../common/services/Firebase";
import { Match } from "../../../../../../../../../common/interfaces/Match";
import { updateCareerFirestore } from "../../../../../../../../../common/helpers/Setters";
import { Career } from "../../../../../../../../../common/interfaces/Career";
import { Teams } from "../../../../../../../../../common/interfaces/Teams";
import { PlayerMatchStat } from "../../../../../../../../../common/interfaces/PlayerMatchStat";
import { ClubData } from "../../../../../../../../../common/interfaces/club/clubData";
import { TableTeamData } from "../../../../../../../../../common/interfaces/TableTeamData";
import {
  buildStandingsRows,
  getAffectedStandingsTeams,
} from "../../../../../TableTab/views/AddTeamsToTable/services/ServiceTable/buildStandingsRows";

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
    if (!specialUserId) return null;
    const careersRef = collection(db, `users/${specialUserId}/careers`);
    const snapshot = await getDocs(careersRef);
    const searchName = teamName.toLowerCase().trim();

    for (const careerDoc of snapshot.docs) {
      const careerData = careerDoc.data() as Career;
      if (!careerData.clubData) continue;
      for (const season of careerData.clubData) {
        const foundTeam = season.teams?.find(
          (t) => t.name.toLowerCase().trim() === searchName,
        );
        if (foundTeam && foundTeam.badge) {
          return foundTeam;
        }
      }
    }
    return null;
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

    await updateDoc(careerRef, {
      clubData: updatedClubData,
      updatedAt: Date.now(),
    });
  },

  updateSeasonTeams: async (
    careerId: string,
    seasonId: string,
    teams: Teams[],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

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

    await updateDoc(careerRef, {
      clubData: updatedClubData,
      updatedAt: Date.now(),
    });
  },

  removeTeamFromSeason: async (
    careerId: string,
    seasonId: string,
    team: Teams,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

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

    await updateDoc(careerRef, {
      clubData: updatedClubData,
      updatedAt: Date.now(),
    });
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
    await batch.commit();
  },

  updateMatchDetailsInSeason: async (
    career: Career,
    season: ClubData,
    previousMatch: Match,
    updatedMatch: Match,
    removePenalties = false,
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
    batch.update(careerRef, { updatedAt: Date.now() });
    await batch.commit();
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
    await batch.commit();
  },

  savePlayerStatsToSubcollection: async (
    careerId: string,
    seasonId: string,
    matchId: string,
    playerStats: PlayerMatchStat[],
    updatedPlayerStats: PlayerMatchStat[],
  ) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const matchRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches/${matchId}`,
    );

    const finalStatsByPlayer = new Map(
      updatedPlayerStats.map((stat) => [stat.playerId, stat]),
    );
    for (const stat of playerStats) {
      finalStatsByPlayer.set(stat.playerId, stat);
    }
    const finalPlayerStats = Array.from(finalStatsByPlayer.values());
    if (finalPlayerStats.length + 2 > 500) {
      throw new Error(
        "A atualização das estatísticas excede o limite de 500 escritas para commit atômico.",
      );
    }

    const batch = writeBatch(db);
    for (const stat of finalPlayerStats) {
      batch.set(doc(matchRef, "playerStats", stat.playerId), stat);
    }
    batch.update(matchRef, {
      playerStats: finalPlayerStats,
      _playerStatsVersion: 1,
    });
    batch.update(doc(db, `users/${user.uid}/careers/${careerId}`), {
      updatedAt: Date.now(),
    });
    await batch.commit();
  },

  findTeamAcrossUserCareers: async (
    teamName: string,
  ): Promise<Teams | null> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careersRef = collection(db, `users/${user.uid}/careers`);
    const snapshot = await getDocs(careersRef);

    const searchName = teamName.toLowerCase().trim();

    for (const careerDoc of snapshot.docs) {
      const careerData = careerDoc.data() as Career;

      if (!careerData.clubData) continue;

      for (const season of careerData.clubData) {
        const foundTeam = season.teams?.find(
          (t) => t.name.toLowerCase().trim() === searchName,
        );

        if (foundTeam && foundTeam.badge) {
          return foundTeam;
        }
      }
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
