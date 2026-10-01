import { doc, writeBatch } from "firebase/firestore";
import { auth, db } from "../../../../common/services/Firebase";
import { PlayerMatchStat } from "../../../../common/interfaces/PlayerMatchStat";
import { SavedLineup } from "../../../../common/interfaces/Lineup";

export const ServiceLineup = {
  saveLineupToMatch: async (
    careerId: string,
    seasonId: string,
    matchesId: string,
    lineup: SavedLineup,
    playerStats: PlayerMatchStat[],
    removedPlayerIds: string[] = [],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const removedIds = Array.from(new Set(removedPlayerIds));
    const statsByPlayer = new Map(
      playerStats.map((stat) => [stat.playerId, stat]),
    );
    const statsToSave = Array.from(statsByPlayer.values());
    const writeCount = removedIds.length + statsToSave.length + 2;
    if (writeCount > 500) {
      throw new Error(
        "A atualização de escalação excede o limite de 500 escritas para commit atômico.",
      );
    }

    const matchRef = doc(
      db,
      `users/${user.uid}/careers/${careerId}/seasons/${seasonId}/matches`,
      matchesId,
    );
    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const batch = writeBatch(db);

    for (const playerId of removedIds) {
      batch.delete(doc(matchRef, "playerStats", playerId));
    }
    for (const stat of statsToSave) {
      batch.set(doc(matchRef, "playerStats", stat.playerId), stat, {
        merge: true,
      });
    }
    batch.update(matchRef, {
      lineup,
      playerStats: statsToSave,
      _playerStatsVersion: 1,
    });
    batch.update(careerRef, { updatedAt: Date.now() });
    await batch.commit();
  },
};
