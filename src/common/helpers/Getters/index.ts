import { ServiceMatches } from "../../../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { ServicePlayers } from "../../services/ServicePlayers";
import { ServiceTable } from "../../../layout/SectionView/features/ClubTabs/TableTab/views/AddTeamsToTable/services/ServiceTable";
import { collection, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../services/Firebase";
import { Career } from "../../interfaces/Career";
import { ClubData } from "../../interfaces/club/clubData";
import { mergeModernAndLegacy } from "../mergeModernAndLegacy";
import { AcademyPlayers } from "../../../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayers";

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
        if (career.clubData && career.clubData.length > 0) {
          const updatedClubData = await Promise.all(
            career.clubData.map(async (season) => {
              try {
                const [
                  subcollectionMatches,
                  subcollectionPlayers,
                  table,
                  academyPlayers,
                ] =
                  await Promise.all([
                    ServiceMatches.getMatchesBySeason(career.id, season.id),
                    ServicePlayers.getPlayersBySeason(career.id, season.id),
                    ServiceTable.getTableBySeason(career.id, season.id),
                    getAcademyPlayersBySeason(
                      uid,
                      career.id,
                      season.id,
                    ).catch((error) => {
                      console.error(
                        "Erro ao carregar jogadores da base: ",
                        error,
                      );
                      return undefined;
                    }),
                  ]);

                const oldMatches = season.matches || [];

                const combinedMatches = mergeModernAndLegacy(
                  subcollectionMatches, oldMatches, (m) => m.matchesId,
                );

                const oldPlayers = season.players || [];

                const combinedPlayers = mergeModernAndLegacy(
                  subcollectionPlayers, oldPlayers, (p) => p.id,
                );

                return {
                  ...season,
                  matches: combinedMatches,
                  players: combinedPlayers,
                  table: table as unknown as ClubData["table"],
                  ...(academyPlayers !== undefined ? { academyPlayers } : {}),
                };
              } catch (error) {
                console.error("Erro: ", error);
                return {
                  ...season,
                  matches: season.matches || [],
                  players: season.players || [],
                };
              }
            }),
          );
          return { ...career, clubData: updatedClubData };
        }
        return career;
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
      code: careerSnap.metadata.fromCache || careerSnap.metadata.hasPendingWrites
        ? "career/unavailable" : "career/not-found",
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
    const updatedClubData = await Promise.all(
      careerData.clubData.map(async (season) => {
        try {
          const [subcollectionMatches, subcollectionPlayers, table] =
            await Promise.all([
              ServiceMatches.getMatchesBySeason(careerId, season.id),
              ServicePlayers.getPlayersBySeason(careerId, season.id),
              ServiceTable.getTableBySeason(careerId, season.id),
            ]);

          const oldMatches = season.matches || [];
          const combinedMatches = mergeModernAndLegacy(
            subcollectionMatches, oldMatches, (m) => m.matchesId,
          );

          const oldPlayers = season.players || [];
          const combinedPlayers = mergeModernAndLegacy(
            subcollectionPlayers, oldPlayers, (p) => p.id,
          );

          return {
            ...season,
            matches: combinedMatches,
            players: combinedPlayers,
            table: table as unknown as ClubData["table"],
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
    careerData.clubData = updatedClubData;
  }

  return careerData;
};
