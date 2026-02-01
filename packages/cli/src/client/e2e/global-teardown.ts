import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Temp fixtures path - must match playwright.e2e.config.ts and fixtures-utils.ts
const TEMP_FIXTURES = join(tmpdir(), 'saga-e2e-fixtures');

/**
 * Global teardown for E2E tests.
 * Cleans up the temp fixtures directory.
 */
export default async function globalTeardown() {
  await rm(TEMP_FIXTURES, { recursive: true, force: true });
}
