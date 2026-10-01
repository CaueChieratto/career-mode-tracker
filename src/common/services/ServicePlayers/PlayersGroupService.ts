import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../Firebase";
import { Career } from "../../interfaces/Career";
import { ClubData } from "../../interfaces/club/clubData";
import { Players } from "../../interfaces/playersInfo/players";
import { mergeModernAndLegacy } from "../../helpers/mergeModernAndLegacy";
import { ServiceMatches } from "../../../layout/SectionView/features/ClubTabs/AllMatchesTab/views/AddMatches/services/ServiceMatches";
import { augmentSeasonWithMatchStats } from "../../../layout/SectionView/helpers/mergeMatchStats";
import { requireAuth } from "./helpers/authHelpers";
import { parseFirestoreDate } from "./helpers/dateHelpers";
import { aggregatePlayerStats } from "./helpers/statsHelpers";

const fetchCareerSeasonsData = async (
  userUid: string,
  groupId: string,
  maxDate: Date | string,
) => {
  const careersRef = collection(db, `users/${userUid}/careers`);
  const q = query(careersRef, where("groupId", "==", groupId));
  const snapshot = await getDocs(q);

  const currentCareerDate = new Date(maxDate);
  const careersData: { careerData: Career; seasons: ClubData[] }[] = [];

  for (const docSnap of snapshot.docs) {
    const careerData = { ...docSnap.data(), id: docSnap.id } as Career;
    const careerDate = parseFirestoreDate(careerData.createdAt) || new Date(0);

    if (careerDate <= currentCareerDate) {
      const clubData = careerData.clubData || [];
      const enrichedSeasons: ClubData[] = [];

      for (const season of clubData) {
        const playersRef = collection(
          db,
          `users/${userUid}/careers/${docSnap.id}/seasons/${season.id}/players`,
        );
        const playersSnap = await getDocs(playersRef);
        const seasonPlayers = mergeModernAndLegacy(
          playersSnap.docs.map((pDoc) => pDoc.data() as Players),
          season.players || [],
          (p) => p.id,
        );
        const seasonMatches = mergeModernAndLegacy(
          await ServiceMatches.getMatchesBySeason(docSnap.id, season.id),
          season.matches || [],
          (m) => m.matchesId,
        );

        enrichedSeasons.push({
          ...season,
          players: seasonPlayers,
          matches: seasonMatches,
        });
      }

      careersData.push({ careerData, seasons: enrichedSeasons });
    }
  }

  return careersData;
};

export const PlayersGroupService = {
  getAggregatedGroupStats: async (
    groupId: string,
    maxDate: Date | string,
  ): Promise<Players[]> => {
    const user = requireAuth();
    const careersData = await fetchCareerSeasonsData(
      user.uid,
      groupId,
      maxDate,
    );
    const playerHistoryMap = new Map<string, Players[]>();
    for (const { careerData, seasons } of careersData) {
      for (const season of seasons) {
        const augmentedSeason = augmentSeasonWithMatchStats(
          season,
          careerData.clubName,
        );
        augmentedSeason.players.forEach((p) => {
          const uniqueKey = p.id;
          const history = playerHistoryMap.get(uniqueKey) || [];
          playerHistoryMap.set(uniqueKey, [...history, p]);
        });
      }
    }
    return aggregatePlayerStats(playerHistoryMap);
  },

  getGroupSeasonsData: async (
    groupId: string,
    maxDate: Date | string,
  ): Promise<{ clubName: string; season: ClubData; career: Career }[]> => {
    const user = requireAuth();
    const careersData = await fetchCareerSeasonsData(
      user.uid,
      groupId,
      maxDate,
    );

    const result: { clubName: string; season: ClubData; career: Career }[] = [];
    for (const { careerData, seasons } of careersData) {
      for (const season of seasons) {
        const augmentedSeason = augmentSeasonWithMatchStats(
          season,
          careerData.clubName,
        );

        result.push({
          clubName: careerData.clubName,
          season: augmentedSeason,
          career: careerData,
        });
      }
    }
    return result;
  },

  getPastGroupPlayers: async (
    groupId: string,
    maxDate: Date | string,
    currentCareerId: string,
  ): Promise<Players[]> => {
    const user = requireAuth();

    const careersData = await fetchCareerSeasonsData(
      user.uid,
      groupId,
      maxDate,
    );
    const playerHistoryMap = new Map<string, Players[]>();

    for (const { careerData, seasons } of careersData) {
      if (careerData.id === currentCareerId) continue;

      for (const season of seasons) {
        season.players.forEach((player) => {
          const uniqueKey = player.id;
          const history = playerHistoryMap.get(uniqueKey) || [];
          playerHistoryMap.set(uniqueKey, [...history, player]);
        });
      }
    }

    const finalPlayers: Players[] = [];

    playerHistoryMap.forEach((history) => {
      const latestPlayerState = { ...history[history.length - 1] };
      const maxOverall = Math.max(...history.map((p) => p.overall || 0));
      latestPlayerState.overall = maxOverall;

      finalPlayers.push(latestPlayerState);
    });

    return finalPlayers;
  },
};
