import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  inMemoryPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { requireEmulators } from "../../src/test/emulatorGuard";
import { assertSafeEnvironment } from "./protected-user-guard.cjs";
assertSafeEnvironment();

export const projectId = "demo-career-tracker-integration";
requireEmulators({
  GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
  FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
});
if (
  process.env.GCLOUD_PROJECT !== projectId ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8089" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9098"
)
  throw new Error("INTEGRATION_ENV_MISMATCH");
const app = initializeApp(
  { projectId, apiKey: "fake-emulator-key", appId: "test-only-app" },
  "integration",
);
export const auth = initializeAuth(app, { persistence: inMemoryPersistence });
connectAuthEmulator(auth, "http://127.0.0.1:9098", { disableWarnings: true });
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
connectFirestoreEmulator(db, "127.0.0.1", 8089);
export const functions = getFunctions(app);
connectFunctionsEmulator(functions, "127.0.0.1", 5002);
