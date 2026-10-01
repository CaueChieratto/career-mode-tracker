import { beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import { terminate, waitForPendingWrites } from "firebase/firestore";
import { db } from "./firebaseClient";
import { boundary } from "./firestoreBoundary";
import { login, resetData } from "./helpers";
const ids = vi.hoisted(() => ({ count: 0 }));
vi.mock("uuid", () => ({ v4: () => `generated-${++ids.count}` }));

beforeAll(async () => {
  if (
    !(globalThis as { __EMULATOR_NETWORK_GUARD__?: boolean })
      .__EMULATOR_NETWORK_GUARD__
  ) {
    throw new Error("NETWORK_GUARD_REQUIRED: run npm run test:firebase");
  }
  vi.stubEnv("VITE_USE_FIREBASE_EMULATOR", "true");
  await login("b");
});
beforeEach(async () => {
  boundary.hook = undefined;
  boundary.calls = [];
  ids.count = 0;
  await login("a");
  await resetData();
});
afterEach(async () => {
  boundary.hook = undefined;
  await waitForPendingWrites(db);
  vi.useRealTimers();
});
afterAll(async () => {
  await terminate(db);
});
