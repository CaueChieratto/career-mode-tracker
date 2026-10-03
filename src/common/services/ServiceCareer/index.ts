import { collection, doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { Career } from "../../interfaces/Career";
import { auth, db } from "../Firebase";
import { Trophy } from "../../interfaces/club/trophy";
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
import { mergeTrophies } from "../../helpers/Mergers";
import { CareerGroup } from "../../interfaces/CareerGroup";

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
    await setDoc(careerDoc, career);
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
    } catch (error) {
      console.error("Erro ao atualizar carreira:", error);
      throw error;
    }
  },

  saveClubTrophie: async (
    careerId: string,
    leagueName: string,
    seasons: string[],
  ): Promise<Trophy[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const careerSnap = await getDoc(careerRef);
    if (!careerSnap.exists()) throw new Error("Carreira não encontrada");

    const career = { id: careerSnap.id, ...careerSnap.data() } as Career;
    const updatedTrophies = mergeTrophies(career, leagueName, seasons);
    await updateCareerTrophies(user.uid, careerId, updatedTrophies);

    return updatedTrophies;
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

    batch.set(groupRef, groupDataToSave);

    careerGroup.careers.forEach((career) => {
      const careerRef = doc(db, `users/${user.uid}/careers`, career.id);
      batch.update(careerRef, { groupId: careerGroup.id });
    });

    await batch.commit();
  },

  removeCareerFromGroup: async (
    careerId: string,
    groupId: string,
    remainingCareersIds: string[],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const batch = writeBatch(db);

    const careerRef = doc(db, `users/${user.uid}/careers`, careerId);
    batch.update(careerRef, { groupId: null });

    const groupRef = doc(db, `users/${user.uid}/careerGroups`, groupId);

    if (remainingCareersIds.length <= 1) {
      batch.delete(groupRef);
      if (remainingCareersIds.length === 1) {
        const lastCareerRef = doc(
          db,
          `users/${user.uid}/careers`,
          remainingCareersIds[0],
        );
        batch.update(lastCareerRef, { groupId: null });
      }
    } else {
      batch.update(groupRef, {
        careerIds: remainingCareersIds,
        updatedAt: Date.now(),
      });
    }

    await batch.commit();
  },
};
