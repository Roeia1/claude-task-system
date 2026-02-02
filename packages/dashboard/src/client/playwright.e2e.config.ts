import { defineConfig, devices } from "@playwright/test";

// Timeout configuration constants
const MS_PER_SECOND = 1000;
const TEST_TIMEOUT_SECONDS = 60;
const EXPECT_TIMEOUT_SECONDS = 10;

/**
 * Playwright configuration for dashboard E2E tests with real backend.
 *
 * Each worker gets its own:
 * - Copy of fixtures in a unique temp directory
 * - Server instance on a unique port (3850 + workerIndex)
 *
 * This allows tests to run in parallel without filesystem conflicts.
 * The worker fixtures are set up in e2e/test-fixture.ts.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

export default defineConfig({
	// Test directory relative to this config file
	testDir: "./e2e",

	// Run tests in parallel - each worker has isolated fixtures and server
	fullyParallel: true,

	// Retry once on failure (polling mode should be reliable)
	retries: 1,

	// Reporter configuration
	reporter: "html",

	// Shared settings for all projects
	use: {
		// Collect trace on first retry for debugging
		trace: "on-first-retry",

		// Screenshot on failure
		screenshot: "only-on-failure",

		// Video on failure (helpful for E2E debugging)
		video: "on-first-retry",
	},

	// Configure projects for single browser (Chromium only for speed)
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	// No global webServer - each worker starts its own server via test-fixture.ts

	// Longer timeouts for E2E tests (real network, real filesystem)
	timeout: TEST_TIMEOUT_SECONDS * MS_PER_SECOND,
	expect: {
		timeout: EXPECT_TIMEOUT_SECONDS * MS_PER_SECOND,
	},

	// Output directory for test artifacts
	outputDir: "./e2e/test-results",
});
