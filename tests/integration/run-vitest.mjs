import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assertSafeEnvironment } from "./protected-user-guard.cjs";
assertSafeEnvironment();
const root = fileURLToPath(new URL("../../", import.meta.url));
if (
  process.env.GCLOUD_PROJECT !== "demo-career-tracker-integration" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8089" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9098"
)
  throw new Error("EMULATOR_REQUIRED");
for (const port of [8089, 9098]) {
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    throw new Error(`EMULATOR_UNAVAILABLE:${port}`);
  });
  if (response.status >= 500) throw new Error(`EMULATOR_UNAVAILABLE:${port}`);
}
const args = [
  "--require",
  path.join(root, "tests/integration/network-guard.cjs"),
  path.join(root, "node_modules/vitest/vitest.mjs"),
  "run",
  "--config",
  process.env.TEST_ALL_COVERAGE === "1"
    ? "vitest.all.config.ts"
    : "vitest.integration.config.ts",
];
if (
  process.env.TEST_INTEGRATION_COVERAGE === "1" ||
  process.env.TEST_ALL_COVERAGE === "1"
)
  args.push("--coverage");
const filters = JSON.parse(process.env.TEST_VITEST_ARGS || "[]");
if (!Array.isArray(filters)) throw new Error("INVALID_TEST_FILTER");
for (let i = 0; i < filters.length; i++) {
  if (filters[i] === "-t" && typeof filters[i + 1] === "string") {
    i++;
    continue;
  }
  if (
    typeof filters[i] !== "string" ||
    !/^tests\/integration\/[\w-]+\.test\.tsx?$/.test(filters[i])
  )
    throw new Error("INVALID_TEST_FILTER");
}
args.push(...filters);
const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
