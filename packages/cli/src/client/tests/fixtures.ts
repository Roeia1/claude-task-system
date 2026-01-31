import { test as base } from '@playwright/test';
import { mockSessions } from './utils/mock-api.ts';

/**
 * Extended test fixture that automatically mocks the sessions endpoint.
 * This prevents ECONNREFUSED proxy errors during integration tests when
 * the ActiveSessions component fetches running sessions.
 *
 * Usage: Import `test` from this file instead of @playwright/test
 * ```ts
 * import { test, expect } from '../fixtures.ts';
 * ```
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Mock sessions endpoint with empty array before each test
    // This prevents proxy errors when no backend is running
    await mockSessions(page, []);
    await use(page);
  },
});

export { expect } from '@playwright/test';
