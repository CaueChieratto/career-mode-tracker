import { getCareerById } from "../../helpers/Getters";
import { updateCareerFirestore } from "../../helpers/Setters";
import { ClubData } from "../../interfaces/club/clubData";
import { Career } from "../../interfaces/Career";
import { League } from "../../interfaces/League";
import { Players } from "../../interfaces/playersInfo/players";
import { auth, db } from "../Firebase";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocsFromServer,
  writeBatch,
} from "firebase/firestore";
import { stripHeavyData } from "../../utils/stripHeavyData";
import { getSeasonDateRange } from "../../utils/GetSeasonDateRange";
import { AcademyData } from "../../interfaces/AcademyData";
import { AcademyPlayers } from "../../../pages/Academy/layouts/AcademyContent/interfaces/AcademyPlayers/AcademyPlayers";

export class SeasonCreationConflictError extends Error {
  code = "SEASON_CREATION_CONFLICT";
  constructor(message = "Conflito ao criar temporada concorrentemente.") {
    super(message);
    this.name = "SeasonCreationConflictError";
  }
}

export const ServiceSeasons = {
  addSeason: async (career: Career): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");
    const existingNumbers = career.clubData.map((season) => season.seasonNumber);
    let seasonNumber = 1;
    while (existingNumbers.includes(seasonNumber)) seasonNumber++;

    const previousSeason = career.clubData.find(
      (season) => season.seasonNumber === seasonNumber - 1,
    );
    if (
      previousSeason &&
      career.academy &&
      previousSeason.academyPlayers === undefined
    ) {
      throw new Error(
        "Jogadores da base não foram carregados para criar a temporada.",
      );
    }
    const { startDate: returnDate } = getSeasonDateRange(
      seasonNumber,
      career.createdAt,
      career.nation,
    );
    const playersForNewSeason: Players[] = (previousSeason?.players || [])
      .filter((player) => !player.sell)
      .map((player) => {
        const lastContract = player.contract?.[player.contract.length - 1];
        const shouldReturnLoan =
          player.loan &&
          !player.incomingLoan &&
          (lastContract?.loanDuration ?? 0) <= 1;
        const updatedPlayer: Players = {
          ...player,
          age: (player.age || 0) + 1,
          contractTime: Math.max(0, (player.contractTime || 0) - 1),
          statsLeagues: [],
          ballonDor: 0,
          buy: false,
        };

        if (shouldReturnLoan) {
          updatedPlayer.loan = false;
          updatedPlayer.contract = [
            ...player.contract,
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: lastContract?.leftClub || "Fim de Empréstimo",
              leftClub: "",
              dataArrival: returnDate,
              dataExit: null,
            },
            {
              buyValue: 0,
              sellValue: 0,
              fromClub: "",
              leftClub: "",
              dataArrival: null,
              dataExit: null,
            },
          ];
        } else if (
          player.loan &&
          !player.incomingLoan &&
          (lastContract?.loanDuration ?? 0) > 1
        ) {
          updatedPlayer.contract = player.contract.map((contract, index) =>
            index === player.contract.length - 1
              ? {
                  ...contract,
                  loanDuration: (contract.loanDuration || 0) - 1,
                }
              : contract,
          );
        }

        return updatedPlayer;
      });
    const academyPlayersToCopy: AcademyPlayers[] = (
      previousSeason?.academyPlayers || []
    )
      .filter((player) => player.status === "academy")
      .map((player) => ({ ...player, evolutionHistory: [] }));

    if (1 + playersForNewSeason.length + academyPlayersToCopy.length > 500) {
      throw new Error(
        "A temporada excede o limite de 500 escritas para criação atômica.",
      );
    }

    const careerId = career.id;
    const newSeasonId = `season-${seasonNumber}`;
    const newSeason: ClubData = {
      players: [],
      seasonNumber,
      id: newSeasonId,
      leagues: previousSeason?.leagues || [],
    };
    const batch = writeBatch(db);
    for (const player of playersForNewSeason) {
      batch.set(
        doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${newSeasonId}/players`,
          player.id,
        ),
        player,
      );
    }
    for (const academyPlayer of academyPlayersToCopy) {
      batch.set(
        doc(
          db,
          `users/${user.uid}/careers/${careerId}/seasons/${newSeasonId}/academyPlayers`,
          academyPlayer.id,
        ),
        academyPlayer,
      );
    }
    batch.update(doc(db, `users/${user.uid}/careers/${careerId}`), {
      clubData: arrayUnion(newSeason),
      updatedAt: Math.max(Date.now(), (career.updatedAt || 0) + 1),
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error(
        `[addSeason] ERRO ao tentar criar e salvar a temporada:`,
        error,
      );
      throw error;
    }
  },

  deleteSeason: async (careerId: string, seasonId: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    let storedSeasons: ClubData[] = [];
    const career = await getCareerById(user.uid, careerId, (seasons) => {
      storedSeasons = seasons;
    });
    const updatedClubData = career.clubData.filter(
      (season) => season.id !== seasonId,
    );

    const seasonPath = `users/${user.uid}/careers/${careerId}/seasons/${seasonId}`;

    for (const name of [
      "players",
      "academyPlayers",
      "table",
      "academyTournaments",
    ]) {
      const snapshot = await getDocsFromServer(
        collection(db, `${seasonPath}/${name}`),
      );
      for (const child of snapshot.docs) await deleteDoc(child.ref);
    }

    const matches = await getDocsFromServer(
      collection(db, `${seasonPath}/matches`),
    );
    for (const match of matches.docs) {
      const stats = await getDocsFromServer(
        collection(match.ref, "playerStats"),
      );
      for (const stat of stats.docs) await deleteDoc(stat.ref);
      await deleteDoc(match.ref);
    }

    await deleteDoc(doc(db, seasonPath));
    await updateCareerFirestore(user.uid, careerId, {
      clubData: stripHeavyData(updatedClubData, storedSeasons),
    });
  },

  updateSeasonLeagues: async (
    careerId: string,
    seasonId: string,
    leagues: League[],
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    let storedSeasons: ClubData[] = [];
    const career = await getCareerById(user.uid, careerId, (seasons) => {
      storedSeasons = seasons;
    });
    const updatedClubData = career.clubData.map((season) =>
      season.id === seasonId ? { ...season, leagues } : season,
    );

    await updateCareerFirestore(user.uid, careerId, {
      clubData: stripHeavyData(updatedClubData, storedSeasons),
    });
  },

  updateCurrency: async (careerId: string, currency: string): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    await updateCareerFirestore(user.uid, careerId, {
      currency,
    });
  },

  updateAcademy: async (
    careerId: string,
    academy: AcademyData,
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    await updateCareerFirestore(user.uid, careerId, {
      academy,
    });
  },
};
