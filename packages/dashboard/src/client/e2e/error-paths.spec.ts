import { expect, test } from './test-fixture.ts';

// Reset fixtures before each test to ensure clean state
test.beforeEach(async ({ fixtureUtils }) => {
  await fixtureUtils.resetAllFixtures();
});

/** Regex pattern for matching socket.io routes */
const SOCKET_IO_ROUTE_PATTERN = /\/socket\.io\//;

/** Regex pattern for matching /api/stories endpoint (exact match, not /api/stories/*) */
const API_STORIES_ROUTE_PATTERN = /\/api\/stories$/;

/** Number of Kanban board columns (Pending, In Progress, Completed) */
const KANBAN_COLUMN_COUNT = 3;

/**
 * Error path E2E tests for the SAGA dashboard.
 *
 * These tests verify the dashboard handles error conditions gracefully:
 * - 404 handling for non-existent epic/story
 * - Empty state when no stories exist (Kanban board)
 * - WebSocket disconnection behavior
 *
 * Each worker has its own isolated fixtures and server instance.
 */

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
    // Stories now use /story/:storyId URL pattern
    await page.goto('/story/nonexistent-story');

    // Wait for the story not found error
    await expect(page.getByText('Story not found')).toBeVisible();
    await expect(page.getByText('"nonexistent-story"')).toBeVisible();

    // Verify back link is present
    await expect(page.getByText('Back to epics')).toBeVisible();
  });

  test('back link from epic 404 navigates to home', async ({ page }) => {
    await page.goto('/epic/nonexistent-epic');

    // Wait for 404 page to render
    await expect(page.getByText('Epic not found')).toBeVisible();

    // Click back link
    await page.getByText('Back to epic list').click();

    // Verify navigation to home page (Kanban board)
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible();
  });

  test('back link from story 404 navigates to home', async ({ page }) => {
    await page.goto('/story/nonexistent-story');

    // Wait for 404 page to render
    await expect(page.getByText('Story not found')).toBeVisible();

    // Click back link
    await page.getByText('Back to epics').click();

    // Verify navigation to home page (Kanban board)
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible();
  });
});

test.describe('Empty State Handling', () => {
  test('displays empty columns when saga directory has no stories', async ({
    page,
    fixtureUtils,
  }) => {
    // Delete all epics and stories from the temp fixtures directory
    await fixtureUtils.deleteAllEpics();

    await page.goto('/');

    // Kanban board should render with empty columns showing "No stories"
    await expect(page.getByTestId('kanban-board')).toBeVisible();
    const noStoriesTexts = page.getByText('No stories');
    await expect(noStoriesTexts).toHaveCount(KANBAN_COLUMN_COUNT);
  });

  test('empty epic displays no stories message', async ({ page }) => {
    // This uses the existing empty-epic fixture
    await page.goto('/epic/empty-epic');

    // Verify empty state message
    await expect(page.getByText('No stories in this epic.')).toBeVisible();
    await expect(page.getByText('/generate-stories')).toBeVisible();
  });

  test('epic with deleted stories shows empty state', async ({ page, fixtureUtils }) => {
    // Delete the epic and recreate it with no stories
    await fixtureUtils.deleteEpic('feature-development');
    await fixtureUtils.createEpic('feature-development', 'Feature Development');

    await page.goto('/epic/feature-development');

    // Should show empty state
    await expect(page.getByText('No stories in this epic.')).toBeVisible();
  });
});

test.describe('API Error Handling', () => {
  test('handles network error gracefully on kanban board', async ({ page, fixtureUtils }) => {
    // First delete all stories so there's no data even if a request slips through
    // This handles the race condition with React StrictMode double-renders
    await fixtureUtils.deleteAllEpics();

    // Intercept ALL requests to /api/stories and abort them
    await page.route(API_STORIES_ROUTE_PATTERN, (route) => {
      route.abort('failed');
    });

    await page.goto('/');

    // Wait for network activity to settle
    await page.waitForLoadState('networkidle');

    // Should show error state since fetch failed
    await expect(page.getByTestId('kanban-error')).toBeVisible();
    await expect(page.getByText('Failed to load stories')).toBeVisible();
  });

  test('handles server error (500) on epic detail', async ({ page }) => {
    // Intercept the specific epic API request and return 500
    await page.route('/api/epics/feature-development', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Navigate directly to the epic detail page
    await page.goto('/epic/feature-development');

    // Should show error state
    await expect(page.getByText('Error')).toBeVisible();
    await expect(page.getByText('Failed to load epic')).toBeVisible();

    // Verify back link is present
    await expect(page.getByText('Back to epic list')).toBeVisible();
  });

  test('handles server error (500) on story detail', async ({ page }) => {
    // Intercept the story API request and return 500
    await page.route('/api/stories/auth-implementation', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Navigate directly to the story detail page
    await page.goto('/story/auth-implementation');

    // Should show error state
    await expect(page.getByText('Error')).toBeVisible();
    await expect(page.getByText('Failed to load story')).toBeVisible();

    // Verify back link is present
    await expect(page.getByText('Back to epics')).toBeVisible();
  });
});

test.describe('WebSocket Disconnection', () => {
  // These tests verify the UI doesn't break when WebSocket is unavailable.

  test('dashboard loads and functions without WebSocket connection', async ({ page }) => {
    // Block WebSocket connections
    await page.route(SOCKET_IO_ROUTE_PATTERN, (route) => {
      route.abort('failed');
    });

    // Navigate to the dashboard
    await page.goto('/');

    // Kanban board should still load (HTTP API works independently)
    await expect(page.getByTestId('kanban-board')).toBeVisible();
    await expect(page.getByTestId('column-inProgress')).toContainText(
      'User Authentication Implementation',
    );

    // Navigate to epic detail directly
    await page.goto('/epic/feature-development');
    await expect(page.locator('h1.text-2xl:has-text("Feature Development")')).toBeVisible();

    // Navigate to story detail (story links now go to /story/:storyId)
    await page.locator('a[href="/story/auth-implementation"]').click();

    // Story should display without WebSocket - verify the story title (h1 element)
    await expect(page.locator('h1:has-text("User Authentication")')).toBeVisible();
  });

  test('can navigate between pages when WebSocket is blocked', async ({ page }) => {
    // Block WebSocket from the start
    await page.route('**/socket.io/**', (route) => {
      route.abort('connectionrefused');
    });

    // Load dashboard - Kanban board should render
    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible();

    // Navigate to epic detail directly
    await page.goto('/epic/feature-development');
    await expect(page.locator('h1.text-2xl:has-text("Feature Development")')).toBeVisible();

    // Verify stories are displayed with status names
    await expect(page.getByText('In Progress').first()).toBeVisible();
    await expect(page.getByText('Completed').first()).toBeVisible();
  });
});

test.describe('Dynamic Content Changes', () => {
  // These tests verify the dashboard reflects file system changes correctly
  // (after page refresh, since WebSocket auto-connect is not implemented)

  test('newly created story appears on kanban board after refresh', async ({
    page,
    fixtureUtils,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible();

    // Verify the new story doesn't exist yet
    await expect(page.getByText('New Dynamic Story')).toHaveCount(0);

    // Create a new story in an existing epic (no tasks = pending status)
    await fixtureUtils.createStory('feature-development', 'new-story', 'New Dynamic Story');

    // Refresh the page
    await page.reload();

    // New story should appear in the Pending column
    await expect(page.getByTestId('column-pending')).toContainText('New Dynamic Story');
  });

  test('newly created story appears in epic detail after refresh', async ({
    page,
    fixtureUtils,
  }) => {
    // Create a new story in an existing epic
    await fixtureUtils.createStory('feature-development', 'new-story', 'New Dynamic Story');

    await page.goto('/epic/feature-development');

    // New story should appear
    await expect(page.getByText('New Dynamic Story')).toBeVisible();
  });

  test('deleted stories disappear from kanban board after refresh', async ({
    page,
    fixtureUtils,
  }) => {
    await page.goto('/');

    // Verify stories from testing-suite epic are visible
    await expect(page.getByTestId('column-pending')).toContainText('Unit Testing Framework');

    // Delete the testing-suite epic and its stories
    await fixtureUtils.deleteEpic('testing-suite');

    // Refresh the page
    await page.reload();

    // Wait for board to load
    await expect(page.getByTestId('kanban-board')).toBeVisible();

    // Stories from testing-suite should no longer appear
    await expect(page.getByText('Unit Testing Framework')).toHaveCount(0);
    await expect(page.getByText('Integration Testing Setup')).toHaveCount(0);
  });
});
