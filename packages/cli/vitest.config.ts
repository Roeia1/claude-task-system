import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

// Import the client's vite config to get aliases and plugins for storybook tests
import viteConfig from './src/client/vite.config.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Common browser configuration for visual snapshot testing
const browserConfig = {
  enabled: true,
  headless: true,
  provider: playwright(),
  instances: [{ browser: 'chromium' as const }],
  // Visual snapshot testing configuration
  screenshotDirectory: '__snapshots__',
  expect: {
    toMatchScreenshot: {
      comparatorName: 'pixelmatch' as const,
      comparatorOptions: {
        // Allow small pixel differences for cross-platform consistency
        threshold: 0.2,
        // Allow up to 0.5% pixel mismatch for anti-aliasing differences
        allowedMismatchedPixelRatio: 0.005,
      },
    },
  },
};

const config = defineConfig({
  test: {
    projects: [
      // Unit tests project - runs in Node environment from package root
      {
        test: {
          name: 'unit',
          root: dirname,
          include: ['src/**/*.test.ts'],
          exclude: ['src/client/**'],
        },
      },
      // Client component tests project - runs in jsdom with React Testing Library
      mergeConfig(viteConfig, {
        test: {
          name: 'client',
          root: path.join(dirname, 'src/client'),
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: [path.join(dirname, 'src/client/src/test-setup.ts')],
        },
      }),
      // Storybook tests project - runs in browser with client's vite config
      mergeConfig(viteConfig, {
        plugins: [
          storybookTest({
            configDir: path.join(dirname, 'src/client/.storybook'),
            storybookScript: 'pnpm storybook --no-open',
          }),
        ],
        test: {
          name: 'storybook',
          browser: browserConfig,
          setupFiles: [path.join(dirname, 'src/client/.storybook/vitest.setup.ts')],
        },
      }),
    ],
  },
});

// Vitest config requires default export
export { config as default };
