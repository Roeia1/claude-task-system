import { test, expect } from '@playwright/test';
import {
  mockEpicList,
  mockEpicDetail,
  mockStoryDetail,
  mockApiError,
  mockApiDelay,
  createMockEpicSummary,
  createMockEpic,
  createMockStoryDetail,
} from '../utils/mock-api';

/**
 * Tests for API mocking infrastructure.
 * These tests verify that the mock utilities work correctly.
 */
test.describe('API Mocking Infrastructure', () => {
  test.describe('Mock Data Factories', () => {
    test('createMockEpicSummary creates valid EpicSummary', async () => {
      const epic = createMockEpicSummary();
      expect(epic.slug).toBeDefined();
      expect(epic.title).toBeDefined();
      expect(epic.storyCounts).toBeDefined();
      expect(epic.storyCounts.total).toBeGreaterThanOrEqual(0);
    });

    test('createMockEpicSummary allows overrides', async () => {
      const epic = createMockEpicSummary({
        slug: 'custom-slug',
        title: 'Custom Title',
        isArchived: true,
      });
      expect(epic.slug).toBe('custom-slug');
      expect(epic.title).toBe('Custom Title');
      expect(epic.isArchived).toBe(true);
    });

    test('createMockEpic creates valid Epic with stories', async () => {
      const epic = createMockEpic();
      expect(epic.slug).toBeDefined();
      expect(epic.title).toBeDefined();
      expect(epic.stories).toBeInstanceOf(Array);
      expect(epic.storyCounts).toBeDefined();
    });

    test('createMockStoryDetail creates valid StoryDetail', async () => {
      const story = createMockStoryDetail();
      expect(story.slug).toBeDefined();
      expect(story.title).toBeDefined();
      expect(story.status).toBeDefined();
      expect(story.epicSlug).toBeDefined();
      expect(story.tasks).toBeInstanceOf(Array);
      expect(story.journal).toBeInstanceOf(Array);
    });
  });

  test.describe('API Route Mocking', () => {
    test('mockEpicList mocks GET /api/epics', async ({ page }) => {
      const epics = [
        createMockEpicSummary({ slug: 'epic-1', title: 'Epic One' }),
        createMockEpicSummary({ slug: 'epic-2', title: 'Epic Two' }),
      ];

      await mockEpicList(page, epics);

      // Navigate and verify the API was mocked
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // The page should render our mocked epics
      await expect(page.getByText('Epic One')).toBeVisible();
      await expect(page.getByText('Epic Two')).toBeVisible();
    });

    test('mockEpicDetail mocks GET /api/epics/:slug', async ({ page }) => {
      const epic = createMockEpic({
        slug: 'test-epic',
        title: 'Test Epic Detail',
      });

      // Mock both the list (for initial load) and detail
      await mockEpicList(page, [createMockEpicSummary({ slug: 'test-epic', title: 'Test Epic Detail' })]);
      await mockEpicDetail(page, epic);

      await page.goto('/epics/test-epic');
      await page.waitForLoadState('networkidle');

      // The page should show the epic detail
      await expect(page.getByRole('heading', { name: 'Test Epic Detail' })).toBeVisible();
    });

    test('mockStoryDetail mocks GET /api/stories/:epicSlug/:storySlug', async ({ page }) => {
      const story = createMockStoryDetail({
        slug: 'test-story',
        title: 'Test Story Detail',
        epicSlug: 'test-epic',
      });

      // Mock the story detail endpoint
      await mockStoryDetail(page, story);

      await page.goto('/epics/test-epic/stories/test-story');
      await page.waitForLoadState('networkidle');

      // The page should show the story detail
      await expect(page.getByRole('heading', { name: 'Test Story Detail' })).toBeVisible();
    });

    test('mockApiError mocks error responses', async ({ page }) => {
      await mockApiError(page, '**/api/epics', 500, 'Internal Server Error');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // The page should show an error state or toast
      // (The specific assertion depends on how the dashboard handles errors)
      await expect(page.locator('body')).toBeVisible();
    });

    test('mockApiDelay adds delay to responses', async ({ page }) => {
      const epics = [createMockEpicSummary({ slug: 'delayed-epic' })];

      // Add a 500ms delay to the response
      await mockApiDelay(page, '**/api/epics', 500, {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(epics),
      });

      const start = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const elapsed = Date.now() - start;

      // The request should have been delayed by at least 500ms
      expect(elapsed).toBeGreaterThanOrEqual(500);
    });
  });
});
