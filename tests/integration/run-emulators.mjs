import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { loadGuard } from "./protected-user-guard.cjs";
loadGuard();
const root = fileURLToPath(new URL("../../", import.meta.url));
const env = {
  ...process.env,
  GCLOUD_PROJECT: "demo-career-tracker-integration",
  GOOGLE_CLOUD_PROJECT: "demo-career-tracker-integration",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8089",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9098",
  FIREBASE_EMULATORS_PATH: path.join(root, ".test-tools/emulators"),
  XDG_CONFIG_HOME: path.join(root, ".test-tools/config"),
  CI: "true",
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true",
  TEST_INTEGRATION_COVERAGE: process.argv.includes("--coverage") ? "1" : "0",
};
for (const key of [
  "FIREBASE_TOKEN",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_OAUTH_ACCESS_TOKEN",
  "NODE_OPTIONS",
  "DEBUG",
])
  delete env[key];
const portable = path.join(root, ".test-tools/java");
env.TEST_EMULATOR_ENABLED = "1";
env.TEST_ALL_COVERAGE = process.argv.includes("--all-coverage") ? "1" : "0";
env.TEST_VITEST_ARGS = JSON.stringify(
  process.argv
    .slice(2)
    .filter(
      (arg) => !["--coverage", "--all-coverage", "--start"].includes(arg),
    ),
);
if (existsSync(portable)) {
  const bin = path.join(
    portable,
    readdirSync(portable).find((name) => name.includes("jre")) || "",
    "bin",
  );
  env.PATH = `${bin}${path.delimiter}${env.PATH || env.Path || ""}`;
  delete env.Path;
}
mkdirSync(env.XDG_CONFIG_HOME, { recursive: true });
const guard = path.join(root, "tests/integration/network-guard.cjs");
env.NODE_OPTIONS = `--require "${guard.split(path.sep).join("/")}"`;
const cli = path.join(
  root,
  "tests/emulator-tools/node_modules/firebase-tools/lib/bin/firebase.js",
);
if (!existsSync(cli))
  throw new Error("Run npm ci --prefix tests/emulator-tools first");
const dummyJsonPath = path.join(root, "functions", "dummy.json");
try {
  const crypto = await import("node:crypto");
  const { privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const dummyCreds = {
    type: "service_account",
    project_id: "demo-career-tracker-integration",
    private_key_id: "a",
    private_key: privateKey,
    client_email: "fake@demo.iam.gserviceaccount.com",
    client_id: "1",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/fake%40demo.iam.gserviceaccount.com",
  };
  writeFileSync(dummyJsonPath, JSON.stringify(dummyCreds, null, 2));
  env.GOOGLE_APPLICATION_CREDENTIALS = dummyJsonPath;
} catch (e) {
  console.warn("Failed to generate ephemeral credentials", e);
}

const isStart = process.argv.includes("--start");
const child = spawn(
  process.execPath,
  isStart
    ? [
        cli,
        "emulators:start",
        "--only",
        "firestore,auth,functions",
        "--project",
        env.GCLOUD_PROJECT,
        "--config",
        "firebase.test.json",
      ]
    : [
        cli,
        "emulators:exec",
        "--only",
        "firestore,auth,functions",
        "--project",
        env.GCLOUD_PROJECT,
        "--config",
        "firebase.test.json",
        "node tests/integration/run-vitest.mjs",
      ],
  { cwd: root, stdio: "inherit", env },
);
const cleanup = () => {
  try {
    rmSync(dummyJsonPath, { force: true });
  } catch (e) {}
};
process.on("exit", cleanup);
child.on("exit", (code) => {
  cleanup();
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => {
  try {
    child.kill("SIGINT");
  } catch (e) {}
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  try {
    child.kill("SIGTERM");
  } catch (e) {}
  cleanup();
  process.exit(143);
});
