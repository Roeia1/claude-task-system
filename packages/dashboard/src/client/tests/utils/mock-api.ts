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
} from '../../src/types/dashboard.ts';

/**
 * API mocking utilities for Playwright integration tests.
 * These utilities help mock the dashboard API endpoints for testing
 * various UI states without a real backend.
 */

// ============================================================================
// Constants
// ============================================================================

/** HTTP 200 OK status code */
const HTTP_OK = 200;

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Creates a default StoryCounts object.
 */
function createMockStoryCounts(overrides: Partial<StoryCounts> = {}): StoryCounts {
  return {
    pending: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
    ...overrides,
  };
}

/**
 * Creates a mock Task with sensible defaults.
 */
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Date.now()}`,
    subject: 'Mock Task',
    description: 'Mock task description',
    status: 'pending' as TaskStatus,
    blockedBy: [],
    ...overrides,
  };
}

/**
 * Creates a mock JournalEntry with sensible defaults.
 */
function createMockJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
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
function createMockEpicSummary(overrides: Partial<EpicSummary> = {}): EpicSummary {
  const { storyCounts: storyCountsOverride, ...rest } = overrides;
  return {
    id: `mock-epic-${Date.now()}`,
    title: 'Mock Epic',
    description: 'Mock epic description',
    status: 'pending' as StoryStatus,
    storyCounts: createMockStoryCounts(storyCountsOverride),
    ...rest,
  };
}

/**
 * Creates a mock StoryDetail with sensible defaults.
 * Used for story detail view (/api/stories/:storyId endpoint).
 */
function createMockStoryDetail(overrides: Partial<StoryDetail> = {}): StoryDetail {
  return {
    id: `mock-story-${Date.now()}`,
    title: 'Mock Story',
    description: 'Mock story description',
    status: 'pending' as StoryStatus,
    epic: 'mock-epic',
    tasks: [],
    journal: [],
    ...overrides,
  };
}

/**
 * Creates a mock Epic with sensible defaults.
 * Used for epic detail view (/api/epics/:epicId endpoint).
 */
function createMockEpic(overrides: Partial<Epic> = {}): Epic {
  const id = overrides.id || `mock-epic-${Date.now()}`;
  const stories = overrides.stories || [];

  // Calculate story counts from stories if not provided
  const storyCounts = overrides.storyCounts || {
    pending: stories.filter((s) => s.status === 'pending').length,
    inProgress: stories.filter((s) => s.status === 'inProgress').length,
    completed: stories.filter((s) => s.status === 'completed').length,
    total: stories.length,
  };

  return {
    id,
    title: 'Mock Epic',
    description: 'Mock epic description',
    status: 'pending' as StoryStatus,
    children: stories.map((s) => ({ id: s.id, blockedBy: [] })),
    stories,
    storyCounts,
    ...overrides,
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

/** Route pattern type - accepts glob strings, regex, or function matchers */
type RoutePattern = string | RegExp | ((url: URL) => boolean);

/**
 * Mocks the GET /api/epics endpoint to return a list of epic summaries.
 * Uses a function matcher to match exactly /api/epics (with optional trailing slash)
 * but NOT /api/epics/some-id.
 */
async function mockEpicList(page: Page, epics: EpicSummary[]): Promise<void> {
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
 * Mocks the GET /api/epics/:epicId endpoint to return epic details.
 * Uses a function matcher to handle the URL properly.
 */
async function mockEpicDetail(page: Page, epic: Epic): Promise<void> {
  await page.route(
    (url) => url.pathname === `/api/epics/${epic.id}`,
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
 * Mocks the GET /api/stories/:storyId endpoint to return story details.
 * Uses a function matcher to handle the URL properly.
 */
async function mockStoryDetail(page: Page, story: StoryDetail): Promise<void> {
  await page.route(
    (url) => url.pathname === `/api/stories/${story.id}`,
    async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(story),
      });
    },
  );
}

/**
 * Session data structure for mocking.
 */
interface MockSession {
  name: string;
  storyId: string;
  status: 'running' | 'completed';
  startTime: string;
  outputPreview?: string;
  outputAvailable?: boolean;
}

/**
 * Mocks the GET /api/sessions endpoint to return session data.
 * Handles query parameters like ?status=running.
 */
async function mockSessions(page: Page, sessions: MockSession[] = []): Promise<void> {
  await page.route(
    (url) => url.pathname === '/api/sessions' || url.pathname === '/api/sessions/',
    async (route: Route) => {
      const url = new URL(route.request().url());
      const statusFilter = url.searchParams.get('status');

      let filteredSessions = sessions;
      if (statusFilter) {
        filteredSessions = sessions.filter((s) => s.status === statusFilter);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(filteredSessions),
      });
    },
  );
}

/**
 * Mocks an API route to return an error response.
 *
 * @param page - Playwright page object
 * @param routePattern - URL pattern to match (glob like `**\/api/epics`, regex, or function)
 * @param status - HTTP status code (e.g., 500, 404)
 * @param message - Error message to include in response body
 */
async function mockApiError(
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
interface FulfillOptions {
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
async function mockApiDelay(
  page: Page,
  routePattern: RoutePattern,
  delayMs: number,
  fulfillOptions: FulfillOptions = {},
): Promise<void> {
  await page.route(routePattern, async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: fulfillOptions.status ?? HTTP_OK,
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
async function mockNetworkFailure(page: Page, routePattern: RoutePattern): Promise<void> {
  await page.route(routePattern, async (route: Route) => {
    await route.abort('connectionrefused');
  });
}

// ============================================================================
// Convenience Helpers
// ============================================================================

/**
 * Creates mock epic summaries for the dashboard.
 */
function createMockEpicSummaries(): EpicSummary[] {
  return [
    createMockEpicSummary({
      id: 'epic-one',
      title: 'Epic One',
      status: 'inProgress',
      storyCounts: {
        pending: 1,
        inProgress: 1,
        completed: 2,
        total: 4,
      },
    }),
    createMockEpicSummary({
      id: 'epic-two',
      title: 'Epic Two',
      status: 'inProgress',
      storyCounts: {
        pending: 0,
        inProgress: 1,
        completed: 0,
        total: 1,
      },
    }),
  ];
}

/**
 * Creates mock epic one with its stories.
 */
function createMockEpicOne(): Epic {
  return createMockEpic({
    id: 'epic-one',
    title: 'Epic One',
    description: 'This is the first epic.',
    status: 'inProgress',
    stories: [
      createMockStoryDetail({
        id: 'story-1',
        title: 'Story One',
        status: 'pending',
        epic: 'epic-one',
      }),
      createMockStoryDetail({
        id: 'story-2',
        title: 'Story Two',
        status: 'inProgress',
        epic: 'epic-one',
        tasks: [
          createMockTask({ id: 't1', subject: 'Task 1', status: 'completed' }),
          createMockTask({ id: 't2', subject: 'Task 2', status: 'inProgress' }),
        ],
      }),
      createMockStoryDetail({
        id: 'story-3',
        title: 'Story Three',
        status: 'completed',
        epic: 'epic-one',
      }),
      createMockStoryDetail({
        id: 'story-4',
        title: 'Story Four',
        status: 'completed',
        epic: 'epic-one',
      }),
    ],
  });
}

/**
 * Creates mock epic two with its stories.
 */
function createMockEpicTwo(): Epic {
  return createMockEpic({
    id: 'epic-two',
    title: 'Epic Two',
    description: 'This is the second epic.',
    status: 'inProgress',
    stories: [
      createMockStoryDetail({
        id: 'in-progress-story',
        title: 'In Progress Story',
        status: 'inProgress',
        epic: 'epic-two',
        journal: [
          createMockJournalEntry({
            type: 'blocker',
            title: 'Need clarification',
            content: 'Waiting for requirements.',
          }),
        ],
      }),
    ],
  });
}

/**
 * Creates standard mock data for the dashboard.
 */
function createMockDashboardData(): {
  epics: EpicSummary[];
  epicDetails: Record<string, Epic>;
} {
  return {
    epics: createMockEpicSummaries(),
    epicDetails: {
      'epic-one': createMockEpicOne(),
      'epic-two': createMockEpicTwo(),
    },
  };
}

/**
 * Sets up all API mocks for the given epic details.
 * Also mocks the sessions endpoint with an empty array by default
 * to prevent proxy errors during integration tests.
 */
async function setupApiMocks(
  page: Page,
  epics: EpicSummary[],
  epicDetails: Record<string, Epic>,
  sessions: MockSession[] = [],
): Promise<void> {
  await mockEpicList(page, epics);
  await mockSessions(page, sessions);

  // Collect all mock promises
  const mockPromises: Promise<void>[] = [];
  for (const epic of Object.values(epicDetails)) {
    mockPromises.push(mockEpicDetail(page, epic));
    for (const story of epic.stories) {
      mockPromises.push(mockStoryDetail(page, story));
    }
  }

  await Promise.all(mockPromises);
}

/**
 * Sets up a complete mock API environment with sample data.
 * Useful for quick test setup when you need a working dashboard.
 */
async function setupMockDashboard(page: Page): Promise<{
  epics: EpicSummary[];
  epicDetails: Record<string, Epic>;
}> {
  const { epics, epicDetails } = createMockDashboardData();
  await setupApiMocks(page, epics, epicDetails);
  return { epics, epicDetails };
}

export {
  createMockStoryCounts,
  createMockTask,
  createMockJournalEntry,
  createMockEpicSummary,
  createMockStoryDetail,
  createMockEpic,
  mockEpicList,
  mockEpicDetail,
  mockStoryDetail,
  mockSessions,
  mockApiError,
  mockApiDelay,
  mockNetworkFailure,
  setupMockDashboard,
};
export type { FulfillOptions, MockSession };
