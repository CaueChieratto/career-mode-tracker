import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  envDir: fileURLToPath(import.meta.url), envPrefix: 'TEST_ONLY_',
  test: {
    projects: ['vitest.config.ts', 'vitest.integration.config.ts'],
    maxWorkers: 1, fileParallelism: false,
    coverage: {
      provider: 'v8', include: ['src/**/*.{ts,tsx}'], exclude: ['src/test/**', 'src/**/*.d.ts'],
      reportsDirectory: 'coverage', reporter: ['text-summary', 'json', 'json-summary', 'html'],
    },
  },
});
