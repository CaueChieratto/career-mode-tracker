import { getCareerById, updateCachedCareer } from "../../helpers/Getters";
import { updateCareerFirestore } from "../../helpers/Setters";
import { removeAllTrophiesForSeason } from "../../helpers/Deleters";
import { getSeasonName } from "../../utils/GetSeasonName";
import { ClubData } from "../../interfaces/club/clubData";
import { Career } from "../../interfaces/Career";
import { League } from "../../interfaces/League";
import { auth, db } from "../Firebase";
import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  DocumentReference,
  getDoc,
  getDocsFromServer,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { stripHeavyData } from "../../utils/stripHeavyData";
import { getSeasonDateRange } from "../../utils/GetSeasonDateRange";
import { withFirestoreRetry } from "../../utils/firestoreRetry";
import { sanitizeFirestoreData } from "../../utils/sanitizeFirestore";
import { AcademyData, AcademyPlayers } from "../../interfaces/AcademyData";
import { Players } from "../../interfaces/playersInfo/players";
import { buildNextSeasonPlayers } from "./helpers/buildNextSeasonPlayers";
import { TransferDraftService } from "../TransferDraftService";
import { notifyCareersUpdated } from "../../hooks/Career/UseCareer";
import { ServiceFinance } from "../ServiceFinance";
import {
  isNextWindowTiming,
  resolveNextWindowTimingSchedule,
} from "../ServicePlayers/helpers/transferTimingHelpers";

export class SeasonCreationConflictError extends Error {
  code = "SEASON_CREATION_CONFLICT";
  constructor(message = "Conflito ao criar temporada concorrentemente.") {
    super(message);
    this.name = "SeasonCreationConflictError";
  }
}

const batchDeleteRefs = async (
  refs: Array<DocumentReference | { path: string }>,
): Promise<void> => {
  const BATCH_SIZE = 450;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.delete(ref as DocumentReference);
    }
    await withFirestoreRetry(() => batch.commit());
  }
};

export const ServiceSeasons = {
  addSeason: async (career: Career): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");
    const existingNumbers = career.clubData.map((season) => season.seasonNumber);
    let seasonNumber = 1;
    while (existingNumbers.includes(seasonNumber)) seasonNumber++;

    const previousSeason = career.clubData.find(
      (season) => season.seasonNumber === seasonNumber - 1,
    );
    if (
      previousSeason &&
      career.academy &&
      previousSeason.academyPlayers === undefined
    ) {
      throw new Error(
        "Jogadores da base não foram carregados para criar a temporada.",
      );
    }
    const { startDate: returnDate } = getSeasonDateRange(
      seasonNumber,
      career.createdAt,
      career.nation,
    );

    // Se houver transferências de 'Próxima Janela' agendadas na temporada anterior que pelo
    // calendário deveriam ter ocorrido durante a temporada anterior (ex: janela de inverno),
    // consolida-as na temporada anterior com a data exata da respectiva janela.
    let updatedPreviousPlayers: Players[] = previousSeason?.players || [];
    const modifiedPreviousPlayers: Players[] = [];

    if (previousSeason && Array.isArray(previousSeason.players)) {
      updatedPreviousPlayers = previousSeason.players.map((player) => {
        let playerModified = false;
        const updatedContracts = (player.contract || []).map((c) => {
          if (isNextWindowTiming(c.timing)) {
            const sched = resolveNextWindowTimingSchedule(
              c,
              previousSeason.seasonNumber,
              career.createdAt,
              career.nation,
            );
            if (sched.belongsToPreviousSeason) {
              playerModified = true;
              return {
                ...c,
                timing: "Imediata" as const,
                ...(c.leftClub ? { dataExit: sched.effectiveDate } : {}),
                ...(c.fromClub ? { dataArrival: sched.effectiveDate } : {}),
              };
            }
          }
          return c;
        });

        if (playerModified) {
          const hasExit = updatedContracts.some(
            (c) => Boolean(c.leftClub) && !c.isLoan,
          );
          const hasArrival = updatedContracts.some(
            (c) => Boolean(c.fromClub) && !c.isLoan,
          );
          const updatedPlayer: Players = {
            ...player,
            contract: updatedContracts,
            ...(hasExit ? { sell: true } : {}),
            ...(hasArrival ? { buy: true } : {}),
          };
          modifiedPreviousPlayers.push(updatedPlayer);
          return updatedPlayer;
        }
        return player;
      });
    }

    const newSeasonId = `season-${seasonNumber}`;
    const playersForNewSeason = buildNextSeasonPlayers(
      updatedPreviousPlayers,
      returnDate,
      {
        seasonNumber,
        newSeasonId,
        careerCreatedAt: career.createdAt,
        careerNation: career.nation,
        previousSeasonNumber: previousSeason?.seasonNumber ?? 1,
      },
    );

    const academyPlayersToCopy: AcademyPlayers[] = (
      previousSeason?.academyPlayers || []
    )
      .filter((player) => player.status === "academy")
      .map((player) => ({ ...player, evolutionHistory: [] }));

    if (
      1 +
        playersForNewSeason.length +
        academyPlayersToCopy.length +
        modifiedPreviousPlayers.length >
      500
    ) {
      throw new Error(
        "A temporada excede o limite de 500 escritas para criação atômica.",
      );
    }

    const careerId = career.id;
    const newSeason: ClubData = {
      players: [],
      seasonNumber,
      id: newSeasonId,
      leagues: previousSeason?.leagues || [],
    };
    const batch = writeBatch(db);

    for (const player of playersForNewSeason) {
      batch.set(
        doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${newSeasonId}/players`,
          player.id,
        ),
        sanitizeFirestoreData(player),
      );
    }
    for (const academyPlayer of academyPlayersToCopy) {
      batch.set(
        doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${newSeasonId}/academyPlayers`,
          academyPlayer.id,
        ),
        sanitizeFirestoreData(academyPlayer),
      );
    }
    const now = Math.max(Date.now(), (career.updatedAt || 0) + 1);
    batch.update(doc(db, `users/${user.uid}/careers/${careerId}`), {
      clubData: arrayUnion(newSeason),
      updatedAt: now,
    });

    try {
      await withFirestoreRetry(() => batch.commit());

      // Grava no Firestore atletas da temporada anterior se houve consolidação de Próxima Janela
      if (previousSeason && modifiedPreviousPlayers.length > 0) {
        for (const player of modifiedPreviousPlayers) {
          try {
            await withFirestoreRetry(() =>
              setDoc(
                doc(
                  db,
                  `users/${user.uid}/careers/${careerId}/seasons/${previousSeason.id}/players`,
                  player.id,
                ),
                sanitizeFirestoreData(player),
              ),
            );
          } catch {
            // Ignora falha de gravação individual em offline ou fallback
          }
        }
      }

      // Sincroniza o relatório financeiro da temporada anterior se jogadores foram consolidados
      if (previousSeason && modifiedPreviousPlayers.length > 0) {
        previousSeason.players = updatedPreviousPlayers;
        void ServiceFinance.syncReconciledReport(
          careerId,
          previousSeason.id,
          previousSeason,
          false,
          career,
        );
      }

      const hydratedNewSeason: ClubData = {
        ...newSeason,
        players: playersForNewSeason,
        academyPlayers: academyPlayersToCopy,
        matches: [],
        table: [],
      };

      // Sincroniza parcelas liquidadas automaticamente na virada para a nova temporada
      const hasNewSeasonInstallments = playersForNewSeason.some((p) =>
        (p.contract || []).some(
          (c) =>
            c.installments?.paidSeasonId === newSeasonId ||
            c.installments?.installmentsList?.some(
              (item) => item.paid && item.paidSeasonId === newSeasonId,
            ),
        ),
      );
      if (hasNewSeasonInstallments) {
        void ServiceFinance.syncReconciledReport(
          careerId,
          newSeasonId,
          hydratedNewSeason,
          false,
          career,
        ).catch(() => {});
      }

      const mergeHydratedSeasonIntoCareer = (c: Career): Career => {
        const currentClubData = c.clubData || [];
        const seasonAlreadyExists = currentClubData.some(
          (s) =>
            s.id === hydratedNewSeason.id ||
            s.seasonNumber === hydratedNewSeason.seasonNumber,
        );

        const updatedClubData = currentClubData.map((s) => {
          if (
            previousSeason &&
            s.id === previousSeason.id &&
            modifiedPreviousPlayers.length > 0
          ) {
            return { ...s, players: updatedPreviousPlayers };
          }
          if (
            s.id === hydratedNewSeason.id ||
            s.seasonNumber === hydratedNewSeason.seasonNumber
          ) {
            return hydratedNewSeason;
          }
          return s;
        });

        const mergedClubData = seasonAlreadyExists
          ? updatedClubData
          : [...updatedClubData, hydratedNewSeason];

        const seen = new Set<string>();
        const deduplicatedClubData: ClubData[] = [];
        for (const s of mergedClubData) {
          const key = s.id || `season-${s.seasonNumber}`;
          if (!seen.has(key)) {
            seen.add(key);
            deduplicatedClubData.push(s);
          }
        }

        return {
          ...c,
          clubData: deduplicatedClubData,
          updatedAt: now,
        };
      };

      try {
        if (typeof updateCachedCareer === "function") {
          updateCachedCareer(mergeHydratedSeasonIntoCareer(career));
        }
      } catch {
        // Ignora quando Getters está parcialmente mockado em testes unitários
      }

      notifyCareersUpdated((prev) =>
        prev.map((c) => {
          if (c.id !== careerId) return c;
          const updatedCareer = mergeHydratedSeasonIntoCareer(c);
          try {
            if (typeof updateCachedCareer === "function") {
              updateCachedCareer(updatedCareer);
            }
          } catch {
            // Ignora quando Getters está parcialmente mockado em testes unitários
          }
          return updatedCareer;
        }),
      );
    } catch (error) {
      console.error(
        `[addSeason] ERRO ao tentar criar e salvar a temporada:`,
        error,
      );
      throw error;
    }
  },

  deleteSeason: async (careerId: string, seasonId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    let storedSeasons: ClubData[] = [];
    const career = await getCareerById(user.uid, careerId, (seasons) => {
      storedSeasons = seasons;
    });

    const seasonToDelete =
      storedSeasons.find((s) => s.id === seasonId) ||
      career.clubData.find((s) => s.id === seasonId);

    const updatedClubData = career.clubData.filter(
      (season) => season.id !== seasonId,
    );

    let updatedTrophies = career.trophies || [];
    if (seasonToDelete && typeof seasonToDelete.seasonNumber === "number") {
      const seasonName = getSeasonName(
        seasonToDelete.seasonNumber,
        career.createdAt,
        career.nation,
      );
      updatedTrophies = removeAllTrophiesForSeason(career, seasonName);
    }

    const seasonPath = `users/${user.uid}/careers/${careerId}/seasons/${seasonId}`;

    for (const name of [
      "players",
      "academyPlayers",
      "table",
      "academyTournaments",
      "proposals",
      "finance",
    ]) {
      const snapshot = await getDocsFromServer(
        collection(db, `${seasonPath}/${name}`),
      );
      if (snapshot.docs.length > 0) {
        await batchDeleteRefs(snapshot.docs.map((child) => child.ref));
      }
    }

    const matches = await getDocsFromServer(
      collection(db, `${seasonPath}/matches`),
    );
    const playerStatsRefs: DocumentReference[] = [];
    for (const match of matches.docs) {
      const stats = await getDocsFromServer(
        collection(match.ref, "playerStats"),
      );
      for (const stat of stats.docs) {
        playerStatsRefs.push(stat.ref as DocumentReference);
      }
    }
    if (playerStatsRefs.length > 0) {
      await batchDeleteRefs(playerStatsRefs);
    }
    if (matches.docs.length > 0) {
      await batchDeleteRefs(
        matches.docs.map((match) => match.ref as DocumentReference),
      );
    }

    const now = Date.now();
    await deleteDoc(doc(db, seasonPath));
    TransferDraftService.clearDraft(careerId, seasonId);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(`finance_report_${careerId}_${seasonId}`);
      }
    } catch {
      // ignore
    }

    await updateCareerFirestore(user.uid, careerId, {
      clubData: stripHeavyData(updatedClubData, storedSeasons),
      trophies: updatedTrophies,
      updatedAt: now,
    });
    notifyCareersUpdated((prev) =>
      prev.map((c) =>
        c.id === careerId
          ? {
              ...c,
              clubData: c.clubData.filter((season) => season.id !== seasonId),
              trophies: updatedTrophies,
              updatedAt: now,
            }
          : c,
      ),
    );
  },

  updateSeasonLeagues: async (
    careerId: string,
    seasonId: string,
    leagues: League[],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const careerSnap = await getDoc(careerRef);
    if (!careerSnap.exists()) throw new Error("Carreira não encontrada");

    const rawData = careerSnap.data() as Career;
    const storedClubData = (rawData?.clubData || []) as ClubData[];
    const updatedClubData = storedClubData.map((season) =>
      season.id === seasonId ? { ...season, leagues } : season,
    );

    const now = Date.now();
    await updateCareerFirestore(user.uid, careerId, {
      clubData: updatedClubData,
      updatedAt: now,
    });
    notifyCareersUpdated((prev) =>
      prev.map((c) => {
        if (c.id !== careerId) return c;
        const updatedClubData = (c.clubData || []).map((season) =>
          season.id === seasonId ? { ...season, leagues } : season,
        );
        const updatedCareer: Career = {
          ...c,
          clubData: updatedClubData,
          updatedAt: now,
        };
        updateCachedCareer(updatedCareer);
        return updatedCareer;
      }),
    );
  },

  updateSeasonCaptains: async (
    careerId: string,
    seasonId: string,
    captainPlayerIds: string[],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const careerSnap = await getDoc(careerRef);
    if (!careerSnap.exists()) throw new Error("Carreira não encontrada");

    const rawData = careerSnap.data() as Career;
    const storedClubData = (rawData?.clubData || []) as ClubData[];
    const targetSeason = storedClubData.find((season) => season.id === seasonId);
    if (!targetSeason) throw new Error("Temporada não encontrada");

    const validCaptainIds = captainPlayerIds.slice(0, 5);

    const updatedClubData = storedClubData.map((season) => {
      if (season.id !== seasonId) return season;
      const updated: ClubData = {
        ...season,
        captains: validCaptainIds,
      };
      if (Array.isArray(season.players) && season.players.length > 0) {
        updated.players = season.players.map((player) => {
          const rankIndex = validCaptainIds.indexOf(player.id);
          if (rankIndex !== -1) {
            return {
              ...player,
              captain: true,
              captainRank: rankIndex + 1,
            };
          } else if (player.captain) {
            const copy = { ...player, captain: false };
            delete copy.captainRank;
            return copy;
          }
          return player;
        });
      }
      return updated;
    });

    const now = Date.now();
    await updateCareerFirestore(user.uid, careerId, {
      clubData: updatedClubData,
      updatedAt: now,
    });
    notifyCareersUpdated((prev) =>
      prev.map((c) => {
        if (c.id !== careerId) return c;
        const memoryClubData = (c.clubData || []).map((season) => {
          if (season.id !== seasonId) return season;
          const currentPlayers = season.players || [];
          const updatedPlayersInMemory = currentPlayers.map((player) => {
            const rankIndex = validCaptainIds.indexOf(player.id);
            if (rankIndex !== -1) {
              return {
                ...player,
                captain: true,
                captainRank: rankIndex + 1,
              };
            } else if (player.captain) {
              const copy = { ...player, captain: false };
              delete copy.captainRank;
              return copy;
            }
            return player;
          });
          return {
            ...season,
            captains: validCaptainIds,
            players: updatedPlayersInMemory,
          };
        });
        const updatedCareer: Career = {
          ...c,
          clubData: memoryClubData,
          updatedAt: now,
        };
        updateCachedCareer(updatedCareer);
        return updatedCareer;
      }),
    );

    try {
      const seasonPath = `users/${user.uid}/careers/${careerId}/seasons/${seasonId}`;
      const seasonDocRef = doc(db, seasonPath);
      await updateDoc(seasonDocRef, {
        captains: validCaptainIds,
      }).catch(() => {});

      for (let i = 0; i < validCaptainIds.length; i++) {
        const captainId = validCaptainIds[i];
        const playerDocRef = doc(db, `${seasonPath}/players/${captainId}`);
        await updateDoc(playerDocRef, {
          captain: true,
          captainRank: i + 1,
        }).catch(() => {});
      }

      const previousCaptains = (targetSeason.captains || []) as string[];
      const demotedCaptainIds = previousCaptains.filter(
        (id) => !validCaptainIds.includes(id),
      );
      for (const demotedId of demotedCaptainIds) {
        const playerDocRef = doc(db, `${seasonPath}/players/${demotedId}`);
        await updateDoc(playerDocRef, {
          captain: false,
          captainRank: deleteField(),
        }).catch(() => {});
      }
    } catch {
      // Subcoleções opcionais
    }
  },

  updateCurrency: async (careerId: string, currency: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    await updateCareerFirestore(user.uid, careerId, {
      currency,
    });
  },

  updateAcademy: async (
    careerId: string,
    academy: AcademyData,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    await updateCareerFirestore(user.uid, careerId, {
      academy,
    });
  },
};
