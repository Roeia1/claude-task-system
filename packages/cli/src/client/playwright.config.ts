import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

// Timeout configuration constants
const MS_PER_SECOND = 1000;
const WEB_SERVER_TIMEOUT_SECONDS = 120;
const TEST_TIMEOUT_SECONDS = 30;
const EXPECT_TIMEOUT_SECONDS = 5;

/**
 * Playwright configuration for dashboard integration tests.
 * Uses mocked API responses - no real backend required.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory relative to this config file
  testDir: './tests/integration',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: Boolean(process.env.CI),

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: process.env.CI ? 'github' : 'html',

  // Shared settings for all projects
  use: {
    // Base URL for navigation (Playwright API uses baseURL)
    baseURL: 'http://localhost:5173',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for single browser (Chromium only for speed)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration - starts Vite dev server before tests
  webServer: {
    command: 'vite --config src/client/vite.config.ts',
    cwd: '../..',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: WEB_SERVER_TIMEOUT_SECONDS * MS_PER_SECOND,
  },

  // Test timeouts
  timeout: TEST_TIMEOUT_SECONDS * MS_PER_SECOND,
  expect: {
    timeout: EXPECT_TIMEOUT_SECONDS * MS_PER_SECOND,
  },
});
