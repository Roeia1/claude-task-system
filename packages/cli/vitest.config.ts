import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

// Import the client's vite config to get aliases and plugins for storybook tests
import viteConfig from './src/client/vite.config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
          setupFiles: [path.join(dirname, 'src/client/.storybook/vitest.setup.ts')],
        },
      }),
    ],
  },
});
