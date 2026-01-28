import { test, expect } from '@playwright/test';

/**
 * Sample integration test to verify Playwright setup.
 * This test will be removed once real tests are added.
 */
test.describe('Dashboard Setup', () => {
  test('should load the dashboard homepage', async ({ page }) => {
    // Mock the API to return an empty epic list
    await page.route('**/api/epics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    // Navigate to the dashboard
    await page.goto('/');

    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');

    // Verify the page loaded (check for common UI elements)
    // The empty state should show guidance about creating an epic
    await expect(page.locator('body')).toBeVisible();
  });
});
