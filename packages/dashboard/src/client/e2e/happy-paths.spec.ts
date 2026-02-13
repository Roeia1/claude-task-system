import { expect, test } from './test-fixture.ts';

// Reset fixtures before each test to ensure clean state
test.beforeEach(async ({ fixtureUtils }) => {
  await fixtureUtils.resetAllFixtures();
});

/** Test timeout for WebSocket real-time update tests (60 seconds) */
const WEBSOCKET_TEST_TIMEOUT_MS = 60_000;

/** Timeout for WebSocket assertions - polling-based file watching can be slow */
const WEBSOCKET_ASSERTION_TIMEOUT_MS = 20_000;

/** Regex pattern for matching Journal tab name */
const JOURNAL_TAB_PATTERN = /Journal/;

/** Regex pattern for matching Sessions tab name */
const SESSIONS_TAB_PATTERN = /Sessions/;

/**
 * Happy path E2E tests for the SAGA dashboard.
 *
 * These tests verify the complete user flows work correctly with a real backend:
 * - Epic list loading and display
 * - Epic detail navigation and display
 * - Story detail navigation and display (with tasks, journal entries)
 * - Real-time updates via WebSocket when files change
 *
 * Each worker has its own isolated fixtures and server instance.
 */

test.describe('Epic List', () => {
  test('displays all fixture epics with correct information', async ({ page }) => {
    await page.goto('/');

    // Verify all 3 epics are displayed by checking for their card links
    const featureDevCard = page.locator('a[href="/epic/feature-development"]');
    const emptyEpicCard = page.locator('a[href="/epic/empty-epic"]');
    const testingSuiteCard = page.locator('a[href="/epic/testing-suite"]');

    await expect(featureDevCard).toBeVisible();
    await expect(emptyEpicCard).toBeVisible();
    await expect(testingSuiteCard).toBeVisible();

    // Verify epic titles
    await expect(featureDevCard).toContainText('Feature Development');
    await expect(emptyEpicCard).toContainText('Empty Epic');
    await expect(testingSuiteCard).toContainText('Testing Suite');

    // Verify story counts
    await expect(featureDevCard).toContainText('1/2 stories');
    await expect(testingSuiteCard).toContainText('0/2 stories');
    await expect(emptyEpicCard).toContainText('0/0 stories');
  });

  test('displays status badges for epics with stories', async ({ page }) => {
    await page.goto('/');

    // Feature Development should show In Progress and Completed badges
    const featureDevCard = page.locator('a[href="/epic/feature-development"]');
    await expect(featureDevCard).toContainText('In Progress: 1');
    await expect(featureDevCard).toContainText('Completed: 1');

    // Testing Suite: integration-tests has 1 completed + 1 pending task = pending (no in_progress task),
    // unit-tests has all pending tasks = pending. Both stories are pending.
    const testingSuiteCard = page.locator('a[href="/epic/testing-suite"]');
    await expect(testingSuiteCard).toContainText('Pending: 2');
  });
});

test.describe('Epic Detail', () => {
  test('displays epic with stories via direct navigation', async ({ page }) => {
    await page.goto('/epic/feature-development');

    // Verify epic title is displayed as h1 (exclude h1 inside epic-content section)
    await expect(page.locator('h1.text-2xl:has-text("Feature Development")')).toBeVisible();

    // Verify progress indicator shows correct count
    await expect(page.getByText('1/2 stories completed')).toBeVisible();

    // Verify stories are listed
    await expect(page.getByText('User Authentication Implementation')).toBeVisible();
    await expect(page.getByText('RESTful API Design')).toBeVisible();
  });

  test('displays story status badges correctly', async ({ page }) => {
    await page.goto('/epic/feature-development');

    // Auth story should show In Progress badge (story links now go to /story/:storyId)
    const authStoryCard = page.locator('a[href="/story/auth-implementation"]');
    await expect(authStoryCard).toContainText('In Progress');
    await expect(authStoryCard).toContainText('tasks completed');

    // API Design story should show Completed badge
    const apiStoryCard = page.locator('a[href="/story/api-design"]');
    await expect(apiStoryCard).toContainText('Completed');
  });

  test('empty epic shows no stories message', async ({ page }) => {
    await page.goto('/epic/empty-epic');

    // Verify epic title (exclude h1 inside epic-content section)
    await expect(page.locator('h1.text-2xl:has-text("Empty Epic")')).toBeVisible();

    // Verify empty state message
    await expect(page.getByText('No stories in this epic')).toBeVisible();
    await expect(page.getByText('/generate-stories')).toBeVisible();
  });

  test('stories are sorted by status priority', async ({ page }) => {
    // Feature Development has one in_progress (auth-implementation) and one completed (api-design)
    await page.goto('/epic/feature-development');

    // Get all story cards
    const storyCards = page.locator('a[href*="/story/"]');

    // In Progress story (auth-implementation) should appear before Completed story (api-design)
    const firstCard = storyCards.first();
    await expect(firstCard).toContainText('In Progress');
  });
});

test.describe('Story Detail', () => {
  test('displays story via direct navigation', async ({ page }) => {
    // Stories now use /story/:storyId URL pattern
    await page.goto('/story/auth-implementation');

    // Verify story title
    await expect(page.locator('h1:has-text("User Authentication Implementation")')).toBeVisible();

    // Verify status badge (use exact match since 'in progress' also appears in task badges)
    await expect(page.getByText('In Progress', { exact: true })).toBeVisible();

    // Verify task progress
    await expect(page.getByText('1/4 tasks completed')).toBeVisible();

    // Verify tabs are present
    await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Story Content' })).toBeVisible();
    await expect(page.getByRole('tab', { name: JOURNAL_TAB_PATTERN })).toBeVisible();
  });

  test('displays tasks with correct status', async ({ page }) => {
    await page.goto('/story/auth-implementation');

    // Tasks tab should be visible by default
    await expect(page.getByText('Set up JWT token generation')).toBeVisible();
    await expect(page.getByText('Implement login endpoint')).toBeVisible();
    await expect(page.getByText('Add password hashing')).toBeVisible();
    await expect(page.getByText('Create session management')).toBeVisible();

    // Verify status badges are shown
    // Check for completed task badge
    await expect(page.locator('text=completed').first()).toBeVisible();
  });

  test('displays story content tab', async ({ page }) => {
    await page.goto('/story/auth-implementation');

    // Click on Story Content tab
    await page.getByRole('tab', { name: 'Story Content' }).click();

    // Verify Story Content tab is active and displays content section
    await expect(page.getByText('Story Content').first()).toBeVisible();
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });

  test('displays journal entries with all types', async ({ page }) => {
    await page.goto('/story/auth-implementation');

    // Click on Journal tab
    await page.getByRole('tab', { name: JOURNAL_TAB_PATTERN }).click();

    // Verify blocker section exists
    await expect(page.getByText('Blockers (1)')).toBeVisible();
    await expect(page.getByText('Database Connection Issue')).toBeVisible();

    // Verify resolution section
    await expect(page.getByText('Resolutions (1)')).toBeVisible();

    // Verify sessions section
    await expect(page.getByText('Sessions (2)')).toBeVisible();
  });

  test('navigates back to epic from breadcrumb', async ({ page }) => {
    await page.goto('/story/auth-implementation');

    // Wait for breadcrumb to be clickable
    await expect(page.locator('a[href="/epic/feature-development"]').first()).toBeVisible();

    // Click on epic in breadcrumb (link that goes to /epic/feature-development)
    await page.locator('a[href="/epic/feature-development"]').first().click();

    // Verify navigation back to epic
    await expect(page).toHaveURL('/epic/feature-development');
    await expect(page.locator('h1.text-2xl:has-text("Feature Development")')).toBeVisible();
  });
});

test.describe('WebSocket Real-time Updates', () => {
  // WebSocket auto-connection is implemented in the App component on mount.
  // These tests verify real-time updates when files change on disk.
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(WEBSOCKET_TEST_TIMEOUT_MS);

  test('epic list updates when story status changes', async ({ page, fixtureUtils }) => {
    await page.goto('/');

    // Wait for WebSocket connection to be established before modifying files
    await expect(page.locator('[data-ws-connected="true"]')).toBeVisible({
      timeout: 10_000,
    });

    // Verify initial state - Feature Development shows 1 completed
    const featureDevCard = page.locator('a[href="/epic/feature-development"]');
    await expect(featureDevCard).toContainText('Completed: 1');

    // Change all tasks in auth-implementation to completed (status is derived from tasks)
    try {
      await fixtureUtils.writeTaskFile(
        'auth-implementation',
        't2',
        JSON.stringify({
          id: 't2',
          subject: 'Implement login endpoint',
          description: 'Validate credentials against database',
          status: 'completed',
          blockedBy: ['t1'],
        }),
      );
      await fixtureUtils.writeTaskFile(
        'auth-implementation',
        't3',
        JSON.stringify({
          id: 't3',
          subject: 'Add password hashing',
          description: 'Use bcrypt with salt rounds >= 10',
          status: 'completed',
          blockedBy: [],
        }),
      );
      await fixtureUtils.writeTaskFile(
        'auth-implementation',
        't4',
        JSON.stringify({
          id: 't4',
          subject: 'Create session management',
          description: 'Track active sessions and support logout',
          status: 'completed',
          blockedBy: [],
        }),
      );

      // Wait for WebSocket update to be reflected in UI
      // The epic should now show Completed: 2
      await expect(featureDevCard).toContainText('Completed: 2', {
        timeout: WEBSOCKET_ASSERTION_TIMEOUT_MS,
      });
    } finally {
      // Restore original files
      await fixtureUtils.resetAllFixtures();
    }
  });

  test('story detail updates when task file changes', async ({ page, fixtureUtils }) => {
    await page.goto('/story/auth-implementation');

    // Wait for WebSocket connection to be established before modifying files
    await expect(page.locator('[data-ws-connected="true"]')).toBeVisible({
      timeout: 10_000,
    });

    // Verify initial state
    await expect(page.getByText('1/4 tasks completed')).toBeVisible();

    try {
      // Change t2 (login endpoint) from in_progress to completed
      await fixtureUtils.writeTaskFile(
        'auth-implementation',
        't2',
        JSON.stringify({
          id: 't2',
          subject: 'Implement login endpoint',
          description: 'Validate credentials against database',
          status: 'completed',
          blockedBy: ['t1'],
        }),
      );

      // Wait for WebSocket update with longer timeout for file watcher propagation
      await expect(page.getByText('2/4 tasks completed')).toBeVisible({
        timeout: WEBSOCKET_ASSERTION_TIMEOUT_MS,
      });
    } finally {
      // Restore original files
      await fixtureUtils.resetAllFixtures();
    }
  });
});

test.describe('Sessions Tab', () => {
  test('displays Sessions tab in story detail page', async ({ page }) => {
    await page.goto('/story/auth-implementation');

    // Verify Sessions tab is present
    await expect(page.getByRole('tab', { name: SESSIONS_TAB_PATTERN })).toBeVisible();
  });

  test('switches to Sessions tab and shows content', async ({ page }) => {
    // Mock sessions API with test data
    await page.route('**/api/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'saga-story-auth-implementation-12345',
            storyId: 'auth-implementation',
            status: 'running',
            startTime: new Date().toISOString(),
            outputFile: '/tmp/output.jsonl',
            outputAvailable: true,
            outputPreview: 'Running tests...',
          },
        ]),
      });
    });

    await page.goto('/story/auth-implementation');

    // Click Sessions tab
    await page.getByRole('tab', { name: SESSIONS_TAB_PATTERN }).click();

    // Verify Sessions tab is active and content is shown
    await expect(page.getByRole('tab', { name: SESSIONS_TAB_PATTERN })).toHaveAttribute(
      'data-state',
      'active',
    );
    await expect(page.getByTestId('session-detail-card')).toBeVisible();
    await expect(page.getByText('Running')).toBeVisible();
  });

  test('navigates to Sessions tab via URL query parameter', async ({ page }) => {
    // Mock sessions API
    await page.route('**/api/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/story/auth-implementation?tab=sessions');

    // Verify Sessions tab is active
    await expect(page.getByRole('tab', { name: SESSIONS_TAB_PATTERN })).toHaveAttribute(
      'data-state',
      'active',
    );
  });

  test('expands session card to show log viewer', async ({ page }) => {
    const sessionName = 'saga-story-auth-implementation-12345';
    // Mock sessions with outputAvailable: true
    await page.route('**/api/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: sessionName,
            storyId: 'auth-implementation',
            status: 'running',
            startTime: new Date().toISOString(),
            outputFile: '/tmp/output.jsonl',
            outputAvailable: true,
            outputPreview: 'Test output...',
          },
        ]),
      });
    });

    await page.goto('/story/auth-implementation?tab=sessions');

    // The running session should be auto-expanded, verify log viewer is visible
    await expect(page.getByTestId('log-viewer')).toBeVisible();

    // Click on the session card trigger to collapse
    await page.getByTestId('session-card-trigger').click();

    // Verify log viewer is hidden
    await expect(page.getByTestId('log-viewer')).not.toBeVisible();

    // Click on the session card trigger again to expand
    await page.getByTestId('session-card-trigger').click();

    // Verify log viewer appears
    await expect(page.getByTestId('log-viewer')).toBeVisible();
  });

  test('shows empty state when no sessions exist', async ({ page }) => {
    // Mock sessions API with empty response
    await page.route('**/api/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/story/auth-implementation?tab=sessions');

    // Verify empty state is shown
    await expect(page.getByTestId('sessions-panel-empty')).toBeVisible();
    await expect(page.getByText('No sessions found for this story')).toBeVisible();
  });
});

test.describe('ActiveSessions on Home Page', () => {
  test('shows ActiveSessions section when running sessions exist', async ({ page }) => {
    // Mock sessions API with running session
    await page.route('**/api/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'saga-story-auth-implementation-12345',
            storyId: 'auth-implementation',
            status: 'running',
            startTime: new Date().toISOString(),
            outputFile: '/tmp/output.jsonl',
            outputAvailable: true,
            outputPreview: 'Working...',
          },
        ]),
      });
    });

    await page.goto('/');

    // Verify ActiveSessions section is visible with running session
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();
    await expect(page.getByText('auth-implementation')).toBeVisible();
  });

  test('clicking session card navigates to story with sessions tab', async ({ page }) => {
    // Mock sessions API with running session
    await page.route('**/api/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'saga-story-auth-implementation-12345',
            storyId: 'auth-implementation',
            status: 'running',
            startTime: new Date().toISOString(),
            outputFile: '/tmp/output.jsonl',
            outputAvailable: true,
          },
        ]),
      });
    });

    await page.goto('/');

    // Wait for sessions to load
    await expect(page.getByTestId('active-sessions')).toBeVisible();

    // Click on the session card (story link)
    await page.getByText('auth-implementation').click();

    // Verify navigation to story detail with sessions tab
    await expect(page).toHaveURL('/story/auth-implementation?tab=sessions');
  });
});
