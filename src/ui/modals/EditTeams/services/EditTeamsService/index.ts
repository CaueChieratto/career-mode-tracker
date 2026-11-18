import {
  getDocs,
  collection,
  updateDoc,
} from "firebase/firestore";
import { Career } from "../../../../../common/interfaces/Career";
import { Teams } from "../../../../../common/interfaces/Teams";
import { auth, db } from "../../../../../common/services/Firebase";
import { CloudinaryService } from "../../../../../common/services/CloudinaryService";
import { EditableTeam } from "../../types";

export const fetchAllTeamsFromCareers = async (): Promise<EditableTeam[]> => {
  const user = auth.currentUser;
  if (!user) return [];

  const careersRef = collection(db, `users/${user.uid}/careers`);
  const snapshot = await getDocs(careersRef);
  const teamMap = new Map<string, EditableTeam>();

  snapshot.docs.forEach((careerDoc) => {
    const careerData = careerDoc.data() as Career;
    if (!careerData.clubData) return;

    careerData.clubData.forEach((season) => {
      season.teams?.forEach((t) => {
        if (!teamMap.has(t.name)) {
          teamMap.set(t.name, {
            ...t,
            originalName: t.name,
            originalBadge: t.badge || "",
          });
        }
      });
    });
  });

  return Array.from(teamMap.values());
};

export const processTeamAction = async (
  team: EditableTeam,
  isDeleting: boolean,
): Promise<string | undefined> => {
  let finalBadgeUrl = team.badge;

  if (!isDeleting && team.file) {
    finalBadgeUrl = await CloudinaryService.uploadImage(team.file);
  }

  const user = auth.currentUser;
  if (!user) throw new Error("Usuário não autenticado");

  const careersRef = collection(db, `users/${user.uid}/careers`);
  const snapshot = await getDocs(careersRef);
  const updatePromises: Promise<void>[] = [];

  snapshot.docs.forEach((careerDoc) => {
    const careerData = careerDoc.data() as Career;
    let hasChanges = false;

    if (!careerData.clubData) return;

    const newClubData = careerData.clubData.map((season) => {
      if (!season.teams) return season;

      const updatedTeams: Teams[] = [];
      season.teams.forEach((t) => {
        if (t.name === team.originalName) {
          if (!isDeleting) {
            updatedTeams.push({
              ...t,
              name: team.name,
              badge: finalBadgeUrl || t.badge,
            });
            hasChanges = true;
          } else {
            hasChanges = true;
          }
        } else {
          updatedTeams.push(t);
        }
      });
      return { ...season, teams: updatedTeams };
    });

    if (hasChanges) {
      updatePromises.push(
        updateDoc(careerDoc.ref, {
          clubData: newClubData,
          updatedAt: Date.now(),
        }),
      );
    }
  });

  await Promise.all(updatePromises);
  return finalBadgeUrl;
};
