import { expect, test } from '@playwright/test';
import {
  createEpic,
  createStory,
  deleteAllEpics,
  deleteEpic,
  resetAllFixtures,
} from './fixtures-utils.ts';

/** Regex pattern for matching socket.io routes */
const SOCKET_IO_ROUTE_PATTERN = /\/socket\.io\//;

/**
 * Error path E2E tests for the SAGA dashboard.
 *
 * These tests verify the dashboard handles error conditions gracefully:
 * - 404 handling for non-existent epic/story
 * - Empty state when no epics exist
 * - WebSocket disconnection behavior
 *
 * Fixtures are reset before each test to ensure a clean state.
 */

// Reset all fixtures before each test to ensure clean state
test.beforeEach(async () => {
  await resetAllFixtures();
});

test.describe('404 Error Handling', () => {
  test('displays error message for non-existent epic', async ({ page }) => {
    await page.goto('/epic/nonexistent-epic');

    // Wait for the React router to handle the navigation and API call
    await expect(page.getByText('Epic not found')).toBeVisible();
    await expect(page.getByText('"nonexistent-epic"')).toBeVisible();

    // Verify back link is present
    await expect(page.getByText('Back to epic list')).toBeVisible();
  });

  test('displays error message for non-existent story', async ({ page }) => {
    await page.goto('/epic/feature-development/story/nonexistent-story');

    // Wait for the story not found error
    await expect(page.getByText('Story not found')).toBeVisible();
    await expect(page.getByText('"nonexistent-story"')).toBeVisible();
    await expect(page.getByText('"feature-development"')).toBeVisible();

    // Verify back link to epic is present
    await expect(page.getByText('Back to epic')).toBeVisible();
  });

  test('back link from epic 404 navigates to epic list', async ({ page }) => {
    await page.goto('/epic/nonexistent-epic');

    // Wait for 404 page to render
    await expect(page.getByText('Epic not found')).toBeVisible();

    // Click back link
    await page.getByText('Back to epic list').click();

    // Verify navigation to home page
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();
  });

  test('back link from story 404 navigates to epic', async ({ page }) => {
    await page.goto('/epic/feature-development/story/nonexistent-story');

    // Wait for 404 page to render
    await expect(page.getByText('Story not found')).toBeVisible();

    // Click back link
    await page.getByText('Back to epic').click();

    // Verify navigation to the epic page
    await expect(page).toHaveURL('/epic/feature-development');
    await expect(page.locator('h1.text-2xl:has-text("Feature Development")')).toBeVisible();
  });
});

test.describe('Empty State Handling', () => {
  test('displays no epics message when saga directory is empty', async ({ page }) => {
    // Delete all epics from the temp fixtures directory
    await deleteAllEpics();

    await page.goto('/');

    // Should show empty state
    await expect(page.getByText('No epics found.')).toBeVisible();
    await expect(page.getByText('/create-epic')).toBeVisible();
  });

  test('empty epic displays no stories message', async ({ page }) => {
    // This uses the existing empty-epic fixture
    await page.goto('/epic/empty-epic');

    // Verify empty state message
    await expect(page.getByText('No stories in this epic.')).toBeVisible();
    await expect(page.getByText('/generate-stories')).toBeVisible();
  });

  test('epic with deleted stories shows empty state', async ({ page }) => {
    // Delete all stories from feature-development by recreating it as empty
    await deleteEpic('feature-development');
    await createEpic('feature-development', 'Feature Development');

    await page.goto('/epic/feature-development');

    // Should show empty state
    await expect(page.getByText('No stories in this epic.')).toBeVisible();
  });
});

test.describe('API Error Handling', () => {
  test('handles network error gracefully on epic list', async ({ page }) => {
    // Intercept the API request and abort it to simulate network error
    await page.route('/api/epics', (route) => {
      route.abort('failed');
    });

    await page.goto('/');

    // The page should handle the error gracefully
    // Based on EpicList.tsx, errors trigger a toast but don't show an error state
    // Should show empty state since fetch failed silently (toast is shown)
    await expect(page.getByText('No epics found.')).toBeVisible();
  });

  test('handles server error (500) on epic detail', async ({ page }) => {
    // First load the epic list normally
    await page.goto('/');
    await expect(page.locator('a[href="/epic/feature-development"]')).toBeVisible();

    // Intercept the specific epic API request and return 500
    await page.route('/api/epics/feature-development', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Navigate to the epic
    await page.locator('a[href="/epic/feature-development"]').click();

    // Should show error state (based on EpicDetail.tsx line 166-177)
    await expect(page.getByText('Error')).toBeVisible();
    await expect(page.getByText('Failed to load epic')).toBeVisible();

    // Verify back link is present
    await expect(page.getByText('Back to epic list')).toBeVisible();
  });

  test('handles server error (500) on story detail', async ({ page }) => {
    // Navigate to epic first
    await page.goto('/epic/feature-development');
    await expect(
      page.locator('a[href="/epic/feature-development/story/auth-implementation"]'),
    ).toBeVisible();

    // Intercept the story API request and return 500
    await page.route('/api/stories/feature-development/auth-implementation', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Navigate to the story
    await page.locator('a[href="/epic/feature-development/story/auth-implementation"]').click();

    // Should show error state (based on StoryDetail.tsx line 251-262)
    await expect(page.getByText('Error')).toBeVisible();
    await expect(page.getByText('Failed to load story')).toBeVisible();

    // Verify back link is present
    await expect(page.getByText('Back to epic')).toBeVisible();
  });
});

test.describe('WebSocket Disconnection', () => {
  // WebSocket tests are challenging because the dashboard doesn't auto-connect to WebSocket.
  // The WebSocket connection is only initiated when connect() is explicitly called.
  // These tests verify the UI doesn't break when WebSocket is unavailable.

  test('dashboard loads and functions without WebSocket connection', async ({ page }) => {
    // Block WebSocket connections
    await page.route(SOCKET_IO_ROUTE_PATTERN, (route) => {
      route.abort('failed');
    });

    // Navigate to the dashboard
    await page.goto('/');

    // Dashboard should still load and function (HTTP API works independently)
    await expect(page.locator('a[href="/epic/feature-development"]')).toBeVisible();

    // Navigate to epic detail
    await page.locator('a[href="/epic/feature-development"]').click();
    await expect(page.locator('h1.text-2xl:has-text("Feature Development")')).toBeVisible();

    // Navigate to story detail
    await page.locator('a[href="/epic/feature-development/story/auth-implementation"]').click();

    // Story should display without WebSocket - verify the story title (h1 element)
    await expect(page.locator('h1:has-text("User Authentication")')).toBeVisible();
  });

  test('can navigate between pages when WebSocket is blocked', async ({ page }) => {
    // Block WebSocket from the start
    await page.route('**/socket.io/**', (route) => {
      route.abort('connectionrefused');
    });

    // Load dashboard
    await page.goto('/');

    // Verify can navigate to testing-suite epic (different from first test)
    await page.locator('a[href="/epic/testing-suite"]').click();
    await expect(page.locator('h1.text-2xl:has-text("Testing Suite")')).toBeVisible();

    // Verify stories are displayed
    await expect(page.getByText('Ready')).toBeVisible();
    await expect(page.getByText('Blocked')).toBeVisible();
  });
});

test.describe('Dynamic Content Changes', () => {
  // These tests verify the dashboard reflects file system changes correctly
  // (after page refresh, since WebSocket auto-connect is not implemented)

  test('newly created epic appears after refresh', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/epic/feature-development"]')).toBeVisible();

    // Verify the new epic doesn't exist yet
    await expect(page.locator('a[href="/epic/dynamic-epic"]')).toHaveCount(0);

    // Create a new epic
    await createEpic('dynamic-epic', 'Dynamic Epic');

    // Refresh the page
    await page.reload();

    // New epic card should appear with title
    const epicCard = page.locator('a[href="/epic/dynamic-epic"]');
    await expect(epicCard).toBeVisible();
    await expect(epicCard).toContainText('Dynamic Epic');
  });

  test('newly created story appears after refresh', async ({ page }) => {
    // Create a new story in an existing epic
    await createStory('feature-development', 'new-story', 'New Dynamic Story', 'ready');

    await page.goto('/epic/feature-development');

    // New story should appear
    await expect(page.getByText('New Dynamic Story')).toBeVisible();
  });

  test('deleted epic disappears after refresh', async ({ page }) => {
    await page.goto('/');

    // Verify empty-epic exists
    await expect(page.locator('a[href="/epic/empty-epic"]')).toBeVisible();

    // Delete the epic
    await deleteEpic('empty-epic');

    // Refresh the page
    await page.reload();

    // Wait for other epics to load first
    await expect(page.locator('a[href="/epic/feature-development"]')).toBeVisible();

    // Epic should no longer appear
    await expect(page.locator('a[href="/epic/empty-epic"]')).toHaveCount(0);
  });
});
