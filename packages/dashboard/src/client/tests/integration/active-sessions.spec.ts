import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockStoryDetail,
  type MockSession,
  mockAllStories,
  mockSessions,
} from '../utils/mock-api.ts';

/**
 * ActiveSessions integration tests for the home page (KanbanBoard).
 * Tests the active sessions section that appears when running sessions exist.
 */

// Session test data constants
const RUNNING_SESSION_1: MockSession = {
  name: 'saga-story-story-alpha-12345',
  storyId: 'story-alpha',
  status: 'running',
  startTime: '2026-01-30T10:00:00Z',
  outputAvailable: true,
  outputPreview: 'Running tests...\nAll tests passed.',
};

const RUNNING_SESSION_2: MockSession = {
  name: 'saga-story-story-beta-67890',
  storyId: 'story-beta',
  status: 'running',
  startTime: '2026-01-30T11:00:00Z',
  outputAvailable: true,
  outputPreview: 'Compiling...',
};

const COMPLETED_SESSION: MockSession = {
  name: 'saga-story-story-gamma-11111',
  storyId: 'story-gamma',
  status: 'completed',
  startTime: '2026-01-30T08:00:00Z',
  outputAvailable: true,
  outputPreview: 'Build complete.',
};

// Sample stories for the kanban board
const sampleStories = [
  createMockStoryDetail({ id: 'story-alpha', title: 'Story Alpha', status: 'inProgress' }),
  createMockStoryDetail({ id: 'story-beta', title: 'Story Beta', status: 'inProgress' }),
  createMockStoryDetail({ id: 'story-gamma', title: 'Story Gamma', status: 'completed' }),
];

test.describe('ActiveSessions on Home Page', () => {
  test('should not show ActiveSessions section when no running sessions', async ({ page }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, []);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Verify ActiveSessions section is not displayed
    await expect(page.getByTestId('active-sessions')).not.toBeVisible();
    // But kanban board is still visible
    await expect(page.getByText('Story Alpha')).toBeVisible();
  });

  test('should show ActiveSessions section heading when running sessions exist', async ({
    page,
  }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Verify ActiveSessions section is displayed with heading
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();
  });

  test('should display session cards with story ids', async ({ page }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1, RUNNING_SESSION_2]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Verify session cards show story ids
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('story-alpha')).toBeVisible();
    await expect(page.getByText('story-beta')).toBeVisible();
  });

  test('should navigate to story detail with ?tab=sessions when clicking session card', async ({
    page,
  }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Click on the session card (which is a link)
    await page.getByText('story-alpha').click();

    // Verify navigation to story detail with sessions tab
    await expect(page).toHaveURL('/story/story-alpha?tab=sessions');
  });

  test('should only show running sessions, not completed ones', async ({ page }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1, COMPLETED_SESSION]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Verify only running session is shown
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('story-alpha')).toBeVisible();
    // Completed session (story-gamma) should not be visible in ActiveSessions
    const activeSessionsSection = page.getByTestId('active-sessions');
    await expect(activeSessionsSection.getByText('story-gamma')).not.toBeVisible();
  });

  test('should show output preview on session cards', async ({ page }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Verify output preview is displayed
    await expect(page.getByTestId('active-sessions')).toBeVisible();
    await expect(page.getByText('Running tests...')).toBeVisible();
  });
});
