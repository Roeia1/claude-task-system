import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockStoryDetail,
  type MockSession,
  mockAllStories,
  mockSessions,
} from '../utils/mock-api.ts';

/**
 * Running session indicator integration tests for the home page (KanbanBoard).
 * Tests the running indicator (pulsing green dot) that appears on story cards
 * when a session is active for that story.
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

test.describe('Running Session Indicators on Home Page', () => {
  test('should not show running indicator when no sessions are active', async ({ page }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, []);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Verify no running indicators are shown
    await expect(page.getByTestId('running-indicator')).toHaveCount(0);
    // But story cards are still visible
    await expect(page.getByText('Story Alpha')).toBeVisible();
  });

  test('should show running indicator on story card when session is active', async ({ page }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Verify the story card has a running indicator
    const storyCard = page.getByTestId('story-card-story-alpha');
    await expect(storyCard).toBeVisible();
    await expect(storyCard.getByTestId('running-indicator')).toBeVisible();
  });

  test('should show running indicators on multiple story cards', async ({ page }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1, RUNNING_SESSION_2]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Verify both story cards have running indicators
    const alphaCard = page.getByTestId('story-card-story-alpha');
    const betaCard = page.getByTestId('story-card-story-beta');
    await expect(alphaCard.getByTestId('running-indicator')).toBeVisible();
    await expect(betaCard.getByTestId('running-indicator')).toBeVisible();
  });

  test('should navigate to story detail via "Open story" link', async ({ page }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Expand the story card
    await page.getByTestId('story-card-trigger-story-alpha').click();

    // Click on "Open story →" link
    await page.getByTestId('story-card-content-story-alpha').getByText('Open story →').click();

    // Verify navigation to story detail
    await expect(page).toHaveURL('/story/story-alpha');
  });

  test('should only show running indicators for running sessions, not completed ones', async ({
    page,
  }) => {
    await mockAllStories(page, sampleStories);
    await mockSessions(page, [RUNNING_SESSION_1, COMPLETED_SESSION]);

    await page.goto('/');
    await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

    // Running session's story should have an indicator
    const alphaCard = page.getByTestId('story-card-story-alpha');
    await expect(alphaCard.getByTestId('running-indicator')).toBeVisible();

    // Completed session's story should NOT have an indicator
    const gammaCard = page.getByTestId('story-card-story-gamma');
    await expect(gammaCard.getByTestId('running-indicator')).toHaveCount(0);
  });
});
