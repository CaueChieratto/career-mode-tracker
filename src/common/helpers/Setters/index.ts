import { doc, updateDoc } from "firebase/firestore";
import { Career } from "../../interfaces/Career";
import { db } from "../../services/Firebase";
import { Trophy } from "../../interfaces/club/trophy";
import { withFirestoreRetry } from "../../utils/firestoreRetry";
import { sanitizeFirestoreData } from "../../utils/sanitizeFirestore";

export const updateCareerFirestore = async (
  userId: string,
  careerId: string,
  updates: Partial<Career>,
) => {
  if (Object.keys(updates).length === 0) return;

  const careerRef = doc(db, `users/${userId}/careers/${careerId}`);
  const payload: Partial<Career> = {
    ...updates,
    updatedAt: updates.updatedAt ?? Date.now(),
  };
  await withFirestoreRetry(() =>
    updateDoc(careerRef, sanitizeFirestoreData(payload)),
  );
};

export const updateCareerTrophies = async (
  userId: string,
  careerId: string,
  trophies: Trophy[],
) => {
  const careerRef = doc(db, `users/${userId}/careers/${careerId}`);
  await withFirestoreRetry(() =>
    updateDoc(
      careerRef,
      sanitizeFirestoreData({
        trophies,
        updatedAt: Date.now(),
      }),
    ),
  );
};
