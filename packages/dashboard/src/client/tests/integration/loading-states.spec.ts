import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockEpicSummary,
  createMockStoryDetail,
  mockApiDelay,
  mockEpicDetail,
  mockEpicList,
} from '../utils/mock-api.ts';

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

// Expected counts
const EXPECTED_SKELETON_CARDS = 3;

// Regex patterns defined at module level for performance
const EPIC_ONE_REGEX = /Epic One/i;
const NAV_EPIC_1_REGEX = /Nav Epic 1/i;

/**
 * Loading state tests for the dashboard.
 * These tests verify that skeleton loaders appear while waiting for API responses
 * and disappear after data loads.
 */
test.describe('Loading States', () => {
  test.describe('Epic List Page', () => {
    test('should show skeleton loaders while loading epics', async ({ page }) => {
      // Mock the API with a delay to observe loading state
      const epics = [
        createMockEpicSummary({ id: 'epic-1', title: 'Epic One' }),
        createMockEpicSummary({ id: 'epic-2', title: 'Epic Two' }),
      ];

      // Add 1 second delay to the response
      await mockApiDelay(page, '**/api/epics', DELAY_MEDIUM_MS, {
        status: HTTP_OK,
        contentType: 'application/json',
        body: JSON.stringify(epics),
      });

      // Navigate to the epic list page
      await page.goto('/');

      // Verify skeleton loaders are visible using data-testid
      const skeletons = page.locator('[data-testid="epic-card-skeleton"]');
      await expect(skeletons.first()).toBeVisible();

      // Wait for the data to load
      await expect(page.getByText('Epic One')).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });
      await expect(page.getByText('Epic Two')).toBeVisible();

      // Skeleton loaders should no longer be visible (or at least not the main loading ones)
      // After data loads, the page should show the actual epic cards
      await expect(page.getByRole('link', { name: EPIC_ONE_REGEX })).toBeVisible();
    });

    test('should show multiple skeleton cards while loading', async ({ page }) => {
      // Mock with delay
      await mockApiDelay(page, '**/api/epics', DELAY_VERY_LONG_MS, {
        status: HTTP_OK,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });

      await page.goto('/');

      // The EpicList shows 3 skeleton cards during loading
      const skeletons = page.locator('[data-testid="epic-card-skeleton"]');
      await expect(skeletons).toHaveCount(EXPECTED_SKELETON_CARDS);
    });

    test('should hide skeleton loaders after data arrives', async ({ page }) => {
      const epics = [createMockEpicSummary({ id: 'test-epic', title: 'Test Epic' })];

      // Mock with a short delay
      await mockApiDelay(page, '**/api/epics', DELAY_SHORT_MS, {
        status: HTTP_OK,
        contentType: 'application/json',
        body: JSON.stringify(epics),
      });

      await page.goto('/');

      // Wait for data to load
      await expect(page.getByText('Test Epic')).toBeVisible({
        timeout: CONTENT_TIMEOUT_MS,
      });

      // Skeleton loaders should be gone after data loads
      // Check that the epic card skeletons are not present
      await expect(page.locator('[data-testid="epic-card-skeleton"]')).toHaveCount(0);
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
      const epics = [createMockEpicSummary({ id: 'fast-epic', title: 'Fast Epic' })];

      // Mock immediate response (no delay)
      await mockEpicList(page, epics);

      await page.goto('/');
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
        timeout: LOADING_TIMEOUT_MS,
      });

      // Data should appear quickly
      await expect(page.getByText('Fast Epic')).toBeVisible();

      // No skeleton should be visible after data loads
      // (there might be a brief flash but it should resolve quickly)
    });

    test('should handle quick sequence of navigations', async ({ page }) => {
      const epics = [
        createMockEpicSummary({ id: 'nav-epic-1', title: 'Nav Epic 1' }),
        createMockEpicSummary({ id: 'nav-epic-2', title: 'Nav Epic 2' }),
      ];

      const epic1 = createMockEpic({
        id: 'nav-epic-1',
        title: 'Nav Epic 1 Detail',
        stories: [],
      });

      await mockEpicList(page, epics);
      await mockEpicDetail(page, epic1);

      await page.goto('/');
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
        timeout: LOADING_TIMEOUT_MS,
      });
      await expect(page.getByText('Nav Epic 1')).toBeVisible();

      // Click to navigate to epic detail
      await page.getByRole('link', { name: NAV_EPIC_1_REGEX }).click();
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: LOADING_TIMEOUT_MS,
      });

      // Should eventually show the epic detail
      await expect(page.getByRole('heading', { name: 'Nav Epic 1 Detail' })).toBeVisible();
    });
  });
});
