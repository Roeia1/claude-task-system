import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpicSummary,
  type MockSession,
  mockEpicList,
  mockSessions,
} from '../utils/mock-api.ts';

/**
 * ActiveSessions integration tests for the home page.
 * Tests the active sessions section that appears when running sessions exist.
 */

// Session test data constants
const RUNNING_SESSION_1: MockSession = {
  name: 'saga__epic-one__story-alpha__12345',
  epicSlug: 'epic-one',
  storySlug: 'story-alpha',
  status: 'running',
  startTime: '2026-01-30T10:00:00Z',
  outputAvailable: true,
  outputPreview: 'Running tests...\nAll tests passed.',
};

const RUNNING_SESSION_2: MockSession = {
  name: 'saga__epic-two__story-beta__67890',
  epicSlug: 'epic-two',
  storySlug: 'story-beta',
  status: 'running',
  startTime: '2026-01-30T11:00:00Z',
  outputAvailable: true,
  outputPreview: 'Compiling...',
};

const COMPLETED_SESSION: MockSession = {
  name: 'saga__epic-one__story-gamma__11111',
  epicSlug: 'epic-one',
  storySlug: 'story-gamma',
  status: 'completed',
  startTime: '2026-01-30T08:00:00Z',
  outputAvailable: true,
  outputPreview: 'Build complete.',
};

test.describe('ActiveSessions on Home Page', () => {
  test('should not show ActiveSessions section when no running sessions', async ({ page }) => {
    const epics = [
      createMockEpicSummary({ slug: 'epic-one', title: 'Epic One' }),
      createMockEpicSummary({ slug: 'epic-two', title: 'Epic Two' }),
    ];

    await mockEpicList(page, epics);
    await mockSessions(page, []);

    await page.goto('/');
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
      timeout: 10_000,
    });

    // Verify ActiveSessions section is not displayed
    await expect(page.getByTestId('active-sessions')).not.toBeVisible();
    // But epic list is still visible
    await expect(page.getByText('Epic One')).toBeVisible();
  });

  test('should show ActiveSessions section heading when running sessions exist', async ({
    page,
  }) => {
    const epics = [createMockEpicSummary({ slug: 'epic-one', title: 'Epic One' })];

    await mockEpicList(page, epics);
    await mockSessions(page, [RUNNING_SESSION_1]);

    await page.goto('/');
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
      timeout: 10_000,
    });

    // Verify ActiveSessions section is displayed with heading
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();
  });

  test('should display session cards with story and epic slugs', async ({ page }) => {
    const epics = [
      createMockEpicSummary({ slug: 'epic-one', title: 'Epic One' }),
      createMockEpicSummary({ slug: 'epic-two', title: 'Epic Two' }),
    ];

    await mockEpicList(page, epics);
    await mockSessions(page, [RUNNING_SESSION_1, RUNNING_SESSION_2]);

    await page.goto('/');
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
      timeout: 10_000,
    });

    // Verify session cards show story and epic slugs
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('story-alpha')).toBeVisible();
    await expect(page.getByText('epic-one')).toBeVisible();
    await expect(page.getByText('story-beta')).toBeVisible();
    await expect(page.getByText('epic-two')).toBeVisible();
  });

  test('should navigate to story detail with ?tab=sessions when clicking session card', async ({
    page,
  }) => {
    const epics = [createMockEpicSummary({ slug: 'epic-one', title: 'Epic One' })];

    await mockEpicList(page, epics);
    await mockSessions(page, [RUNNING_SESSION_1]);

    await page.goto('/');
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
      timeout: 10_000,
    });

    // Click on the session card (which is a link)
    await page.getByText('story-alpha').click();

    // Verify navigation to story detail with sessions tab
    await expect(page).toHaveURL('/epic/epic-one/story/story-alpha?tab=sessions');
  });

  test('should only show running sessions, not completed ones', async ({ page }) => {
    const epics = [createMockEpicSummary({ slug: 'epic-one', title: 'Epic One' })];

    await mockEpicList(page, epics);
    // Note: The ActiveSessions component filters to only running sessions client-side
    // but it also fetches with ?status=running, so the mock should respect that
    await mockSessions(page, [RUNNING_SESSION_1, COMPLETED_SESSION]);

    await page.goto('/');
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
      timeout: 10_000,
    });

    // Verify only running session is shown
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('story-alpha')).toBeVisible();
    // Completed session (story-gamma) should not be visible in ActiveSessions
    // (it may appear elsewhere in the UI, so we check specifically within the section)
    const activeSessionsSection = page.getByTestId('active-sessions');
    await expect(activeSessionsSection.getByText('story-gamma')).not.toBeVisible();
  });

  test('should show output preview on session cards', async ({ page }) => {
    const epics = [createMockEpicSummary({ slug: 'epic-one', title: 'Epic One' })];

    await mockEpicList(page, epics);
    await mockSessions(page, [RUNNING_SESSION_1]);

    await page.goto('/');
    await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
      timeout: 10_000,
    });

    // Verify output preview is displayed
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('Running tests...')).toBeVisible();
  });
});
