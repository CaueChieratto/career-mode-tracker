import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signOut } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
const app = initializeApp({
  projectId: "demo-career-tracker-integration",
  apiKey: "fake-performance-key",
  appId: "fake-performance-app",
});
export const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9098", { disableWarnings: true });
export const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8089);
export const functions = getFunctions(app);
connectFunctionsEmulator(functions, "127.0.0.1", 5002);

globalThis.__perfSignOut = () => signOut(auth);
