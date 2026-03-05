import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockEpicSummary,
  createMockStoryDetail,
  mockAllStories,
  mockApiDelay,
  mockApiError,
  mockEpicDetail,
  mockSessions,
  mockStoryDetail,
} from '../utils/mock-api.ts';

// HTTP Status Codes
const HTTP_OK = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// Timeouts (ms)
const LOADING_TIMEOUT_MS = 10_000;

// Delay durations (ms)
const DELAY_MS = 500;

/**
 * Tests for API mocking infrastructure.
 * These tests verify that the mock utilities work correctly.
 */
test.describe('API Mocking Infrastructure', () => {
  test.describe('Mock Data Factories', () => {
    test('createMockEpicSummary creates valid EpicSummary', () => {
      const epic = createMockEpicSummary();
      expect(epic.id).toBeDefined();
      expect(epic.title).toBeDefined();
      expect(epic.storyCounts).toBeDefined();
      expect(epic.storyCounts.total).toBeGreaterThanOrEqual(0);
    });

    test('createMockEpicSummary allows overrides', () => {
      const epic = createMockEpicSummary({
        id: 'custom-id',
        title: 'Custom Title',
      });
      expect(epic.id).toBe('custom-id');
      expect(epic.title).toBe('Custom Title');
    });

    test('createMockEpic creates valid Epic with stories', () => {
      const epic = createMockEpic();
      expect(epic.id).toBeDefined();
      expect(epic.title).toBeDefined();
      expect(epic.stories).toBeInstanceOf(Array);
      expect(epic.storyCounts).toBeDefined();
    });

    test('createMockStoryDetail creates valid StoryDetail', () => {
      const story = createMockStoryDetail();
      expect(story.id).toBeDefined();
      expect(story.title).toBeDefined();
      expect(story.status).toBeDefined();
      expect(story.epic).toBeDefined();
      expect(story.tasks).toBeInstanceOf(Array);
      expect(story.journal).toBeInstanceOf(Array);
    });
  });

  test.describe('API Route Mocking', () => {
    test('mockAllStories mocks GET /api/stories', async ({ page }) => {
      const stories = [
        createMockStoryDetail({ id: 'story-1', title: 'Story One', status: 'pending' }),
        createMockStoryDetail({ id: 'story-2', title: 'Story Two', status: 'inProgress' }),
      ];

      await mockAllStories(page, stories);
      await mockSessions(page, []);

      // Navigate and verify the API was mocked
      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });

      // The page should render our mocked stories
      await expect(page.getByText('Story One')).toBeVisible();
      await expect(page.getByText('Story Two')).toBeVisible();
    });

    test('mockEpicDetail mocks GET /api/epics/:id', async ({ page }) => {
      const epic = createMockEpic({
        id: 'test-epic',
        title: 'Test Epic Detail',
      });

      await mockEpicDetail(page, epic);

      await page.goto('/epic/test-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: LOADING_TIMEOUT_MS,
      });

      // The page should show the epic detail
      await expect(page.getByRole('heading', { name: 'Test Epic Detail' })).toBeVisible();
    });

    test('mockStoryDetail mocks GET /api/stories/:storyId', async ({ page }) => {
      const story = createMockStoryDetail({
        id: 'test-story',
        title: 'Test Story Detail',
        epic: 'test-epic',
      });

      // Mock the story detail endpoint
      await mockStoryDetail(page, story);

      await page.goto('/story/test-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: LOADING_TIMEOUT_MS,
      });

      // The page should show the story detail
      await expect(page.getByRole('heading', { name: 'Test Story Detail' })).toBeVisible();
    });

    test('mockApiError mocks error responses', async ({ page }) => {
      await mockApiError(
        page,
        (url) => url.pathname === '/api/stories' || url.pathname === '/api/stories/',
        HTTP_INTERNAL_SERVER_ERROR,
        'Internal Server Error',
      );
      await mockSessions(page, []);

      await page.goto('/');

      // The page should show the kanban error state
      await expect(page.getByTestId('kanban-error')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });
    });

    test('mockApiDelay adds delay to responses', async ({ page }) => {
      const stories = [
        createMockStoryDetail({ id: 'delayed-story', title: 'Delayed', status: 'pending' }),
      ];

      // Add a 500ms delay to the response
      await mockApiDelay(
        page,
        (url) => url.pathname === '/api/stories' || url.pathname === '/api/stories/',
        DELAY_MS,
        {
          status: HTTP_OK,
          contentType: 'application/json',
          body: JSON.stringify(stories),
        },
      );
      await mockSessions(page, []);

      const start = Date.now();
      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });
      const elapsed = Date.now() - start;

      // The request should have been delayed by at least 500ms
      expect(elapsed).toBeGreaterThanOrEqual(DELAY_MS);
    });
  });
});
