import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireEmulators } from "./src/test/emulatorGuard";

const root = fileURLToPath(new URL(".", import.meta.url));
requireEmulators({
  GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST,
  FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
});
if (
  process.env.GCLOUD_PROJECT !== "demo-career-tracker-integration" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8089" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9098"
)
  throw new Error("INTEGRATION_ENV_MISMATCH");

export default defineConfig({
  envDir: path.join(root, "vitest.integration.config.ts"),
  envPrefix: "TEST_ONLY_",
  plugins: [
    {
      name: "emulator-only-client",
      enforce: "pre",
      resolveId(source, importer) {
        const normalized = importer?.replace(/\\/g, "/") || "";
        if (
          source === "firebase/firestore" &&
          !normalized.endsWith("/tests/integration/firestoreBoundary.ts")
        )
          return path.join(root, "tests/integration/firestoreBoundary.ts");
        if (importer && source.startsWith(".")) {
          const resolved = path.resolve(
            path.dirname(importer.split("?")[0]),
            source,
          );
          if (
            [
              path.join(root, "src/common/services/Firebase"),
              path.join(root, "src/common/services/Firebase/index.ts"),
            ].includes(resolved)
          )
            return path.join(root, "tests/integration/firebaseClient.ts");
        }
      },
    },
  ],
  test: {
    name: "integration",
    environment: "node",
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 30000,
    hookTimeout: 30000,
    clearMocks: true,
    restoreMocks: true,
    env: { TZ: "UTC" },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/**/*.d.ts"],
      reportsDirectory: "coverage-integration",
      reporter: ["text-summary", "json", "json-summary", "html"],
    },
  },
});
