import { expect, test } from './test-fixture.ts';

// Reset fixtures before each test to ensure clean state
test.beforeEach(async ({ fixtureUtils }) => {
  await fixtureUtils.resetAllFixtures();
});

/** Expected number of fixture stories */
const EXPECTED_STORY_COUNT = 4;

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

  test('fixtures are loaded correctly - stories API returns fixture data', async ({ request }) => {
    const response = await request.get('/api/stories');
    expect(response.ok()).toBe(true);

    const stories = await response.json();

    // Verify we have the expected fixture stories
    expect(stories).toHaveLength(EXPECTED_STORY_COUNT);

    const storyIds = stories.map((s: { id: string }) => s.id);
    expect(storyIds).toContain('auth-implementation');
    expect(storyIds).toContain('api-design');
    expect(storyIds).toContain('unit-tests');
    expect(storyIds).toContain('integration-tests');
  });

  test('dashboard loads in browser', async ({ page }) => {
    await page.goto('/');

    // The dashboard should render with content - verify no error page
    await expect(page.locator('body')).not.toContainText('Cannot GET');

    // Verify Kanban board columns load
    await expect(page.getByTestId('kanban-board')).toBeVisible();
  });
});
