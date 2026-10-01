import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { statSync } from 'node:fs';

const root = fileURLToPath(new URL('.', import.meta.url));
const firebaseDirectory = path.resolve(root, 'src/common/services/Firebase');
// A regular file cannot contain .env children. Vite 5's envFile flag is only
// honored in InlineConfig, not when exported from a config file.
const noEnvDirectory = path.resolve(root, 'vitest.config.ts');
if (!statSync(noEnvDirectory).isFile()) throw new Error('TEST_ENV_ISOLATION_FAILED');

export function resolveTestFirebaseId(source: string, importer?: string): string | undefined {
  if (source === 'firebase/firestore') return path.resolve(root, 'src/test/mocks/firestore.ts');
  if (source === 'firebase/auth') return path.resolve(root, 'src/test/mocks/auth.ts');
  if (/^(?:firebase|@firebase)(?:\/|$)/.test(source)) throw new Error(`REAL_FIREBASE_BLOCKED: ${source}`);
  if (importer && (source.startsWith('.') || path.isAbsolute(source))) {
    const resolved = path.resolve(path.dirname(importer.split('?')[0]), source);
    if ([firebaseDirectory, path.join(firebaseDirectory, 'index.ts')].includes(resolved)) {
      return path.resolve(root, 'src/test/mocks/firebaseClient.ts');
    }
  }
}

export default defineConfig({
  // Never let Vite load .env.local or any application environment file.
  envDir: noEnvDirectory,
  envPrefix: 'TEST_ONLY_',
  plugins: [{
    name: 'isolated-test-firebase',
    enforce: 'pre',
    resolveId: resolveTestFirebaseId,
  }],
  test: {
    name: 'unit',
    environment: 'node',
    include: ['src/test/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    maxWorkers: 2,
    env: {
      TZ: 'UTC',
      VITE_FIREBASE_PROJECT_ID: 'demo-career-tracker',
      VITE_FIREBASE_API_KEY: 'test-only-not-a-real-key',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.d.ts'],
      reporter: ['text', 'json', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      // No global threshold yet: untested production code remains in the denominator.
    },
  },
});
