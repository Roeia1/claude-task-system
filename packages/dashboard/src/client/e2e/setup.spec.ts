import { expect, test } from './test-fixture.ts';

// Reset fixtures before each test to ensure clean state
test.beforeEach(async ({ fixtureUtils }) => {
  await fixtureUtils.resetAllFixtures();
});

/** Expected number of fixture epics */
const EXPECTED_EPIC_COUNT = 3;

/**
 * E2E setup verification tests.
 *
 * These tests verify that the Playwright E2E configuration works correctly
 * with the real backend server and test fixtures.
 */

test.describe('E2E Setup Verification', () => {
  test('backend server is running and healthy', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toEqual({ status: 'ok' });
  });

  test('fixtures are loaded correctly - epics API returns fixture data', async ({ request }) => {
    const response = await request.get('/api/epics');
    expect(response.ok()).toBe(true);

    const epics = await response.json();

    // Verify we have the expected fixture epics
    expect(epics).toHaveLength(EXPECTED_EPIC_COUNT);

    const epicIds = epics.map((e: { id: string }) => e.id);
    expect(epicIds).toContain('feature-development');
    expect(epicIds).toContain('empty-epic');
    expect(epicIds).toContain('testing-suite');
  });

  test('dashboard loads in browser', async ({ page }) => {
    await page.goto('/');

    // The dashboard should render with content - verify no error page
    await expect(page.locator('body')).not.toContainText('Cannot GET');

    // Verify actual content loads
    await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();
  });
});
