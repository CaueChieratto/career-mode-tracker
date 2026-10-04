import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { getCareerById } from "../../helpers/Getters";
import { updateCareerFirestore } from "../../helpers/Setters";
import { Players } from "../../interfaces/playersInfo/players";
import { db } from "../Firebase";
import { requireAuth } from "./helpers/authHelpers";
import { mergeUpdatedContracts } from "./helpers/contractHelpers";
import { parseFirestoreDate } from "./helpers/dateHelpers";

export const PlayersCrudService = {
  getPlayersBySeason: async (
    careerId: string,
    seasonId: string,
  ): Promise<Players[]> => {
    const user = requireAuth();
    const playersRef = collection(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
    );
    const snapshot = await getDocs(playersRef);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      const parsedContracts = (data.contract || []).map(
        (c: Record<string, unknown>) => ({
          ...c,
          dataArrival: parseFirestoreDate(c.dataArrival),
          dataExit: parseFirestoreDate(c.dataExit),
        }),
      );
      return { ...data, contract: parsedContracts } as Players;
    });
  },

  addPlayerToSeason: async (
    careerId: string,
    seasonId: string,
    player: Omit<Players, "id">,
    globalId?: string,
  ): Promise<void> => {
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);

    let existingPlayerId: string | null = globalId || null;
    let playedWithUs: string | undefined = player.playedWithUs;

    if (!existingPlayerId) {
      for (const season of career.clubData) {
        const found = season.players.find(
          (p) =>
            p.name.trim().toLowerCase() === player.name.trim().toLowerCase() &&
            p.nation.trim().toLowerCase() ===
              player.nation.trim().toLowerCase(),
        );
        if (found) {
          existingPlayerId = found.id;
          if (!playedWithUs) {
            playedWithUs = found.playedWithUs || found.id;
          }
          break;
        }
      }
    }

    if (existingPlayerId && !playedWithUs) {
      playedWithUs = existingPlayerId;
    }

    const newPlayer: Players = {
      ...player,
      id: existingPlayerId || uuidv4(),
      ...(playedWithUs ? { playedWithUs } : {}),
    };
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      newPlayer.id,
    );

    await setDoc(playerRef, newPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  editPlayerInSeason: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    updatedPlayer: Partial<Players>,
  ): Promise<void> => {
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const season = career.clubData.find((s) => s.id === seasonId);
    const player = season?.players.find((p) => p.id === playerId);

    if (!player) throw new Error("Jogador não encontrado");

    const mergedContract = mergeUpdatedContracts(player, updatedPlayer);
    const finalPlayer = {
      ...player,
      ...updatedPlayer,
      contract: mergedContract,
    };

    if (
      "playedWithUs" in updatedPlayer &&
      !updatedPlayer.playedWithUs &&
      finalPlayer.playedWithUs
    ) {
      delete finalPlayer.playedWithUs;
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, finalPlayer, { merge: true });
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  deletePlayerFromSeason: async (
    careerId: string,
    seasonId: string,
    playerId: string,
  ): Promise<void> => {
    const user = requireAuth();
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await deleteDoc(playerRef);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },
};
