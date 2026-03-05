import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockStoryDetail,
  mockAllStories,
  mockApiDelay,
  mockEpicDetail,
  mockSessions,
  mockStoryDetail,
} from '../utils/mock-api.ts';

// Regex patterns defined at module level for performance
const OPEN_STORY_REGEX = /Open story/;

// HTTP Status Codes
const HTTP_OK = 200;

// Delay durations (ms)
const DELAY_SHORT_MS = 100;
const DELAY_TRANSITION_MS = 500;
const DELAY_MEDIUM_MS = 1000;
const DELAY_LONG_MS = 1500;
const DELAY_VERY_LONG_MS = 2000;

// Timeouts (ms)
const CONTENT_TIMEOUT_MS = 5000;
const LOADING_TIMEOUT_MS = 10_000;

/**
 * Loading state tests for the dashboard.
 * These tests verify that skeleton loaders appear while waiting for API responses
 * and disappear after data loads.
 */
test.describe('Loading States', () => {
  test.describe('Kanban Board (Home Page)', () => {
    test('should show skeleton loaders while loading stories', async ({ page }) => {
      const stories = [
        createMockStoryDetail({ id: 'story-1', title: 'Story One', status: 'pending' }),
        createMockStoryDetail({ id: 'story-2', title: 'Story Two', status: 'inProgress' }),
      ];

      // Add delay to the stories API response
      await mockApiDelay(
        page,
        (url) => url.pathname === '/api/stories' || url.pathname === '/api/stories/',
        DELAY_MEDIUM_MS,
        {
          status: HTTP_OK,
          contentType: 'application/json',
          body: JSON.stringify(stories),
        },
      );
      await mockSessions(page, []);

      await page.goto('/');

      // Verify kanban loading skeleton is visible
      await expect(page.getByTestId('kanban-loading')).toBeVisible();

      // Wait for the data to load
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });
      await expect(page.getByText('Story One')).toBeVisible();
      await expect(page.getByText('Story Two')).toBeVisible();
    });

    test('should show kanban loading skeleton while loading', async ({ page }) => {
      // Mock with delay
      await mockApiDelay(
        page,
        (url) => url.pathname === '/api/stories' || url.pathname === '/api/stories/',
        DELAY_VERY_LONG_MS,
        {
          status: HTTP_OK,
          contentType: 'application/json',
          body: JSON.stringify([]),
        },
      );
      await mockSessions(page, []);

      await page.goto('/');

      // The KanbanBoard shows a loading skeleton
      await expect(page.getByTestId('kanban-loading')).toBeVisible();
    });

    test('should hide skeleton loaders after data arrives', async ({ page }) => {
      const stories = [
        createMockStoryDetail({ id: 'test-story', title: 'Test Story', status: 'pending' }),
      ];

      // Mock with a short delay
      await mockApiDelay(
        page,
        (url) => url.pathname === '/api/stories' || url.pathname === '/api/stories/',
        DELAY_SHORT_MS,
        {
          status: HTTP_OK,
          contentType: 'application/json',
          body: JSON.stringify(stories),
        },
      );
      await mockSessions(page, []);

      await page.goto('/');

      // Wait for data to load
      await expect(page.getByText('Test Story')).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });

      // Loading skeleton should be gone
      await expect(page.getByTestId('kanban-loading')).toHaveCount(0);
    });
  });

  test.describe('Epic Detail Page', () => {
    test('should show header and story card skeletons while loading', async ({ page }) => {
      const epic = createMockEpic({
        id: 'test-epic',
        title: 'Test Epic Detail',
        stories: [
          createMockStoryDetail({
            id: 'story-1',
            title: 'Story One',
            epic: 'test-epic',
          }),
        ],
      });

      // Mock with delay
      await mockApiDelay(page, '**/api/epics/test-epic', DELAY_MEDIUM_MS, {
        status: HTTP_OK,
        contentType: 'application/json',
        body: JSON.stringify(epic),
      });

      await page.goto('/epic/test-epic');

      // Should show skeleton loaders during loading using data-testid
      const headerSkeleton = page.locator('[data-testid="epic-header-skeleton"]');
      await expect(headerSkeleton).toBeVisible();

      // Wait for data to load
      await expect(page.getByRole('heading', { name: 'Test Epic Detail' })).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });

      // Content should now be visible
      await expect(page.getByText('Story One')).toBeVisible();
    });

    test('should show progress skeleton in header while loading', async ({ page }) => {
      const epic = createMockEpic({
        id: 'loading-epic',
        title: 'Loading Epic',
      });

      await mockApiDelay(page, '**/api/epics/loading-epic', DELAY_LONG_MS, {
        status: HTTP_OK,
        contentType: 'application/json',
        body: JSON.stringify(epic),
      });

      await page.goto('/epic/loading-epic');

      // HeaderSkeleton should be visible using data-testid
      await expect(page.locator('[data-testid="epic-header-skeleton"]')).toBeVisible();

      // Wait for real content
      await expect(page.getByRole('heading', { name: 'Loading Epic' })).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });
    });
  });

  test.describe('Story Detail Page', () => {
    test('should show header and content skeletons while loading', async ({ page }) => {
      const story = createMockStoryDetail({
        id: 'test-story',
        title: 'Test Story Detail',
        epic: 'test-epic',
        status: 'inProgress',
      });

      // Mock with delay
      await mockApiDelay(page, '**/api/stories/test-story', DELAY_MEDIUM_MS, {
        status: HTTP_OK,
        contentType: 'application/json',
        body: JSON.stringify(story),
      });

      await page.goto('/story/test-story');

      // Should show skeleton loaders during loading using data-testid
      const headerSkeleton = page.locator('[data-testid="story-header-skeleton"]');
      await expect(headerSkeleton).toBeVisible();

      // Wait for data to load
      await expect(page.getByRole('heading', { name: 'Test Story Detail' })).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });
    });

    test('should show skeleton placeholders for header elements', async ({ page }) => {
      const story = createMockStoryDetail({
        id: 'story-with-tasks',
        title: 'Story With Tasks',
        epic: 'my-epic',
      });

      await mockApiDelay(page, '**/api/stories/story-with-tasks', DELAY_LONG_MS, {
        status: HTTP_OK,
        contentType: 'application/json',
        body: JSON.stringify(story),
      });

      await page.goto('/story/story-with-tasks');

      // HeaderSkeleton and ContentSkeleton should be visible using data-testid
      await expect(page.locator('[data-testid="story-header-skeleton"]')).toBeVisible();
      await expect(page.locator('[data-testid="story-content-skeleton"]')).toBeVisible();

      // Wait for real content
      await expect(page.getByRole('heading', { name: 'Story With Tasks' })).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });
    });

    test('should transition from loading to loaded state correctly', async ({ page }) => {
      const story = createMockStoryDetail({
        id: 'transition-story',
        title: 'Transition Story',
        epic: 'transition-epic',
        status: 'pending',
      });

      await mockApiDelay(page, '**/api/stories/transition-story', DELAY_TRANSITION_MS, {
        status: HTTP_OK,
        contentType: 'application/json',
        body: JSON.stringify(story),
      });

      await page.goto('/story/transition-story');

      // Initially should show loading state using data-testid
      await expect(page.locator('[data-testid="story-header-skeleton"]')).toBeVisible();

      // After loading, should show the story details
      await expect(page.getByRole('heading', { name: 'Transition Story' })).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });

      // Status badge should be visible
      await expect(page.getByText('Pending')).toBeVisible();
    });
  });

  test.describe('Fast Responses', () => {
    test('should handle immediate response without visible loading state', async ({ page }) => {
      const stories = [
        createMockStoryDetail({ id: 'fast-story', title: 'Fast Story', status: 'pending' }),
      ];

      // Mock immediate response (no delay)
      await mockAllStories(page, stories);
      await mockSessions(page, []);

      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });

      // Data should appear quickly
      await expect(page.getByText('Fast Story')).toBeVisible();
    });

    test('should handle quick sequence of navigations', async ({ page }) => {
      const story = createMockStoryDetail({
        id: 'nav-story',
        title: 'Nav Story',
        status: 'pending',
        epic: 'nav-epic',
      });

      const epic = createMockEpic({
        id: 'nav-epic',
        title: 'Nav Epic Detail',
        stories: [story],
      });

      await mockAllStories(page, [story]);
      await mockSessions(page, []);
      await mockEpicDetail(page, epic);
      await mockStoryDetail(page, story);

      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });
      await expect(page.getByText('Nav Story')).toBeVisible();

      // Expand card and navigate to story detail
      await page.getByTestId('story-card-trigger-nav-story').click();
      await page.getByRole('link', { name: OPEN_STORY_REGEX }).click();
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: LOADING_TIMEOUT_MS,
      });

      // Should eventually show the story detail
      await expect(page.getByRole('heading', { name: 'Nav Story' })).toBeVisible();
    });
  });
});
