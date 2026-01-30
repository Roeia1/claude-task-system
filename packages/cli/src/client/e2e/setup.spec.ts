import { expect, test } from '@playwright/test';
import { resetAllFixtures } from './fixtures-utils';

/**
 * E2E setup verification tests.
 *
 * These tests verify that the Playwright E2E configuration works correctly
 * with the real backend server and test fixtures.
 */

// Reset all fixtures before each test to ensure clean state
test.beforeEach(async () => {
  await resetAllFixtures();
  // Small delay to let file watcher process the reset
  await new Promise((resolve) => setTimeout(resolve, 200));
});

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
    expect(epics).toHaveLength(3);

    const epicSlugs = epics.map((e: { slug: string }) => e.slug);
    expect(epicSlugs).toContain('feature-development');
    expect(epicSlugs).toContain('empty-epic');
    expect(epicSlugs).toContain('testing-suite');
  });

  test('dashboard loads in browser', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load with content
    await expect(page.locator('body')).not.toBeEmpty();

    // The dashboard should render something - verify no error page
    await expect(page.locator('body')).not.toContainText('Cannot GET');
  });
});
