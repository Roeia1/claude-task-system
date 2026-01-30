import type { Page, Route } from '@playwright/test';
import type {
  Epic,
  EpicSummary,
  JournalEntry,
  StoryCounts,
  StoryDetail,
  StoryStatus,
  Task,
  TaskStatus,
} from '../../src/types/dashboard';

/**
 * API mocking utilities for Playwright integration tests.
 * These utilities help mock the dashboard API endpoints for testing
 * various UI states without a real backend.
 */

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Creates a default StoryCounts object.
 */
export function createMockStoryCounts(overrides: Partial<StoryCounts> = {}): StoryCounts {
  return {
    ready: 0,
    inProgress: 0,
    blocked: 0,
    completed: 0,
    total: 0,
    ...overrides,
  };
}

/**
 * Creates a mock Task with sensible defaults.
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Date.now()}`,
    title: 'Mock Task',
    status: 'pending' as TaskStatus,
    ...overrides,
  };
}

/**
 * Creates a mock JournalEntry with sensible defaults.
 */
export function createMockJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    type: 'session',
    title: 'Mock Session',
    content: 'Mock journal entry content',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock EpicSummary with sensible defaults.
 * Used for the epic list view (/api/epics endpoint).
 */
export function createMockEpicSummary(overrides: Partial<EpicSummary> = {}): EpicSummary {
  const slug = overrides.slug || `mock-epic-${Date.now()}`;
  return {
    slug,
    title: overrides.title || 'Mock Epic',
    storyCounts: createMockStoryCounts(overrides.storyCounts),
    isArchived: overrides.isArchived ?? false,
  };
}

/**
 * Creates a mock StoryDetail with sensible defaults.
 * Used for story detail view (/api/stories/:epicSlug/:storySlug endpoint).
 */
export function createMockStoryDetail(overrides: Partial<StoryDetail> = {}): StoryDetail {
  const slug = overrides.slug || `mock-story-${Date.now()}`;
  return {
    slug,
    title: overrides.title || 'Mock Story',
    status: overrides.status || ('ready' as StoryStatus),
    epicSlug: overrides.epicSlug || 'mock-epic',
    tasks: overrides.tasks || [],
    journal: overrides.journal || [],
    content: overrides.content,
  };
}

/**
 * Creates a mock Epic with sensible defaults.
 * Used for epic detail view (/api/epics/:slug endpoint).
 */
export function createMockEpic(overrides: Partial<Epic> = {}): Epic {
  const slug = overrides.slug || `mock-epic-${Date.now()}`;
  const stories = overrides.stories || [];

  // Calculate story counts from stories if not provided
  const storyCounts = overrides.storyCounts || {
    ready: stories.filter((s) => s.status === 'ready').length,
    inProgress: stories.filter((s) => s.status === 'in_progress').length,
    blocked: stories.filter((s) => s.status === 'blocked').length,
    completed: stories.filter((s) => s.status === 'completed').length,
    total: stories.length,
  };

  return {
    slug,
    title: overrides.title || 'Mock Epic',
    content: overrides.content,
    stories,
    storyCounts,
    isArchived: overrides.isArchived ?? false,
  };
}

// ============================================================================
// API Route Mocking Helpers
// ============================================================================
//
// Pattern Strategy:
// - Specialized mocks (mockEpicList, mockEpicDetail, mockStoryDetail) use
//   function matchers for precise URL matching and to avoid conflicts.
// - General-purpose mocks (mockApiError, mockApiDelay, mockNetworkFailure)
//   accept glob patterns from the caller for flexibility.

/**
 * Mocks the GET /api/epics endpoint to return a list of epic summaries.
 * Uses a function matcher to match exactly /api/epics (with optional trailing slash)
 * but NOT /api/epics/some-slug.
 */
export async function mockEpicList(page: Page, epics: EpicSummary[]): Promise<void> {
  await page.route(
    (url) => url.pathname === '/api/epics' || url.pathname === '/api/epics/',
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(epics),
      });
    },
  );
}

/**
 * Mocks the GET /api/epics/:slug endpoint to return epic details.
 * Uses a function matcher to handle the URL properly.
 */
export async function mockEpicDetail(page: Page, epic: Epic): Promise<void> {
  await page.route(
    (url) => url.pathname === `/api/epics/${epic.slug}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(epic),
      });
    },
  );
}

/**
 * Mocks the GET /api/stories/:epicSlug/:storySlug endpoint to return story details.
 * Uses a function matcher to handle the URL properly.
 */
export async function mockStoryDetail(page: Page, story: StoryDetail): Promise<void> {
  await page.route(
    (url) => url.pathname === `/api/stories/${story.epicSlug}/${story.slug}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(story),
      });
    },
  );
}

/** Route pattern type - accepts glob strings, regex, or function matchers */
type RoutePattern = string | RegExp | ((url: URL) => boolean);

/**
 * Mocks an API route to return an error response.
 *
 * @param page - Playwright page object
 * @param routePattern - URL pattern to match (glob like `**\/api/epics`, regex, or function)
 * @param status - HTTP status code (e.g., 500, 404)
 * @param message - Error message to include in response body
 */
export async function mockApiError(
  page: Page,
  routePattern: RoutePattern,
  status: number,
  message: string,
): Promise<void> {
  await page.route(routePattern, async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: message }),
    });
  });
}

/**
 * Options for fulfilling a route response.
 */
export interface FulfillOptions {
  status?: number;
  contentType?: string;
  body?: string;
}

/**
 * Mocks an API route with a delayed response.
 * Useful for testing loading states.
 *
 * @param page - Playwright page object
 * @param routePattern - URL pattern to match (glob like `**\/api/epics`, regex, or function)
 * @param delayMs - Delay in milliseconds before responding
 * @param fulfillOptions - Options for the response (status, contentType, body)
 */
export async function mockApiDelay(
  page: Page,
  routePattern: RoutePattern,
  delayMs: number,
  fulfillOptions: FulfillOptions = {},
): Promise<void> {
  await page.route(routePattern, async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: fulfillOptions.status ?? 200,
      contentType: fulfillOptions.contentType ?? 'application/json',
      body: fulfillOptions.body ?? '[]',
    });
  });
}

/**
 * Mocks an API route to simulate a network failure.
 * The request will be aborted, simulating a connection refused or timeout.
 *
 * @param page - Playwright page object
 * @param routePattern - URL pattern to match (glob like `**\/api/epics`, regex, or function)
 */
export async function mockNetworkFailure(page: Page, routePattern: RoutePattern): Promise<void> {
  await page.route(routePattern, async (route: Route) => {
    await route.abort('connectionrefused');
  });
}

// ============================================================================
// Convenience Helpers
// ============================================================================

/**
 * Sets up a complete mock API environment with sample data.
 * Useful for quick test setup when you need a working dashboard.
 */
export async function setupMockDashboard(page: Page): Promise<{
  epics: EpicSummary[];
  epicDetails: Record<string, Epic>;
}> {
  const epics = [
    createMockEpicSummary({
      slug: 'epic-one',
      title: 'Epic One',
      storyCounts: { ready: 1, inProgress: 1, blocked: 0, completed: 2, total: 4 },
    }),
    createMockEpicSummary({
      slug: 'epic-two',
      title: 'Epic Two',
      storyCounts: { ready: 0, inProgress: 0, blocked: 1, completed: 0, total: 1 },
    }),
  ];

  const epicDetails: Record<string, Epic> = {
    'epic-one': createMockEpic({
      slug: 'epic-one',
      title: 'Epic One',
      content: 'This is the first epic.',
      stories: [
        createMockStoryDetail({
          slug: 'story-1',
          title: 'Story One',
          status: 'ready',
          epicSlug: 'epic-one',
        }),
        createMockStoryDetail({
          slug: 'story-2',
          title: 'Story Two',
          status: 'in_progress',
          epicSlug: 'epic-one',
          tasks: [
            createMockTask({ id: 't1', title: 'Task 1', status: 'completed' }),
            createMockTask({ id: 't2', title: 'Task 2', status: 'in_progress' }),
          ],
        }),
        createMockStoryDetail({
          slug: 'story-3',
          title: 'Story Three',
          status: 'completed',
          epicSlug: 'epic-one',
        }),
        createMockStoryDetail({
          slug: 'story-4',
          title: 'Story Four',
          status: 'completed',
          epicSlug: 'epic-one',
        }),
      ],
    }),
    'epic-two': createMockEpic({
      slug: 'epic-two',
      title: 'Epic Two',
      content: 'This is the second epic.',
      stories: [
        createMockStoryDetail({
          slug: 'blocked-story',
          title: 'Blocked Story',
          status: 'blocked',
          epicSlug: 'epic-two',
          journal: [
            createMockJournalEntry({
              type: 'blocker',
              title: 'Need clarification',
              content: 'Waiting for requirements.',
            }),
          ],
        }),
      ],
    }),
  };

  // Set up all API mocks
  await mockEpicList(page, epics);
  for (const [, epic] of Object.entries(epicDetails)) {
    await mockEpicDetail(page, epic);
    for (const story of epic.stories) {
      await mockStoryDetail(page, story);
    }
  }

  return { epics, epicDetails };
}
