import { cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

// Timeout configuration constants
const MS_PER_SECOND = 1000;
const WEB_SERVER_TIMEOUT_SECONDS = 120;
const TEST_TIMEOUT_SECONDS = 60;
const EXPECT_TIMEOUT_SECONDS = 10;

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Playwright configuration for dashboard E2E tests with real backend.
 *
 * Unlike integration tests (playwright.config.ts) that use mocked APIs,
 * these tests start the full Express backend server with test fixtures
 * to validate complete user flows.
 *
 * Fixtures are copied to a temp directory before each test run so tests
 * can freely modify them without affecting the source fixtures.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// Source fixtures (checked into git)
const sourceFixtures = join(__dirname, 'e2e', 'fixtures');

// Temp directory for fixtures - must match fixtures-utils.ts
const fixturesPath = join(tmpdir(), 'saga-e2e-fixtures');

// Copy fixtures only in the main Playwright process (not in workers)
// Workers have TEST_WORKER_INDEX set, main process does not
if (!process.env.TEST_WORKER_INDEX) {
  // Always delete first (force: true means no error if doesn't exist)
  rmSync(fixturesPath, { recursive: true, force: true });
  cpSync(sourceFixtures, fixturesPath, { recursive: true });
}

// Port for the E2E test server (different from default 3847 to avoid conflicts)
const E2E_PORT = 3849;

export default defineConfig({
  // Global teardown cleans up temp fixtures
  globalTeardown: './e2e/global-teardown.ts',

  // Test directory relative to this config file
  testDir: './e2e',

  // Run tests serially since they share filesystem state
  // Tests that modify fixtures would interfere with each other if run in parallel
  fullyParallel: false,

  // Use single worker since tests share filesystem state
  workers: 1,

  // Stop on first failure to fail fast
  maxFailures: 1,

  // Reporter configuration
  reporter: 'html',

  // Shared settings for all projects
  use: {
    // Base URL for navigation - connects to the real backend server (Playwright API uses baseURL)
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
    // Start the dashboard with temp fixtures directory as the saga root
    // Uses the built CLI (dist/cli.cjs) instead of tsx for reliability
    command: `node dist/cli.cjs dashboard --path "${fixturesPath}" --port ${E2E_PORT}`,
    cwd: join(__dirname, '..', '..'),
    url: `http://localhost:${E2E_PORT}/api/health`,
    reuseExistingServer: true,
    timeout: WEB_SERVER_TIMEOUT_SECONDS * MS_PER_SECOND,
    // Capture server output for debugging
    stdout: 'pipe',
    stderr: 'pipe',
    // Use native file watching for faster and more reliable e2e tests
    env: {
      ...process.env,
      // biome-ignore lint/style/useNamingConvention: environment variable name
      SAGA_USE_NATIVE_WATCHER: '1',
    },
  },

  // Longer timeouts for E2E tests (real network, real filesystem)
  timeout: TEST_TIMEOUT_SECONDS * MS_PER_SECOND,
  expect: {
    timeout: EXPECT_TIMEOUT_SECONDS * MS_PER_SECOND,
  },

  // Output directory for test artifacts
  outputDir: './e2e/test-results',
});
