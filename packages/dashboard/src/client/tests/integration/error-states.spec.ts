import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockStoryDetail,
  mockAllStories,
  mockApiError,
  mockEpicDetail,
  mockNetworkFailure,
  mockSessions,
} from '../utils/mock-api.ts';

// HTTP Status Codes
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;

// Timeouts (ms)
const TOAST_TIMEOUT_MS = 5000;
const LOADING_TIMEOUT_MS = 10_000;

// Regex patterns for case-insensitive matching
const BACK_TO_EPIC_LIST_REGEX = /Back to epic list/i;
const BACK_TO_EPIC_REGEX = /Back to epic/i;

/**
 * Error state tests for the dashboard.
 * These tests verify that error messages are displayed when API calls fail.
 */
test.describe('Error States', () => {
  test.describe('Kanban Board (Home Page)', () => {
    test('should show error state on 500 server error', async ({ page }) => {
      // Mock the stories API to return a 500 error
      await mockApiError(
        page,
        (url) =>
          (url.pathname === '/api/stories' || url.pathname === '/api/stories/') &&
          url.searchParams.get('all') === 'true',
        HTTP_INTERNAL_SERVER_ERROR,
        'Internal Server Error',
      );
      await mockSessions(page, []);

      await page.goto('/');

      // Should show kanban error state
      await expect(page.getByTestId('kanban-error')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });
      await expect(page.getByText('Failed to load stories')).toBeVisible();
    });

    test('should show error state on network failure', async ({ page }) => {
      // Mock network failure (connection refused)
      await mockNetworkFailure(
        page,
        (url) =>
          (url.pathname === '/api/stories' || url.pathname === '/api/stories/') &&
          url.searchParams.get('all') === 'true',
      );
      await mockSessions(page, []);

      await page.goto('/');

      // Should show kanban error state
      await expect(page.getByTestId('kanban-error')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });
      await expect(page.getByText('Failed to load stories')).toBeVisible();
    });
  });

  test.describe('Epic Detail Page', () => {
    test('should show 404 error page for non-existent epic', async ({ page }) => {
      // Mock 404 for non-existent epic
      await mockApiError(page, '**/api/epics/non-existent-epic', HTTP_NOT_FOUND, 'Epic not found');

      await page.goto('/epic/non-existent-epic');

      // Should show the 404 error message
      await expect(page.getByRole('heading', { name: 'Epic not found' })).toBeVisible();
      await expect(page.getByText('The epic "non-existent-epic" does not exist.')).toBeVisible();

      // Should have a link back to epic list
      await expect(page.getByRole('link', { name: BACK_TO_EPIC_LIST_REGEX })).toBeVisible();
    });

    test('should show error page on 500 server error', async ({ page }) => {
      // Mock 500 error for epic detail
      await mockApiError(
        page,
        '**/api/epics/broken-epic',
        HTTP_INTERNAL_SERVER_ERROR,
        'Internal Server Error',
      );

      await page.goto('/epic/broken-epic');

      // Should show the error state
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
      await expect(page.getByText('Failed to load epic')).toBeVisible();

      // Should have a link back to epic list
      await expect(page.getByRole('link', { name: BACK_TO_EPIC_LIST_REGEX })).toBeVisible();
    });

    test('should show toast notification on network failure', async ({ page }) => {
      // Mock network failure
      await mockNetworkFailure(page, '**/api/epics/network-error-epic');

      await page.goto('/epic/network-error-epic');

      // Toast notification should appear - use .first() as defensive measure
      // since toast deduplication should prevent duplicates but edge cases exist
      const toast = page.getByText('API Error', { exact: true }).first();
      await expect(toast).toBeVisible({ timeout: TOAST_TIMEOUT_MS });

      // Should also show error state in page
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should allow navigation back to home from error page', async ({ page }) => {
      // Mock the kanban board
      await mockAllStories(page, []);
      await mockSessions(page, []);

      // Mock 404 for the detail page
      await mockApiError(page, '**/api/epics/missing-epic', HTTP_NOT_FOUND, 'Epic not found');

      await page.goto('/epic/missing-epic');

      // Wait for error page to load
      await expect(page.getByRole('heading', { name: 'Epic not found' })).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });

      // Click the back link
      await page.getByRole('link', { name: BACK_TO_EPIC_LIST_REGEX }).click();

      // Should navigate to home (kanban board)
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });
    });
  });

  test.describe('Story Detail Page', () => {
    test('should show 404 error page for non-existent story', async ({ page }) => {
      // Mock 404 for non-existent story
      await mockApiError(
        page,
        '**/api/stories/non-existent-story',
        HTTP_NOT_FOUND,
        'Story not found',
      );

      await page.goto('/story/non-existent-story');

      // Should show the 404 error message
      await expect(page.getByRole('heading', { name: 'Story not found' })).toBeVisible();
      await expect(page.getByText('The story "non-existent-story" does not exist.')).toBeVisible();

      // Should have a link back to epic
      await expect(page.getByRole('link', { name: BACK_TO_EPIC_REGEX })).toBeVisible();
    });

    test('should show error page on 500 server error', async ({ page }) => {
      // Mock 500 error for story detail
      await mockApiError(
        page,
        '**/api/stories/broken-story',
        HTTP_INTERNAL_SERVER_ERROR,
        'Internal Server Error',
      );

      await page.goto('/story/broken-story');

      // Should show the error state
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
      await expect(page.getByText('Failed to load story')).toBeVisible();

      // Should have a link back to epic
      await expect(page.getByRole('link', { name: BACK_TO_EPIC_REGEX })).toBeVisible();
    });

    test('should show toast notification on network failure', async ({ page }) => {
      // Mock network failure
      await mockNetworkFailure(page, '**/api/stories/network-error-story');

      await page.goto('/story/network-error-story');

      // Toast notification should appear - use .first() as defensive measure
      // since toast deduplication should prevent duplicates but edge cases exist
      const toast = page.getByText('API Error', { exact: true }).first();
      await expect(toast).toBeVisible({ timeout: TOAST_TIMEOUT_MS });

      // Should also show error state in page
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should allow navigation back from error page', async ({ page }) => {
      // Mock the kanban board
      await mockAllStories(page, []);
      await mockSessions(page, []);

      // Mock 404 for the story
      await mockApiError(page, '**/api/stories/missing-story', HTTP_NOT_FOUND, 'Story not found');

      await page.goto('/story/missing-story');

      // Wait for error page to load
      await expect(page.getByRole('heading', { name: 'Story not found' })).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });

      // Click the back link
      await page.getByRole('link', { name: BACK_TO_EPIC_REGEX }).click();

      // Should navigate to home (kanban board)
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });
    });
  });

  test.describe('Mixed Error Scenarios', () => {
    test('should handle error on one page and success on another', async ({ page }) => {
      // Kanban board works
      const story = createMockStoryDetail({
        id: 'good-story',
        title: 'Good Story',
        status: 'pending',
        epic: 'good-epic',
      });
      await mockAllStories(page, [story]);
      await mockSessions(page, []);

      // But epic detail fails
      await mockApiError(
        page,
        '**/api/epics/good-epic',
        HTTP_INTERNAL_SERVER_ERROR,
        'Server Error',
      );

      // Navigate to kanban board - should work
      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });
      await expect(page.getByText('Good Story')).toBeVisible();

      // Navigate to epic detail - should fail
      await page.goto('/epic/good-epic');

      // Should show error state
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should recover after navigating away from error page', async ({ page }) => {
      // Mock working kanban board
      await mockAllStories(page, []);
      await mockSessions(page, []);

      // Mock working epic detail
      await mockEpicDetail(
        page,
        createMockEpic({ id: 'working-epic', title: 'Working Epic Detail' }),
      );

      // Mock error for non-existent epic
      await mockApiError(page, '**/api/epics/broken-epic', HTTP_NOT_FOUND, 'Not found');

      // Go to broken epic
      await page.goto('/epic/broken-epic');
      await expect(page.getByRole('heading', { name: 'Epic not found' })).toBeVisible();

      // Navigate back to home
      await page.getByRole('link', { name: BACK_TO_EPIC_LIST_REGEX }).click();
      await expect(page.getByTestId('kanban-board')).toBeVisible({
        timeout: LOADING_TIMEOUT_MS,
      });

      // Navigate to working epic
      await page.goto('/epic/working-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: LOADING_TIMEOUT_MS,
      });

      // Should show working epic
      await expect(page.getByRole('heading', { name: 'Working Epic Detail' })).toBeVisible();
    });
  });

  test.describe('Error Response Formats', () => {
    test('should handle 400 Bad Request error', async ({ page }) => {
      await mockApiError(page, '**/api/epics/bad-request', HTTP_BAD_REQUEST, 'Bad Request');

      await page.goto('/epic/bad-request');

      // 400 is treated as a general error (not 404)
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should handle 403 Forbidden error', async ({ page }) => {
      await mockApiError(page, '**/api/epics/forbidden', HTTP_FORBIDDEN, 'Forbidden');

      await page.goto('/epic/forbidden');

      // 403 is treated as a general error (not 404)
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should handle 502 Bad Gateway error', async ({ page }) => {
      await mockApiError(page, '**/api/epics/gateway', HTTP_BAD_GATEWAY, 'Bad Gateway');

      await page.goto('/epic/gateway');

      // 502 is treated as a general error
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should handle 503 Service Unavailable error', async ({ page }) => {
      await mockApiError(
        page,
        '**/api/epics/unavailable',
        HTTP_SERVICE_UNAVAILABLE,
        'Service Unavailable',
      );

      await page.goto('/epic/unavailable');

      // 503 is treated as a general error
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });
  });
});
