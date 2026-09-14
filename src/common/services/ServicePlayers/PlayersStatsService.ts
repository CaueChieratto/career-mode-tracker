import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../Firebase";
import { getCareerById } from "../../helpers/Getters";
import { updateCareerFirestore } from "../../helpers/Setters";
import { Career } from "../../interfaces/Career";
import { LeagueStats } from "../../interfaces/playersStats/leagueStats";
import { requireAuth } from "./helpers/authHelpers";
import { Players } from "../../interfaces/playersInfo/players";

export const PlayersStatsService = {
  addLeagueStatsToPlayer: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    leagueStats: LeagueStats[],
  ): Promise<void> => {
    const user = requireAuth();
    const career = await getCareerById(user.uid, careerId);
    const season = career.clubData.find((s) => s.id === seasonId);
    const player = season?.players.find((p) => p.id === playerId);

    if (!player) throw new Error("Jogador não encontrado");

    const finalPlayer = {
      ...player,
      statsLeagues: [...(player.statsLeagues || []), ...leagueStats],
    };
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, finalPlayer);
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  updatePlayerStatsLeagues: async (
    career: Career,
    seasonId: string,
    playerId: string,
    allLeagueStats: LeagueStats[],
  ): Promise<void> => {
    const user = requireAuth();
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${career.id}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, { statsLeagues: allLeagueStats }, { merge: true });
    await updateCareerFirestore(user.uid, career.id, { updatedAt: Date.now() });
  },

  updatePlayerBallonDor: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    ballonDor: number,
  ): Promise<void> => {
    const user = requireAuth();
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    await setDoc(playerRef, { ballonDor }, { merge: true });
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },

  deleteLeagueStatsFromPlayer: async (
    careerId: string,
    seasonId: string,
    playerId: string,
    leagueName: string,
  ): Promise<void> => {
    const user = requireAuth();
    const playerRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/players`,
      playerId,
    );

    const playerSnap = await getDoc(playerRef);
    if (!playerSnap.exists()) throw new Error("Jogador não encontrado");

    const player = playerSnap.data() as Players;
    const updatedStatsLeagues = (player.statsLeagues || []).filter(
      (league) => league.leagueName !== leagueName,
    );

    await setDoc(playerRef, { ...player, statsLeagues: updatedStatsLeagues });
    await updateCareerFirestore(user.uid, careerId, { updatedAt: Date.now() });
  },
};
