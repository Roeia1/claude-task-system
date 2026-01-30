import { expect, test } from '@playwright/test';
import { createMockEpicSummary, mockEpicList } from '../utils/mock-api.ts';

/**
 * Archive toggle tests for the dashboard.
 * Tests the show/hide archived epics toggle functionality on the epic list page.
 */
test.describe('Archive Toggle', () => {
  test('should show archive toggle when archived epics exist', async ({ page }) => {
    const epics = [
      createMockEpicSummary({ slug: 'active-epic', title: 'Active Epic', isArchived: false }),
      createMockEpicSummary({ slug: 'archived-epic', title: 'Archived Epic', isArchived: true }),
    ];

    await mockEpicList(page, epics);

    await page.goto('/');

    // Wait for loading to complete
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

    // Verify the archive toggle is visible
    await expect(page.getByText('Show archived')).toBeVisible();
  });

  test('should not show archive toggle when no archived epics exist', async ({ page }) => {
    const epics = [
      createMockEpicSummary({ slug: 'active-1', title: 'Active One', isArchived: false }),
      createMockEpicSummary({ slug: 'active-2', title: 'Active Two', isArchived: false }),
    ];

    await mockEpicList(page, epics);

    await page.goto('/');

    // Wait for loading to complete
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

    // Verify the archive toggle is not visible
    await expect(page.getByText('Show archived')).not.toBeVisible();
  });

  test('should hide archived epics by default', async ({ page }) => {
    const epics = [
      createMockEpicSummary({ slug: 'active-epic', title: 'Active Epic', isArchived: false }),
      createMockEpicSummary({ slug: 'old-epic', title: 'Old Archived Epic', isArchived: true }),
    ];

    await mockEpicList(page, epics);

    await page.goto('/');

    // Wait for loading to complete
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

    // Verify active epic is visible
    await expect(page.getByText('Active Epic')).toBeVisible();

    // Verify archived epic is hidden
    await expect(page.getByText('Old Archived Epic')).not.toBeVisible();
  });

  test('should show archived epics when toggle is enabled', async ({ page }) => {
    const epics = [
      createMockEpicSummary({ slug: 'active-epic', title: 'Active Epic', isArchived: false }),
      createMockEpicSummary({ slug: 'archived-epic', title: 'Archived Epic', isArchived: true }),
    ];

    await mockEpicList(page, epics);

    await page.goto('/');

    // Wait for loading to complete
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

    // Initially archived epic is hidden
    await expect(page.getByText('Archived Epic')).not.toBeVisible();

    // Click the toggle to show archived
    await page.getByText('Show archived').click();

    // Now both epics should be visible
    await expect(page.getByText('Active Epic')).toBeVisible();
    await expect(page.getByText('Archived Epic')).toBeVisible();
  });

  test('should hide archived epics again when toggle is disabled', async ({ page }) => {
    const epics = [
      createMockEpicSummary({ slug: 'active-epic', title: 'Active Epic', isArchived: false }),
      createMockEpicSummary({ slug: 'archived-epic', title: 'Archived Epic', isArchived: true }),
    ];

    await mockEpicList(page, epics);

    await page.goto('/');

    // Wait for loading to complete
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

    // Enable the toggle
    await page.getByText('Show archived').click();
    await expect(page.getByText('Archived Epic')).toBeVisible();

    // Disable the toggle
    await page.getByText('Show archived').click();
    await expect(page.getByText('Archived Epic')).not.toBeVisible();
  });

  test('should show only archived epics when all epics are archived and toggle is on', async ({
    page,
  }) => {
    const epics = [
      createMockEpicSummary({ slug: 'archived-1', title: 'Archived One', isArchived: true }),
      createMockEpicSummary({ slug: 'archived-2', title: 'Archived Two', isArchived: true }),
    ];

    await mockEpicList(page, epics);

    await page.goto('/');

    // Wait for loading to complete
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

    // Initially shows empty state (no active epics)
    await expect(page.getByText('No epics found.')).toBeVisible();

    // Toggle to show archived
    await page.getByText('Show archived').click();

    // Now archived epics are visible
    await expect(page.getByText('Archived One')).toBeVisible();
    await expect(page.getByText('Archived Two')).toBeVisible();
    await expect(page.getByText('No epics found.')).not.toBeVisible();
  });
});
