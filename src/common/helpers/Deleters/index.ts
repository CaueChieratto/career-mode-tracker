import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  DocumentReference,
  getDoc,
  getDocsFromServer,
  writeBatch,
} from "firebase/firestore";
import { auth, db, functions } from "../../services/Firebase";
import { shouldConnectEmulator } from "../../services/Firebase/emulatorGuard";
import { Career } from "../../interfaces/Career";
import { Trophy } from "../../interfaces/club/trophy";

/**
 * Exclusão canônica da árvore de uma carreira via client-side (Web SDK).
 *
 * LIMITAÇÃO CONHECIDA:
 * O client-side cobre 100% da árvore canônica conhecida (career, seasons,
 * players, academyPlayers, table, academyTournaments, matches e playerStats).
 * Não há garantia absoluta sobre órfãos históricos arbitrários/invisíveis
 * que o Web SDK não consegue descobrir (sem documento pai ou sem ID nos metadados),
 * pois o Web SDK não possui as funções de introspecção estrutural do Admin SDK.
 * Esta é uma limitação aceita para operação no plano gratuito (Spark) sem Cloud Functions.
 */
export const deleteCareerClientTree = async (
  uid: string,
  careerId: string,
  batchCommitFn?: (batch: ReturnType<typeof writeBatch>) => Promise<void>,
): Promise<void> => {
  if (
    !careerId ||
    typeof careerId !== "string" ||
    careerId.trim() === "" ||
    careerId.includes("/") ||
    careerId.includes("\\")
  ) {
    throw new Error("careerId inválido");
  }

  if (!uid || typeof uid !== "string") {
    throw new Error("uid inválido");
  }

  const careerRef = doc(db, `users/${uid}/careers/${careerId}`);
  const careerSnap = await getDoc(careerRef);

  const seasonIds = new Set<string>();

  if (careerSnap.exists()) {
    const data = careerSnap.data();
    const clubData = (data?.clubData || []) as { id?: string }[];
    for (const season of clubData) {
      if (season?.id && typeof season.id === "string") {
        seasonIds.add(season.id);
      }
    }
  }

  // Descobrir temporadas pela união de clubData com documentos realmente existentes em seasons
  const seasonsColRef = collection(
    db,
    `users/${uid}/careers/${careerId}/seasons`,
  );
  const seasonsSnap = await getDocsFromServer(seasonsColRef);
  for (const seasonDoc of seasonsSnap.docs) {
    seasonIds.add(seasonDoc.id);
  }

  const playerStatsRefs: DocumentReference[] = [];
  const matchRefs: DocumentReference[] = [];
  const seasonSubcollectionRefs: DocumentReference[] = [];
  const seasonDocRefs: DocumentReference[] = [];

  for (const seasonId of seasonIds) {
    const seasonDocRef = doc(
      db,
      `users/${uid}/careers/${careerId}/seasons/${seasonId}`,
    );
    seasonDocRefs.push(seasonDocRef);

    // 1. Matches e playerStats
    const matchesColRef = collection(
      db,
      `users/${uid}/careers/${careerId}/seasons/${seasonId}/matches`,
    );
    const matchesSnap = await getDocsFromServer(matchesColRef);
    for (const matchDoc of matchesSnap.docs) {
      matchRefs.push(matchDoc.ref);
      const statsColRef = collection(matchDoc.ref, "playerStats");
      const statsSnap = await getDocsFromServer(statsColRef);
      for (const statDoc of statsSnap.docs) {
        playerStatsRefs.push(statDoc.ref);
      }
    }

    // 2. Demais subcoleções conhecidas da temporada
    const subNames = [
      "players",
      "academyPlayers",
      "table",
      "academyTournaments",
    ] as const;
    for (const subName of subNames) {
      const subColRef = collection(
        db,
        `users/${uid}/careers/${careerId}/seasons/${seasonId}/${subName}`,
      );
      const subSnap = await getDocsFromServer(subColRef);
      for (const childDoc of subSnap.docs) {
        seasonSubcollectionRefs.push(childDoc.ref);
      }
    }
  }

  // Ordem estritamente BOTTOM-UP:
  // 1. playerStats
  // 2. matches
  // 3. demais subcollections da season
  // 4. season
  // 5. somente por último o documento da career
  const allRefsToDelete: DocumentReference[] = [
    ...playerStatsRefs,
    ...matchRefs,
    ...seasonSubcollectionRefs,
    ...seasonDocRefs,
    careerRef,
  ];

  const BATCH_SIZE = 400;
  for (let i = 0; i < allRefsToDelete.length; i += BATCH_SIZE) {
    const chunk = allRefsToDelete.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const ref of chunk) {
      batch.delete(ref);
    }
    if (batchCommitFn) {
      await batchCommitFn(batch);
    } else {
      await batch.commit();
    }
  }
};

export const deleteCareerFromFirestore = async (
  careerId: string,
): Promise<void> => {
  const isEmulator = shouldConnectEmulator();

  if (isEmulator) {
    const deleteCareerRecursive = httpsCallable(
      functions,
      "deleteCareerRecursive",
    );
    await deleteCareerRecursive({ careerId });
    return;
  }

  // Modo real manual
  const allowRealManualDelete =
    import.meta.env.VITE_ALLOW_REAL_MANUAL_DELETE === "true";

  if (!allowRealManualDelete) {
    throw new Error(
      "A exclusão manual de carreiras em produção está desabilitada neste ambiente. Para habilitar, configure VITE_ALLOW_REAL_MANUAL_DELETE=true.",
    );
  }

  const user = auth.currentUser;
  if (!user || !user.uid) {
    throw new Error("Usuário não autenticado.");
  }

  await deleteCareerClientTree(user.uid, careerId);
};

export const deleteCareerLocalStorage = (careerId: string) => {
  if (typeof localStorage === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("colorSaved_") && key.endsWith(careerId)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

export const deleteSeasonFromTrophies = (
  career: Career,
  leagueName: string,
  seasonToRemove: string,
): Trophy[] => {
  let trophies: Trophy[] = career.trophies || [];

  trophies = trophies.map((trophy) => {
    if (trophy.leagueName === leagueName) {
      return {
        ...trophy,
        seasons: trophy.seasons.filter((season) => season !== seasonToRemove),
      };
    }
    return trophy;
  });

  trophies = trophies.filter((trophy) => trophy.seasons.length > 0);

  return trophies;
};
