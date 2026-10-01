import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getCareerById } from "../../../../common/helpers/Getters";
import { CareerGroup } from "../../../../common/interfaces/CareerGroup";
import { auth, db } from "../../../../common/services/Firebase";

export const ServiceCareerGroup = {
  getById: async (groupId: string): Promise<CareerGroup | null> => {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const groupRef = doc(db, `users/${user.uid}/careerGroups/${groupId}`);
    const snap = await getDoc(groupRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    const careerIds: string[] = data.careerIds || [];

    const careers = (
      await Promise.all(
        careerIds.map(async (id) => {
          try {
            return await getCareerById(user.uid, id);
          } catch (error) {
            if (!(error instanceof Error) || !("code" in error) || error.code !== "career/not-found") {
              throw error;
            }
            console.warn(
              error,
              `Carreira ${id} não encontrada no grupo ${groupId}`,
            );
            return null;
          }
        }),
      )
    ).filter((career): career is NonNullable<typeof career> => career !== null);

    const validCareers = careers.filter(
      (career): career is NonNullable<typeof career> => career !== null,
    );

    if (validCareers.length < careerIds.length) {
      const validCareerIds = validCareers.map((c) => c.id);
      try {
        await updateDoc(groupRef, { careerIds: validCareerIds });
      } catch (updateError) {
        console.error("Erro ao limpar IDs órfãos do grupo:", updateError);
      }
    }

    return {
      id: groupId,
      managerName: data.managerName,
      careers,
      careerIds,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt),
      updatedAt: data.updatedAt,
    };
  },
};
