import { ServiceMatches } from "../../services/ServiceMatches";
import { PlayersCrudService } from "../../services/ServicePlayers/PlayersCrudService";
import { ServiceTable } from "../../services/ServiceTable";
import { collection, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../services/Firebase";
import { Career } from "../../interfaces/Career";
import { ClubData } from "../../interfaces/club/clubData";
import { mergeModernAndLegacy } from "../mergeModernAndLegacy";
import { AcademyPlayers } from "../../interfaces/AcademyData";

const getAcademyPlayersBySeason = async (
  uid: string,
  careerId: string,
  seasonId: string,
): Promise<AcademyPlayers[]> => {
  const snapshot = await getDocs(
    collection(
      db,
      `users/${uid}/careers/${careerId}/seasons/${seasonId}/academyPlayers`,
    ),
  );
  return snapshot.docs.map((academyDoc) => academyDoc.data() as AcademyPlayers);
};

interface CachedCareerEntry {
  updatedAt: number | string;
  career: Career;
}

const listCareersCache = new Map<string, CachedCareerEntry>();

export const clearGettersCache = (): void => {
  listCareersCache.clear();
};

export const updateCachedCareer = (career: Career): void => {
  if (career.updatedAt) {
    listCareersCache.set(career.id, {
      updatedAt: career.updatedAt,
      career,
    });
  }
};

async function hydrateSeasonSubcollections(
  uid: string,
  careerId: string,
  clubData: ClubData[],
  failOnHydrationError = false,
  includeAcademy = false,
): Promise<ClubData[]> {
  return Promise.all(
    clubData.map(async (season) => {
      try {
        const [
          subcollectionMatches,
          subcollectionPlayers,
          table,
          academyPlayers,
        ] = await Promise.all([
          ServiceMatches.getMatchesBySeason(careerId, season.id),
          PlayersCrudService.getPlayersBySeason(careerId, season.id),
          ServiceTable.getTableBySeason(careerId, season.id),
          includeAcademy
            ? getAcademyPlayersBySeason(uid, careerId, season.id).catch((error) => {
                console.error("Erro ao carregar jogadores da base: ", error);
                return undefined;
              })
            : Promise.resolve(undefined),
        ]);

        const oldMatches = season.matches || [];
        const combinedMatches = mergeModernAndLegacy(
          subcollectionMatches,
          oldMatches,
          (m) => m.matchesId,
        );

        const oldPlayers = season.players || [];
        const combinedPlayers = mergeModernAndLegacy(
          subcollectionPlayers,
          oldPlayers,
          (p) => p.id,
        );

        return {
          ...season,
          matches: combinedMatches,
          players: combinedPlayers,
          table: table as unknown as ClubData["table"],
          ...(academyPlayers !== undefined ? { academyPlayers } : {}),
        };
      } catch (error) {
        if (failOnHydrationError) throw error;
        console.error("Erro: ", error);
        return {
          ...season,
          matches: season.matches || [],
          players: season.players || [],
        };
      }
    }),
  );
}

export const getAllCareers = (
  uid: string,
  callback: (careers: Career[]) => void,
) => {
  const q = collection(db, `users/${uid}/careers`);

  return onSnapshot(q, async (querySnapshot) => {
    const careersData = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate()
          : new Date(data.createdAt),
      } as Career;
    });

    const fullyLoadedCareers = await Promise.all(
      careersData.map(async (career) => {
        if (!career.clubData || career.clubData.length === 0) {
          return career;
        }

        // Se a carreira possui updatedAt persistido e idêntico ao cache,
        // reaproveita os dados hidratados para evitar avalanche de queries
        // de subcoleções em carreiras inalteradas a cada disparo de snapshot.
        if (career.updatedAt) {
          const cached = listCareersCache.get(career.id);
          if (cached && cached.updatedAt === career.updatedAt) {
            return cached.career;
          }
        }

        const rawClubData = career.clubData || [];
        const seenSeasons = new Set<string>();
        const uniqueClubData = rawClubData.filter((s) => {
          const key = s.id || `season-${s.seasonNumber}`;
          if (seenSeasons.has(key)) return false;
          seenSeasons.add(key);
          return true;
        });

        const updatedClubData = await hydrateSeasonSubcollections(
          uid,
          career.id,
          uniqueClubData,
          false,
          true,
        );
        const hydratedCareer: Career = { ...career, clubData: updatedClubData };
        if (career.updatedAt) {
          listCareersCache.set(career.id, {
            updatedAt: career.updatedAt,
            career: hydratedCareer,
          });
        }
        return hydratedCareer;
      }),
    );

    callback(fullyLoadedCareers);
  });
};

export const getCareerById = async (
  uid: string,
  careerId: string,
  onReadStoredSeasons?: (seasons: ClubData[]) => void,
  failOnHydrationError = false,
): Promise<Career> => {
  const careerRef = doc(db, `users/${uid}/careers/${careerId}`);
  const careerSnap = await getDoc(careerRef);

  if (!careerSnap.exists()) {
    throw Object.assign(new Error("Carreira não encontrada"), {
      code:
        careerSnap.metadata.fromCache || careerSnap.metadata.hasPendingWrites
          ? "career/unavailable"
          : "career/not-found",
    });
  }

  const rawData = careerSnap.data();
  const careerData = {
    ...rawData,
    createdAt: rawData.createdAt?.toDate
      ? rawData.createdAt.toDate()
      : new Date(rawData.createdAt),
  } as Career;

  // Preserve the persisted payload separately from the hydrated view for metadata writes.
  onReadStoredSeasons?.(careerData.clubData || []);

  if (careerData.clubData && careerData.clubData.length > 0) {
    const rawClubData = careerData.clubData || [];
    const seenSeasons = new Set<string>();
    const uniqueClubData = rawClubData.filter((s) => {
      const key = s.id || `season-${s.seasonNumber}`;
      if (seenSeasons.has(key)) return false;
      seenSeasons.add(key);
      return true;
    });

    careerData.clubData = await hydrateSeasonSubcollections(
      uid,
      careerId,
      uniqueClubData,
      failOnHydrationError,
      false,
    );
  }

  return careerData;
};
