import { collection, getDocs } from "firebase/firestore";
import { Players } from "../../../interfaces/playersInfo/players";
import { db } from "../../Firebase";
import { requireAuth } from "./authHelpers";
import { parseFirestoreDate } from "./dateHelpers";

export const getPlayersBySeason = async (
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
};

