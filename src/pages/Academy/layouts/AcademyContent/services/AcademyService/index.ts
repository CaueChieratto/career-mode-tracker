import {
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  doc,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { Players } from "../../../../../../common/interfaces/playersInfo/players";
import { db } from "../../../../../../common/services/Firebase";
import { AcademyPlayers } from "../../interfaces/AcademyPlayers/AcademyPlayers";
import { AcademyTournaments } from "../../interfaces/AcademyTournaments/AcademyTournaments";
import { Career } from "../../../../../../common/interfaces/Career";
import {
  getAsyncUser,
  getAcademyCollection,
  requireUser,
  getAcademyDoc,
} from "./helpers";
import { buildEvolutionHistory } from "./helpers/buildEvolutionHistory";
import { buildPlayerAcademyTournaments } from "./helpers/buildPlayerAcademyTournaments";
import { buildPromotedPlayer } from "./helpers/buildPromotedPlayer";
import { buildReleasedAcademyPlayerUpdate } from "./helpers/buildReleasedAcademyPlayerUpdate";
import { withFirestoreRetry } from "../../../../../../common/utils/firestoreRetry";

export const AcademyService = {
  async getPlayersAcademy(
    careerId: string,
    seasonId: string,
  ): Promise<AcademyPlayers[]> {
    const user = await getAsyncUser();
    const querySnapshot = await getDocs(
      getAcademyCollection(user.uid, careerId, seasonId, "academyPlayers"),
    );
    return querySnapshot.docs.map((doc) => doc.data() as AcademyPlayers);
  },

  async getTournamentsAcademy(
    careerId: string,
    seasonId: string,
  ): Promise<AcademyTournaments[]> {
    const user = await getAsyncUser();
    const querySnapshot = await getDocs(
      getAcademyCollection(user.uid, careerId, seasonId, "academyTournaments"),
    );
    return querySnapshot.docs.map((doc) => doc.data() as AcademyTournaments);
  },

  addPlayerToAcademy: async (
    careerId: string,
    seasonId: string,
    playerData: Omit<AcademyPlayers, "id" | "status" | "evolutionHistory">,
  ): Promise<void> => {
    const user = requireUser();
    const newEvolution = buildEvolutionHistory(
      playerData.arrivalDate,
      "Jogador recrutado para a categoria de base.",
      "none",
      "academy",
    );

    const newAcademyPlayer: AcademyPlayers = {
      ...playerData,
      id: uuidv4(),
      status: "academy",
      evolutionHistory: [newEvolution],
    };

    await setDoc(
      getAcademyDoc(
        user.uid,
        careerId,
        seasonId,
        "academyPlayers",
        newAcademyPlayer.id,
      ),
      newAcademyPlayer,
    );
  },

  addTournamentToAcademy: async (
    careerId: string,
    seasonId: string,
    tournamentData: Omit<AcademyTournaments, "id">,
  ): Promise<void> => {
    const user = requireUser();
    const newTournament: AcademyTournaments = {
      ...tournamentData,
      id: uuidv4(),
    };
    await setDoc(
      getAcademyDoc(
        user.uid,
        careerId,
        seasonId,
        "academyTournaments",
        newTournament.id,
      ),
      newTournament,
    );
  },

  updatePlayerAcademy: async (
    careerId: string,
    seasonId: string,
    updatedPlayer: AcademyPlayers,
  ): Promise<void> => {
    const user = requireUser();
    const docRef = getAcademyDoc(
      user.uid,
      careerId,
      seasonId,
      "academyPlayers",
      updatedPlayer.id,
    );

    await updateDoc(docRef, { ...updatedPlayer });
  },

  updateTournamentAcademy: async (
    careerId: string,
    seasonId: string,
    updatedTournament: AcademyTournaments,
  ): Promise<void> => {
    const user = requireUser();
    const docRef = getAcademyDoc(
      user.uid,
      careerId,
      seasonId,
      "academyTournaments",
      updatedTournament.id,
    );

    await updateDoc(docRef, { ...updatedTournament });
  },

  promotePlayerToProfessional: async (
    career: Career,
    seasonId: string,
    academyPlayer: AcademyPlayers,
    promotionDate?: string,
    academyTournaments: AcademyTournaments[] = [],
  ): Promise<{
    academyPlayer: AcademyPlayers;
    professional: Players;
  }> => {
    const user = requireUser();
    const requestedDate =
      promotionDate || new Date().toLocaleDateString("pt-BR");
    const careerId = career.id;
    const currentSeason = career.clubData.find((season) => season.id === seasonId);
    if (!currentSeason) throw new Error("Temporada não encontrada");
    if (academyPlayer.status === "released") {
      throw new Error("Origem de promoção inválida");
    }

    const careerRef = doc(db, `users/${user.uid}/careers/${careerId}`);
    const academyRef = getAcademyDoc(
      user.uid,
      careerId,
      seasonId,
      "academyPlayers",
      academyPlayer.id,
    );
    const eventId = `promotion:${JSON.stringify([seasonId, academyPlayer.id])}`;

    const linkedPlayers = career.clubData.flatMap((season) =>
      (season.players || []).filter(
        (player) =>
          player.isAcademy && player.academyData?.id === academyPlayer.id,
      ),
    );
    const linkedIds = new Set(linkedPlayers.map((player) => player.id));
    if (linkedIds.size > 1) {
      throw new Error("Mais de um profissional vinculado à mesma origem");
    }

    const professionalId = [...linkedIds][0] || `academy-${academyPlayer.id}`;
    const existing = (currentSeason.players || []).find(
      (player) => player.id === professionalId,
    );
    const history = academyPlayer.evolutionHistory || [];
    const previousEvent =
      history.find((event) => event.id === eventId) ||
      (academyPlayer.status === "promoted"
        ? [...history]
            .reverse()
            .find(
              (event) =>
                event.changedAttribute === "status" &&
                event.oldValue === "academy" &&
                event.newValue === "promoted",
            )
        : undefined);

    if (existing) {
      if (
        academyPlayer.status === "promoted" &&
        previousEvent &&
        existing.isAcademy &&
        existing.academyData?.id === academyPlayer.id &&
        existing.academyData.status === "promoted" &&
        existing.academyHistory?.some(
          (event) => event.id === previousEvent.id,
        )
      ) {
        return { academyPlayer, professional: existing };
      }
      throw new Error("Vínculo de promoção existente inconsistente");
    }
    if (academyPlayer.status === "promoted" && !previousEvent) {
      throw new Error("Histórico de promoção ausente");
    }

    const effectiveDate = previousEvent?.date || requestedDate;
    const promotionEvolution = previousEvent || {
      ...buildEvolutionHistory(
        effectiveDate,
        "Promovido ao elenco profissional.",
        "academy",
        "promoted",
      ),
      id: eventId,
    };
    const promotedAcademyPlayer: AcademyPlayers = {
      ...academyPlayer,
      status: "promoted",
      exitDate:
        academyPlayer.status === "promoted"
          ? academyPlayer.exitDate || effectiveDate
          : effectiveDate,
      evolutionHistory: previousEvent
        ? history
        : [...history, promotionEvolution],
    };
    const professional: Players = {
      ...buildPromotedPlayer(
        promotedAcademyPlayer,
        effectiveDate,
        buildPlayerAcademyTournaments(
          academyTournaments,
          academyPlayer.id,
        ),
        career.academy?.nickname,
      ),
      id: professionalId,
    };
    const professionalRef = getAcademyDoc(
      user.uid,
      careerId,
      seasonId,
      "players",
      professionalId,
    );
    const batch = writeBatch(db);
    batch.set(academyRef, promotedAcademyPlayer, { merge: true });
    batch.set(professionalRef, professional);
    batch.update(careerRef, {
      updatedAt: Math.max(Date.now(), (career.updatedAt || 0) + 1),
    });
    await withFirestoreRetry(() => batch.commit());

    return { academyPlayer: promotedAcademyPlayer, professional };
  },

  releasePlayerAcademy: async (
    careerId: string,
    seasonId: string,
    academyPlayer: AcademyPlayers,
    releaseDate: string,
  ): Promise<void> => {
    const user = requireUser();
    const docRef = getAcademyDoc(
      user.uid,
      careerId,
      seasonId,
      "academyPlayers",
      academyPlayer.id,
    );

    await updateDoc(
      docRef,
      buildReleasedAcademyPlayerUpdate(
        academyPlayer,
        releaseDate,
        deleteField(),
      ),
    );
  },

  deletePlayerAcademy: async (
    careerId: string,
    seasonId: string,
    playerId: string,
  ): Promise<void> => {
    const user = requireUser();
    await deleteDoc(
      getAcademyDoc(user.uid, careerId, seasonId, "academyPlayers", playerId),
    );
  },

  deleteTournamentAcademy: async (
    careerId: string,
    seasonId: string,
    tournamentId: string,
  ): Promise<void> => {
    const user = requireUser();
    await deleteDoc(
      getAcademyDoc(
        user.uid,
        careerId,
        seasonId,
        "academyTournaments",
        tournamentId,
      ),
    );
  },
};
