import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockStoryDetail,
  mockAllStories,
  mockEpicDetail,
  mockSessions,
  mockStoryDetail,
} from '../utils/mock-api.ts';

/** Number of kanban board columns */
const KANBAN_COLUMN_COUNT = 3;

/**
 * Empty State Tests
 *
 * These tests verify that the dashboard displays appropriate messaging
 * when data is empty (no stories, no tasks, no journal entries).
 */

test.describe('Empty States', () => {
  test.describe('Kanban Board (Home Page)', () => {
    test('should show empty columns when no stories exist', async ({ page }) => {
      await mockAllStories(page, []);
      await mockSessions(page, []);

      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

      // Verify all 3 columns show "No stories"
      const noStoriesTexts = page.getByText('No stories');
      await expect(noStoriesTexts).toHaveCount(KANBAN_COLUMN_COUNT);
    });
  });

  test.describe('Epic Detail Page', () => {
    test('should show empty state when epic has no stories', async ({ page }) => {
      const emptyEpic = createMockEpic({
        id: 'empty-epic',
        title: 'Empty Epic',
        stories: [],
      });

      await mockEpicDetail(page, emptyEpic);

      await page.goto('/epic/empty-epic');

      // Verify empty state message is displayed
      await expect(page.getByText('No stories in this epic.')).toBeVisible();
      await expect(page.getByText('/generate-stories')).toBeVisible();
      await expect(page.getByText('to create stories.')).toBeVisible();
    });

    test('should show epic header even when no stories exist', async ({ page }) => {
      const emptyEpic = createMockEpic({
        id: 'empty-epic',
        title: 'Epic With No Stories',
        stories: [],
      });

      await mockEpicDetail(page, emptyEpic);

      await page.goto('/epic/empty-epic');

      // Verify the epic title is displayed
      await expect(page.getByRole('heading', { name: 'Epic With No Stories' })).toBeVisible();

      // Verify progress section shows 0/0
      await expect(page.getByText('0/0 stories completed')).toBeVisible();
    });

    test('should show 0% progress when no stories exist', async ({ page }) => {
      const emptyEpic = createMockEpic({
        id: 'no-stories',
        title: 'No Stories Epic',
        stories: [],
      });

      await mockEpicDetail(page, emptyEpic);

      await page.goto('/epic/no-stories');

      // Verify progress bar shows (value should be 0)
      const progressBar = page.getByRole('progressbar');
      await expect(progressBar).toBeVisible();
    });
  });

  test.describe('Story Detail Page', () => {
    test('should show empty state when story has no tasks', async ({ page }) => {
      const storyNoTasks = createMockStoryDetail({
        id: 'no-tasks-story',
        title: 'Story Without Tasks',
        epic: 'test-epic',
        tasks: [],
        journal: [],
      });

      await mockStoryDetail(page, storyNoTasks);

      await page.goto('/story/no-tasks-story');

      // Verify tasks tab is active by default
      await expect(page.getByRole('tab', { name: 'Tasks' })).toHaveAttribute(
        'data-state',
        'active',
      );

      // Verify empty tasks message
      await expect(page.getByText('No tasks defined for this story.')).toBeVisible();
    });

    test('should show empty state when story has no content', async ({ page }) => {
      const storyNoContent = createMockStoryDetail({
        id: 'no-content-story',
        title: 'Story Without Content',
        epic: 'test-epic',
        tasks: [],
        journal: [],
        description: '',
      });

      await mockStoryDetail(page, storyNoContent);

      await page.goto('/story/no-content-story');

      // Click on the Story Content tab
      await page.getByRole('tab', { name: 'Story Content' }).click();

      // Verify empty content message
      await expect(page.getByText('No story content available.')).toBeVisible();
    });

    test('should show empty state when story has no journal entries', async ({ page }) => {
      const storyNoJournal = createMockStoryDetail({
        id: 'no-journal-story',
        title: 'Story Without Journal',
        epic: 'test-epic',
        tasks: [],
        journal: [],
      });

      await mockStoryDetail(page, storyNoJournal);

      await page.goto('/story/no-journal-story');

      // Click on the Journal tab
      await page.getByRole('tab', { name: 'Journal' }).click();

      // Verify empty journal message
      await expect(page.getByText('No journal entries yet.')).toBeVisible();
    });

    test('should show 0/0 tasks completed for story with no tasks', async ({ page }) => {
      const storyNoTasks = createMockStoryDetail({
        id: 'empty-story',
        title: 'Empty Story',
        epic: 'test-epic',
        tasks: [],
        journal: [],
      });

      await mockStoryDetail(page, storyNoTasks);

      await page.goto('/story/empty-story');

      // Verify 0/0 tasks completed is shown in the header
      await expect(page.getByText('0/0 tasks completed')).toBeVisible();
    });

    test('should display story header correctly even with all empty states', async ({ page }) => {
      const emptyStory = createMockStoryDetail({
        id: 'completely-empty',
        title: 'Completely Empty Story',
        status: 'pending',
        epic: 'test-epic',
        tasks: [],
        journal: [],
        description: undefined,
      });

      await mockStoryDetail(page, emptyStory);

      await page.goto('/story/completely-empty');

      // Verify header elements are displayed correctly
      await expect(page.getByRole('heading', { name: 'Completely Empty Story' })).toBeVisible();
      await expect(page.getByText('Pending')).toBeVisible();
      await expect(page.getByText('0/0 tasks completed')).toBeVisible();

      // Verify breadcrumb navigation is present (stories show Board > storyId)
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb.getByRole('link', { name: 'Board' })).toBeVisible();
      await expect(breadcrumb.getByText('completely-empty')).toBeVisible();
    });
  });

  test.describe('Multiple Empty States Combined', () => {
    test('should navigate from empty story list to generate stories guidance', async ({ page }) => {
      const emptyEpic = createMockEpic({
        id: 'empty-epic',
        title: 'Empty Epic',
        stories: [],
      });

      await mockEpicDetail(page, emptyEpic);

      await page.goto('/epic/empty-epic');

      // Verify guidance text is actionable
      const generateStoriesCode = page.locator('code:has-text("/generate-stories")');
      await expect(generateStoriesCode).toBeVisible();
    });

    test('should handle transition from data to empty state on navigation', async ({ page }) => {
      // First, set up an epic with stories
      const epicWithStories = createMockEpic({
        id: 'epic-with-stories',
        title: 'Epic With Stories',
        stories: [
          createMockStoryDetail({
            id: 'story-1',
            title: 'Story One',
            epic: 'epic-with-stories',
          }),
        ],
      });

      // And an empty epic
      const emptyEpic = createMockEpic({
        id: 'empty-epic',
        title: 'Empty Epic',
        stories: [],
      });

      await mockEpicDetail(page, epicWithStories);
      await mockEpicDetail(page, emptyEpic);
      await mockStoryDetail(
        page,
        createMockStoryDetail({
          id: 'story-1',
          title: 'Story One',
          epic: 'epic-with-stories',
        }),
      );

      // Navigate to the epic with stories first
      await page.goto('/epic/epic-with-stories');

      // Verify stories are shown
      await expect(page.getByText('Story One')).toBeVisible();
      await expect(page.getByText('No stories in this epic.')).not.toBeVisible();

      // Navigate to the epic list and then to empty epic
      await page.goto('/epic/empty-epic');

      // Verify empty state is shown
      await expect(page.getByText('No stories in this epic.')).toBeVisible();
    });
  });
});
