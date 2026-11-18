import { collection, doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { Career } from "../../interfaces/Career";
import { auth, db } from "../Firebase";
import { Trophy } from "../../interfaces/club/trophy";
import { League } from "../../interfaces/League";
import { sanitizeFirestoreData } from "../../utils/sanitizeFirestore";
import {
  deleteCareerFromFirestore,
  deleteCareerLocalStorage,
  deleteSeasonFromTrophies,
} from "../../helpers/Deleters";
import { getAllCareers } from "../../helpers/Getters";
import { buildCareerUpdates } from "../../helpers/Builders";
import {
  updateCareerFirestore,
  updateCareerTrophies,
} from "../../helpers/Setters";
import { mergeTrophies, syncSeasonTrophies } from "../../helpers/Mergers";
import { CareerGroup } from "../../interfaces/CareerGroup";
import { notifyCareersUpdated } from "../../hooks/Career/UseCareer";

export const ServiceCareer = {
  getAll: (callback: (careers: Career[]) => void) => {
    const user = auth.currentUser;
    if (!user) {
      callback([]);
      return;
    }

    return getAllCareers(user.uid, callback);
  },

  saveCareer: async (career: Career): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const response = collection(db, `users/${user.uid}/careers`);
    const careerDoc = doc(response, career.id);
    await setDoc(careerDoc, sanitizeFirestoreData(career));
  },

  deleteCareer: async (careerId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    await deleteCareerFromFirestore(careerId);
    deleteCareerLocalStorage(careerId);
  },

  editCareer: async (
    careerId: string,
    colorsTeams?: string[],
    fileDataUrl?: string,
    clubName?: string,
    managerName?: string,
    createdAt?: Date,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const updates = buildCareerUpdates({
      colorsTeams,
      fileDataUrl,
      clubName,
      managerName,
      createdAt,
    });

    try {
      await updateCareerFirestore(user.uid, careerId, updates);
      notifyCareersUpdated((prev) =>
        prev.map((c) =>
          c.id === careerId
            ? {
                ...c,
                ...updates,
                updatedAt: updates.updatedAt ?? Date.now(),
              }
            : c,
        ),
      );
    } catch (error) {
      console.error("Erro ao atualizar carreira:", error);
      throw error;
    }
  },

  saveClubTrophies: async (
    careerId: string,
    leagueNames: string[],
    seasons: string[],
  ): Promise<Trophy[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const careerSnap = await getDoc(careerRef);
    if (!careerSnap.exists()) throw new Error("Carreira não encontrada");

    const career = { id: careerSnap.id, ...careerSnap.data() } as Career;
    let currentTrophies = career.trophies || [];
    for (const leagueName of leagueNames) {
      currentTrophies = mergeTrophies(
        { ...career, trophies: currentTrophies },
        leagueName,
        seasons,
      );
    }
    await updateCareerTrophies(user.uid, careerId, currentTrophies);

    return currentTrophies;
  },

  removeSeason: async (
    careerId: string,
    leagueName: string,
    seasonToRemove: string,
  ): Promise<Trophy[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const careerSnap = await getDoc(careerRef);
    if (!careerSnap.exists()) throw new Error("Carreira não encontrada");

    const career = { id: careerSnap.id, ...careerSnap.data() } as Career;
    const updatedTrophies = deleteSeasonFromTrophies(
      career,
      leagueName,
      seasonToRemove,
    );

    await updateCareerTrophies(user.uid, careerId, updatedTrophies);

    return updatedTrophies;
  },

  syncSeasonTrophies: async (
    careerId: string,
    seasonName: string,
    selectedTrophies: string[],
    availableLeagues?: League[],
  ): Promise<Trophy[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const careerSnap = await getDoc(careerRef);
    if (!careerSnap.exists()) throw new Error("Carreira não encontrada");

    const career = { id: careerSnap.id, ...careerSnap.data() } as Career;
    const updatedTrophies = syncSeasonTrophies(
      career,
      seasonName,
      selectedTrophies,
      availableLeagues,
    );

    await updateCareerTrophies(user.uid, careerId, updatedTrophies);

    return updatedTrophies;
  },

  updateCareerGroupManager: async (
    groupId: string,
    managerName: string,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const groupRef = doc(db, `users/${user.uid}/careerGroups`, groupId);
    await updateDoc(groupRef, {
      managerName,
      updatedAt: Date.now(),
    });
  },

  saveCareerGroup: async (careerGroup: CareerGroup): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const batch = writeBatch(db);

    const groupRef = doc(db, `users/${user.uid}/careerGroups`, careerGroup.id);

    const careerIds = careerGroup.careers.map((c) => c.id);
    const groupDataToSave = {
      id: careerGroup.id,
      managerName: careerGroup.managerName,
      careerIds: careerIds,
      createdAt: careerGroup.createdAt,
      updatedAt: careerGroup.updatedAt || Date.now(),
    };

    batch.set(groupRef, sanitizeFirestoreData(groupDataToSave));

    const now = Date.now();
    careerGroup.careers.forEach((career) => {
      const careerRef = doc(db, `users/${user.uid}/careers`, career.id);
      batch.update(careerRef, { groupId: careerGroup.id, updatedAt: now });
    });

    await batch.commit();

    const groupedCareerIds = careerGroup.careers.map((c) => c.id);
    notifyCareersUpdated((prev) =>
      prev.map((c) => {
        if (groupedCareerIds.includes(c.id)) {
          return { ...c, groupId: careerGroup.id, updatedAt: now };
        }
        return c;
      }),
    );

    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("pastPlayers_")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
  },

  removeCareerFromGroup: async (
    careerId: string,
    groupId: string,
    remainingCareersIds: string[],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const batch = writeBatch(db);

    const now = Date.now();
    const careerRef = doc(db, `users/${user.uid}/careers`, careerId);
    batch.update(careerRef, { groupId: null, updatedAt: now });

    const groupRef = doc(db, `users/${user.uid}/careerGroups`, groupId);

    if (remainingCareersIds.length <= 1) {
      try {
        const groupSnap = await getDoc(groupRef);
        const groupData = groupSnap.data();
        const groupOpponents = groupData?.opponentPlayers;
        if (
          groupOpponents &&
          Array.isArray(groupOpponents) &&
          groupOpponents.length > 0
        ) {
          batch.update(careerRef, { opponentPlayers: groupOpponents });
          if (remainingCareersIds.length === 1) {
            const lastCareerRef = doc(
              db,
              `users/${user.uid}/careers`,
              remainingCareersIds[0],
            );
            batch.update(lastCareerRef, { opponentPlayers: groupOpponents });
          }
        }
      } catch (err) {
        console.warn(
          "Aviso ao preservar opponentPlayers na dissolução de grupo:",
          err,
        );
      }
      batch.delete(groupRef);
      if (remainingCareersIds.length === 1) {
        const lastCareerRef = doc(
          db,
          `users/${user.uid}/careers`,
          remainingCareersIds[0],
        );
        batch.update(lastCareerRef, { groupId: null, updatedAt: now });
      }
    } else {
      batch.update(groupRef, {
        careerIds: remainingCareersIds,
        updatedAt: now,
      });
    }

    await batch.commit();

    notifyCareersUpdated((prev) =>
      prev.map((c) => {
        if (
          c.id === careerId ||
          (remainingCareersIds.length === 1 && c.id === remainingCareersIds[0])
        ) {
          return { ...c, groupId: null, updatedAt: now };
        }
        return c;
      }),
    );

    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith("pastPlayers_")) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch {
        // ignore
      }
    }
  },
};
