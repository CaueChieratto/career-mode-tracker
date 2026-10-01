import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

async function manualRecursiveDelete(
  docRef: admin.firestore.DocumentReference,
) {
  const collections = await docRef.listCollections();
  for (const collection of collections) {
    const docs = await collection.listDocuments();
    for (const doc of docs) {
      await manualRecursiveDelete(doc);
    }
  }
  await docRef.delete();
}

export const deleteCareerRecursive = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
      );
    }

    const uid = context.auth.uid;
    const careerId = data.careerId;

    if (
      !careerId ||
      typeof careerId !== "string" ||
      careerId.includes("/") ||
      careerId.includes("\\") ||
      careerId.trim() === ""
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        'The function must be called with one argument "careerId" containing the career ID to delete.',
      );
    }

    const db = admin.firestore();
    const careerRef = db
      .collection("users")
      .doc(uid)
      .collection("careers")
      .doc(careerId);

    console.log(
      `Starting manual recursive delete for career ${careerId} of user ${uid}`,
    );
    try {
      await manualRecursiveDelete(careerRef);
      console.log(`Finished recursive delete for career ${careerId}`);
      return { success: true };
    } catch (error) {
      console.error("Error during recursive delete:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while deleting the career.",
      );
    }
  },
);
