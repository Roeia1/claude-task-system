import { defineConfig, devices } from '@playwright/test';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Playwright configuration for dashboard E2E tests with real backend.
 *
 * Unlike integration tests (playwright.config.ts) that use mocked APIs,
 * these tests start the full Express backend server with test fixtures
 * to validate complete user flows.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// Path to the fixtures directory containing sample .saga/ structure
const fixturesPath = join(__dirname, 'e2e', 'fixtures');

// Port for the E2E test server (different from default 3847 to avoid conflicts)
const E2E_PORT = 3849;

export default defineConfig({
  // Test directory relative to this config file
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : 'html',

  // Shared settings for all projects
  use: {
    // Base URL for navigation - connects to the real backend server
    baseURL: `http://localhost:${E2E_PORT}`,

    // Collect trace on first retry for debugging
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (helpful for E2E debugging)
    video: 'on-first-retry',
  },

  // Configure projects for single browser (Chromium only for speed)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server configuration - starts the full dashboard server with fixtures
  webServer: {
    // Start the dashboard with fixtures directory as the saga root
    // Uses the built CLI (dist/cli.cjs) instead of tsx for reliability
    command: `node dist/cli.cjs dashboard --path "${fixturesPath}" --port ${E2E_PORT}`,
    cwd: join(__dirname, '..', '..'),
    url: `http://localhost:${E2E_PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Capture server output for debugging
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Longer timeouts for E2E tests (real network, real filesystem)
  timeout: 60 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  // Output directory for test artifacts
  outputDir: './e2e/test-results',
});
