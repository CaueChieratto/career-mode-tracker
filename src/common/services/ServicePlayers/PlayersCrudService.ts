import {
  doc,
  setDoc,
  deleteDoc,
  deleteField,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { getCareerById } from "../../helpers/Getters";
import { updateCareerFirestore } from "../../helpers/Setters";
import { Players } from "../../interfaces/playersInfo/players";
import { db } from "../Firebase";
import { requireAuth } from "./helpers/authHelpers";
import { mergeUpdatedContracts } from "./helpers/contractHelpers";
import { getPlayersBySeason } from "./helpers/getPlayersBySeason";
import { sanitizeFirestoreData } from "../../utils/sanitizeFirestore";

export const PlayersCrudService = {
  getPlayersBySeason,

  addPlayerToSeason: async (
    careerId: string,
    seasonId: string,
    player: Omit<Players, "id">,
    globalId?: string,
  ): Promise<Players> => {
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

    const existingInCurrentSeason = career.clubData
      .find((s) => s.id === seasonId)
      ?.players.find((p) => p.id === existingPlayerId);

    const existingContracts = existingInCurrentSeason?.contract || [];
    const incomingContracts = (player.contract || []).filter(
      (ic) =>
        !existingContracts.some(
          (ec) =>
            ec.fromClub === ic.fromClub &&
            ec.leftClub === ic.leftClub &&
            ec.buyValue === ic.buyValue &&
            ec.sellValue === ic.sellValue &&
            ec.dataArrival?.toString() === ic.dataArrival?.toString() &&
            ec.dataExit?.toString() === ic.dataExit?.toString(),
        ),
    );
    const mergedContracts =
      existingContracts.length > 0
        ? [...existingContracts, ...incomingContracts]
        : player.contract;

    const newPlayer: Players = {
      ...player,
      id: existingPlayerId || uuidv4(),
      ...(playedWithUs ? { playedWithUs } : {}),
      ...(mergedContracts ? { contract: mergedContracts } : {}),
    };
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      newPlayer.id,
    );

    await setDoc(playerRef, sanitizeFirestoreData(newPlayer));
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });

    const currentSeason = career.clubData.find((s) => s.id === seasonId);
    if (currentSeason) {
      if (!currentSeason.players) currentSeason.players = [];
      const idx = currentSeason.players.findIndex((p) => p.id === newPlayer.id);
      if (idx >= 0) {
        currentSeason.players[idx] = newPlayer;
      } else {
        currentSeason.players.push(newPlayer);
      }
    }

    return newPlayer;
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

    const firestoreData: Record<string, unknown> = { ...finalPlayer };
    const optionalFields = [
      "playedWithUs",
      "playerValue",
      "salary",
      "contractTime",
      "contractUntil",
    ] as const;

    for (const field of optionalFields) {
      if (
        field in updatedPlayer &&
        (updatedPlayer[field] === undefined ||
          updatedPlayer[field] === null ||
          updatedPlayer[field] === "")
      ) {
        delete (finalPlayer as Record<string, unknown>)[field];
        firestoreData[field] = deleteField();
      }
    }

    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );
    await setDoc(playerRef, sanitizeFirestoreData(firestoreData), { merge: true });
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
