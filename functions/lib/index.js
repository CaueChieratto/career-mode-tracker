"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCareerRecursive = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
async function manualRecursiveDelete(docRef) {
    const collections = await docRef.listCollections();
    for (const collection of collections) {
        const docs = await collection.listDocuments();
        for (const doc of docs) {
            await manualRecursiveDelete(doc);
        }
    }
    await docRef.delete();
}
exports.deleteCareerRecursive = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const uid = context.auth.uid;
    const careerId = data.careerId;
    if (!careerId ||
        typeof careerId !== "string" ||
        careerId.includes("/") ||
        careerId.includes("\\") ||
        careerId.trim() === "") {
        throw new functions.https.HttpsError("invalid-argument", 'The function must be called with one argument "careerId" containing the career ID to delete.');
    }
    const db = admin.firestore();
    const careerRef = db
        .collection("users")
        .doc(uid)
        .collection("careers")
        .doc(careerId);
    console.log(`Starting manual recursive delete for career ${careerId} of user ${uid}`);
    try {
        await manualRecursiveDelete(careerRef);
        console.log(`Finished recursive delete for career ${careerId}`);
        return { success: true };
    }
    catch (error) {
        console.error("Error during recursive delete:", error);
        throw new functions.https.HttpsError("internal", "An error occurred while deleting the career.");
    }
});
//# sourceMappingURL=index.js.map