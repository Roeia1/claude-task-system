import { expect, test } from '@playwright/test';
import {
  createMockEpic,
  createMockEpicSummary,
  mockApiError,
  mockEpicDetail,
  mockEpicList,
  mockNetworkFailure,
} from '../utils/mock-api';

/**
 * Error state tests for the dashboard.
 * These tests verify that error messages are displayed when API calls fail.
 */
test.describe('Error States', () => {
  test.describe('Epic List Page', () => {
    test('should show empty state on 500 server error', async ({ page }) => {
      // Mock the API to return a 500 error
      // Note: The dashboard code only shows toast for network failures (thrown errors),
      // not for non-OK HTTP responses. A 500 response results in empty state.
      await mockApiError(page, '**/api/epics', 500, 'Internal Server Error');

      await page.goto('/');

      // Wait for loading to complete
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10000 });

      // Should show empty state (no toast for 500 errors in current implementation)
      await expect(page.getByText('No epics found.')).toBeVisible();
    });

    test('should show toast notification on network failure', async ({ page }) => {
      // Mock network failure (connection refused)
      await mockNetworkFailure(page, '**/api/epics');

      await page.goto('/');

      // Toast notification should appear - use .first() as defensive measure
      // since toast deduplication should prevent duplicates but edge cases exist
      const toast = page.getByText('API Error', { exact: true }).first();
      await expect(toast).toBeVisible({ timeout: 5000 });
    });

    test('should display empty state after error when no cached data', async ({ page }) => {
      // Mock the API to return a 500 error
      await mockApiError(page, '**/api/epics', 500, 'Internal Server Error');

      await page.goto('/');

      // Wait for loading to complete
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10000 });

      // The empty state message should appear (no cached epics to show)
      await expect(page.getByText('No epics found.')).toBeVisible();
    });
  });

  test.describe('Epic Detail Page', () => {
    test('should show 404 error page for non-existent epic', async ({ page }) => {
      // Mock 404 for non-existent epic
      await mockApiError(page, '**/api/epics/non-existent-epic', 404, 'Epic not found');

      await page.goto('/epic/non-existent-epic');

      // Should show the 404 error message
      await expect(page.getByRole('heading', { name: 'Epic not found' })).toBeVisible();
      await expect(page.getByText('The epic "non-existent-epic" does not exist.')).toBeVisible();

      // Should have a link back to epic list
      await expect(page.getByRole('link', { name: /Back to epic list/i })).toBeVisible();
    });

    test('should show error page on 500 server error', async ({ page }) => {
      // Mock 500 error for epic detail
      await mockApiError(page, '**/api/epics/broken-epic', 500, 'Internal Server Error');

      await page.goto('/epic/broken-epic');

      // Should show the error state
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
      await expect(page.getByText('Failed to load epic')).toBeVisible();

      // Should have a link back to epic list
      await expect(page.getByRole('link', { name: /Back to epic list/i })).toBeVisible();
    });

    test('should show toast notification on network failure', async ({ page }) => {
      // Mock network failure
      await mockNetworkFailure(page, '**/api/epics/network-error-epic');

      await page.goto('/epic/network-error-epic');

      // Toast notification should appear - use .first() as defensive measure
      // since toast deduplication should prevent duplicates but edge cases exist
      const toast = page.getByText('API Error', { exact: true }).first();
      await expect(toast).toBeVisible({ timeout: 5000 });

      // Should also show error state in page
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should allow navigation back to epic list from error page', async ({ page }) => {
      // First mock the epic list
      await mockEpicList(page, [createMockEpicSummary({ slug: 'test-epic', title: 'Test Epic' })]);

      // Mock 404 for the detail page
      await mockApiError(page, '**/api/epics/missing-epic', 404, 'Epic not found');

      await page.goto('/epic/missing-epic');

      // Wait for error page to load
      await expect(page.getByRole('heading', { name: 'Epic not found' })).toBeVisible({ timeout: 10000 });

      // Click the back link
      await page.getByRole('link', { name: /Back to epic list/i }).click();

      // Wait for epic list to load
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10000 });

      // Should navigate to epic list and show the epic
      await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();
      await expect(page.getByText('Test Epic')).toBeVisible();
    });
  });

  test.describe('Story Detail Page', () => {
    test('should show 404 error page for non-existent story', async ({ page }) => {
      // Mock 404 for non-existent story
      await mockApiError(
        page,
        '**/api/stories/test-epic/non-existent-story',
        404,
        'Story not found',
      );

      await page.goto('/epic/test-epic/story/non-existent-story');

      // Should show the 404 error message
      await expect(page.getByRole('heading', { name: 'Story not found' })).toBeVisible();
      await expect(
        page.getByText('The story "non-existent-story" does not exist in epic "test-epic".'),
      ).toBeVisible();

      // Should have a link back to epic
      await expect(page.getByRole('link', { name: /Back to epic/i })).toBeVisible();
    });

    test('should show error page on 500 server error', async ({ page }) => {
      // Mock 500 error for story detail
      await mockApiError(
        page,
        '**/api/stories/test-epic/broken-story',
        500,
        'Internal Server Error',
      );

      await page.goto('/epic/test-epic/story/broken-story');

      // Should show the error state
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
      await expect(page.getByText('Failed to load story')).toBeVisible();

      // Should have a link back to epic
      await expect(page.getByRole('link', { name: /Back to epic/i })).toBeVisible();
    });

    test('should show toast notification on network failure', async ({ page }) => {
      // Mock network failure
      await mockNetworkFailure(page, '**/api/stories/test-epic/network-error-story');

      await page.goto('/epic/test-epic/story/network-error-story');

      // Toast notification should appear - use .first() as defensive measure
      // since toast deduplication should prevent duplicates but edge cases exist
      const toast = page.getByText('API Error', { exact: true }).first();
      await expect(toast).toBeVisible({ timeout: 5000 });

      // Should also show error state in page
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should allow navigation back to epic from error page', async ({ page }) => {
      // Mock the epic detail
      await mockEpicDetail(page, createMockEpic({ slug: 'test-epic', title: 'Test Epic' }));

      // Mock 404 for the story
      await mockApiError(page, '**/api/stories/test-epic/missing-story', 404, 'Story not found');

      await page.goto('/epic/test-epic/story/missing-story');

      // Wait for error page to load
      await expect(page.getByRole('heading', { name: 'Story not found' })).toBeVisible({ timeout: 10000 });

      // Click the back link
      await page.getByRole('link', { name: /Back to epic/i }).click();

      // Wait for epic detail to load
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10000 });

      // Should navigate to epic detail
      await expect(page.getByRole('heading', { name: 'Test Epic' })).toBeVisible();
    });
  });

  test.describe('Mixed Error Scenarios', () => {
    test('should handle error on one page and success on another', async ({ page }) => {
      // Epic list works
      await mockEpicList(page, [createMockEpicSummary({ slug: 'good-epic', title: 'Good Epic' })]);

      // But epic detail fails
      await mockApiError(page, '**/api/epics/good-epic', 500, 'Server Error');

      // Navigate to epic list - should work
      await page.goto('/');
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10000 });
      await expect(page.getByText('Good Epic')).toBeVisible();

      // Click to navigate to epic detail - should fail
      await page.getByRole('link', { name: /Good Epic/i }).click();

      // Should show error state
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should recover after navigating away from error page', async ({ page }) => {
      // Mock working epic list
      await mockEpicList(page, [
        createMockEpicSummary({ slug: 'working-epic', title: 'Working Epic' }),
      ]);

      // Mock working epic detail
      await mockEpicDetail(
        page,
        createMockEpic({ slug: 'working-epic', title: 'Working Epic Detail' }),
      );

      // Mock error for non-existent epic
      await mockApiError(page, '**/api/epics/broken-epic', 404, 'Not found');

      // Go to broken epic
      await page.goto('/epic/broken-epic');
      await expect(page.getByRole('heading', { name: 'Epic not found' })).toBeVisible();

      // Navigate back and then to working epic
      await page.getByRole('link', { name: /Back to epic list/i }).click();
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10000 });
      await page.getByRole('link', { name: /Working Epic/i }).click();
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, { timeout: 10000 });

      // Should show working epic
      await expect(page.getByRole('heading', { name: 'Working Epic Detail' })).toBeVisible();
    });
  });

  test.describe('Error Response Formats', () => {
    test('should handle 400 Bad Request error', async ({ page }) => {
      await mockApiError(page, '**/api/epics/bad-request', 400, 'Bad Request');

      await page.goto('/epic/bad-request');

      // 400 is treated as a general error (not 404)
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should handle 403 Forbidden error', async ({ page }) => {
      await mockApiError(page, '**/api/epics/forbidden', 403, 'Forbidden');

      await page.goto('/epic/forbidden');

      // 403 is treated as a general error (not 404)
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should handle 502 Bad Gateway error', async ({ page }) => {
      await mockApiError(page, '**/api/epics/gateway', 502, 'Bad Gateway');

      await page.goto('/epic/gateway');

      // 502 is treated as a general error
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });

    test('should handle 503 Service Unavailable error', async ({ page }) => {
      await mockApiError(page, '**/api/epics/unavailable', 503, 'Service Unavailable');

      await page.goto('/epic/unavailable');

      // 503 is treated as a general error
      await expect(page.getByRole('heading', { name: 'Error' })).toBeVisible();
    });
  });
});
