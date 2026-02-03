/**
 * Worker-scoped Playwright fixture for parallel E2E tests.
 *
 * Each Playwright worker gets:
 * - Its own copy of fixtures in a unique temp directory
 * - Its own server instance on a unique port
 * - Isolated fixture utilities bound to that directory
 *
 * This allows tests to run in parallel without filesystem conflicts.
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { test as base, expect as playwrightExpect } from '@playwright/test';
import { createFixtureUtils, type FixtureUtils } from './fixtures-utils.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Base port for E2E servers - each worker adds its index */
const BASE_PORT = 3850;

/** Timeout for waiting for server to be ready (ms) */
const SERVER_READY_TIMEOUT_MS = 30_000;

/** Interval for polling server health endpoint (ms) */
const SERVER_POLL_INTERVAL_MS = 100;

/** Source fixtures directory (checked into git) */
const SOURCE_FIXTURES = join(__dirname, 'fixtures');

/** CLI dist directory */
const CLI_DIST = join(__dirname, '..', '..', '..');

/** Environment variable key for enabling polling-based file watching */
const sagaUsePollingKey = 'SAGA_USE_POLLING';

/** Playwright built-in fixture key for the base URL */
const baseUrlKey = 'baseURL';

/**
 * Attempt a single poll request to check if the server is ready.
 * Returns true if the server responded with an OK status.
 */
async function tryPoll(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for a server to be ready by polling its health endpoint.
 * Uses a recursive helper to avoid await-in-loop.
 */
function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  async function poll(): Promise<void> {
    if (Date.now() >= deadline) {
      throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
    }
    const ready = await tryPoll(url);
    if (ready) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, SERVER_POLL_INTERVAL_MS));
    return poll();
  }

  return poll();
}

/**
 * Worker-scoped fixtures for parallel E2E tests
 */
interface WorkerFixtures {
  /** Base URL of the server for this worker */
  serverUrl: string;
  /** Fixture utilities bound to this worker's fixtures directory */
  fixtureUtils: FixtureUtils;
}

/**
 * Extended Playwright test with worker-scoped server and fixtures
 */
export const test = base.extend<object, WorkerFixtures>({
  serverUrl: [
    async ({}, use, workerInfo) => {
      const workerId = workerInfo.workerIndex;
      const port = BASE_PORT + workerId;
      const fixturesPath = join(tmpdir(), `saga-e2e-fixtures-${workerId}`);

      // Copy fixtures for this worker
      rmSync(fixturesPath, { recursive: true, force: true });
      cpSync(SOURCE_FIXTURES, fixturesPath, { recursive: true });

      // Start server for this worker with polling enabled for reliable tests
      const server: ChildProcess = spawn(
        'node',
        ['dist/cli.cjs', 'start', '--path', fixturesPath, '--port', String(port)],
        {
          cwd: CLI_DIST,
          stdio: 'pipe',
          env: {
            ...process.env,
            // Use polling for file watching in tests (slower but reliable)
            [sagaUsePollingKey]: '1',
          },
        },
      );

      // Log server output for debugging
      server.stdout?.on('data', (data) => {
        if (process.env.DEBUG) {
          console.log(`[Worker ${workerId}] ${data}`);
        }
      });
      server.stderr?.on('data', (data) => {
        console.error(`[Worker ${workerId} ERROR] ${data}`);
      });

      const serverUrl = `http://localhost:${port}`;

      try {
        await waitForServer(`${serverUrl}/api/health`, SERVER_READY_TIMEOUT_MS);
        await use(serverUrl);
      } finally {
        // Cleanup: kill server and remove fixtures
        server.kill();
        rmSync(fixturesPath, { recursive: true, force: true });
      }
    },
    { scope: 'worker' },
  ],

  fixtureUtils: [
    async ({}, use, workerInfo) => {
      const workerId = workerInfo.workerIndex;
      const fixturesPath = join(tmpdir(), `saga-e2e-fixtures-${workerId}`);
      const utils = createFixtureUtils(fixturesPath);
      await use(utils);
    },
    { scope: 'worker' },
  ],

  // Override baseURL to use worker-specific server
  [baseUrlKey]: async ({ serverUrl }, use) => {
    await use(serverUrl);
  },
});

/** Re-export Playwright's expect for test convenience */
export const expect = playwrightExpect;
