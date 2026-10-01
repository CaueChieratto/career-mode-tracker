const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

function parseGuard(read) {
  let text;
  try {
    text = read();
  } catch {
    throw new Error("TEST_GUARD_REQUIRED");
  }
  const values = [...text.matchAll(/^\s*PROTECTED_USER_UID\s*=\s*(.*?)\s*$/gm)];
  if (values.length !== 1) throw new Error("TEST_GUARD_REQUIRED");
  const uid = values[0][1].replace(/^(['"])(.*)\1$/, "$2");
  if (!uid || /[\s/]/.test(uid)) throw new Error("TEST_GUARD_REQUIRED");
  return createGuard(uid);
}

function createGuard(protectedUid) {
  if (!protectedUid) throw new Error("TEST_GUARD_REQUIRED");
  return {
    assertEnvironment(env, preload) {
      if (
        env.GCLOUD_PROJECT !== "demo-career-tracker-integration" ||
        env.GOOGLE_CLOUD_PROJECT !== "demo-career-tracker-integration" ||
        env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8089" ||
        env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9098" ||
        env.TEST_EMULATOR_ENABLED !== "1" ||
        !preload
      )
        throw new Error("DESTRUCTIVE_TEST_GUARD_REQUIRED");
    },
    assertUid(uid) {
      if (uid === protectedUid) throw new Error("PROTECTED_USER_PATH");
    },
    assertPath(path) {
      const parts = decodeURIComponent(path).split("/");
      if (
        parts.some(
          (part, i) =>
            part === "users" &&
            (parts[i + 1] === protectedUid ||
              parts[i + 1]?.startsWith(protectedUid + ":")),
        )
      )
        throw new Error("PROTECTED_USER_PATH");
    },
    assertRequestText(text) {
      if (text.includes(protectedUid)) throw new Error("PROTECTED_USER_PATH");
    },
  };
}

let guard;
function loadGuard() {
  return (guard ||= parseGuard(() =>
    readFileSync(resolve(__dirname, "../../.env.test.guard.local"), "utf8"),
  ));
}
function assertSafeEnvironment() {
  loadGuard().assertEnvironment(
    process.env,
    globalThis.__EMULATOR_NETWORK_GUARD__ === true,
  );
}
function assertSafePath(path) {
  assertSafeEnvironment();
  loadGuard().assertPath(path);
}
module.exports = {
  createGuard,
  parseGuard,
  loadGuard,
  assertSafeEnvironment,
  assertSafePath,
};
