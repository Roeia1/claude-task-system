import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude Playwright integration tests from Vitest
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/src/client/tests/**', // Playwright tests
    ],
    // Include only .test.ts files, not .spec.ts (used by Playwright)
    include: ['src/**/*.test.ts'],
  },
});
