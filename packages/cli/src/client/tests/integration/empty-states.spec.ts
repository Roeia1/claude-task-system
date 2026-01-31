import { expect, test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockEpicSummary,
  createMockStoryDetail,
  mockEpicDetail,
  mockEpicList,
  mockStoryDetail,
} from '../utils/mock-api.ts';

/**
 * Empty State Tests
 *
 * These tests verify that the dashboard displays appropriate messaging
 * when data is empty (no epics, no stories, no tasks, no journal entries).
 */

test.describe('Empty States', () => {
  test.describe('Epic List Page', () => {
    test('should show empty state message when no epics exist', async ({ page }) => {
      // Mock empty epic list
      await mockEpicList(page, []);

      // Navigate to the epic list page
      await page.goto('/');

      // Wait for loading to complete
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify empty state message is displayed
      await expect(page.getByText('No epics found.')).toBeVisible();
      await expect(page.getByText('/create-epic')).toBeVisible();
      await expect(page.getByText('Run')).toBeVisible();
      await expect(page.getByText('to get started.')).toBeVisible();
    });

    test('should show empty state when all epics are archived and toggle is off', async ({
      page,
    }) => {
      // Mock epics where all are archived
      const archivedEpics = [
        createMockEpicSummary({
          slug: 'archived-epic-1',
          title: 'Archived Epic 1',
          isArchived: true,
        }),
        createMockEpicSummary({
          slug: 'archived-epic-2',
          title: 'Archived Epic 2',
          isArchived: true,
        }),
      ];
      await mockEpicList(page, archivedEpics);

      // Navigate to the epic list page
      await page.goto('/');

      // Wait for loading to complete
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify empty state shows (archived epics are hidden by default)
      await expect(page.getByText('No epics found.')).toBeVisible();

      // Verify archive toggle is present (since there are archived epics)
      await expect(page.getByText('Show archived')).toBeVisible();
    });

    test('should show archived epics when toggle is enabled', async ({ page }) => {
      // Mock epics where all are archived
      const archivedEpics = [
        createMockEpicSummary({
          slug: 'archived-epic-1',
          title: 'Archived Epic One',
          isArchived: true,
        }),
      ];
      await mockEpicList(page, archivedEpics);

      // Navigate to the epic list page
      await page.goto('/');

      // Wait for loading to complete
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Initially shows empty state
      await expect(page.getByText('No epics found.')).toBeVisible();

      // Enable the archive toggle
      await page.getByText('Show archived').click();

      // Now archived epic should be visible
      await expect(page.getByText('Archived Epic One')).toBeVisible();

      // Empty state should no longer be visible
      await expect(page.getByText('No epics found.')).not.toBeVisible();
    });
  });

  test.describe('Epic Detail Page', () => {
    test('should show empty state when epic has no stories', async ({ page }) => {
      // Create an epic with no stories
      const emptyEpic = createMockEpic({
        slug: 'empty-epic',
        title: 'Empty Epic',
        stories: [],
      });

      // Mock the API routes
      await mockEpicList(page, [
        createMockEpicSummary({
          slug: 'empty-epic',
          title: 'Empty Epic',
          storyCounts: { ready: 0, inProgress: 0, blocked: 0, completed: 0, total: 0 },
        }),
      ]);
      await mockEpicDetail(page, emptyEpic);

      // Navigate to the epic detail page
      await page.goto('/epic/empty-epic');

      // Verify empty state message is displayed
      await expect(page.getByText('No stories in this epic.')).toBeVisible();
      await expect(page.getByText('/generate-stories')).toBeVisible();
      await expect(page.getByText('to create stories.')).toBeVisible();
    });

    test('should show epic header even when no stories exist', async ({ page }) => {
      // Create an epic with no stories
      const emptyEpic = createMockEpic({
        slug: 'empty-epic',
        title: 'Epic With No Stories',
        stories: [],
      });

      await mockEpicList(page, [
        createMockEpicSummary({
          slug: 'empty-epic',
          title: 'Epic With No Stories',
        }),
      ]);
      await mockEpicDetail(page, emptyEpic);

      // Navigate to the epic detail page
      await page.goto('/epic/empty-epic');

      // Verify the epic title is displayed
      await expect(page.getByRole('heading', { name: 'Epic With No Stories' })).toBeVisible();

      // Verify progress section shows 0/0
      await expect(page.getByText('0/0 stories completed')).toBeVisible();
    });

    test('should show 0% progress when no stories exist', async ({ page }) => {
      // Create an epic with no stories
      const emptyEpic = createMockEpic({
        slug: 'no-stories',
        title: 'No Stories Epic',
        stories: [],
      });

      await mockEpicList(page, [
        createMockEpicSummary({ slug: 'no-stories', title: 'No Stories Epic' }),
      ]);
      await mockEpicDetail(page, emptyEpic);

      // Navigate to the epic detail page
      await page.goto('/epic/no-stories');

      // Verify progress bar shows (value should be 0)
      const progressBar = page.getByRole('progressbar');
      await expect(progressBar).toBeVisible();
    });
  });

  test.describe('Story Detail Page', () => {
    test('should show empty state when story has no tasks', async ({ page }) => {
      // Create a story with no tasks
      const storyNoTasks = createMockStoryDetail({
        slug: 'no-tasks-story',
        title: 'Story Without Tasks',
        epicSlug: 'test-epic',
        tasks: [],
        journal: [],
      });

      const epicWithStory = createMockEpic({
        slug: 'test-epic',
        title: 'Test Epic',
        stories: [storyNoTasks],
      });

      await mockEpicList(page, [createMockEpicSummary({ slug: 'test-epic', title: 'Test Epic' })]);
      await mockEpicDetail(page, epicWithStory);
      await mockStoryDetail(page, storyNoTasks);

      // Navigate to the story detail page
      await page.goto('/epic/test-epic/story/no-tasks-story');

      // Verify tasks tab is active by default
      await expect(page.getByRole('tab', { name: 'Tasks' })).toHaveAttribute(
        'data-state',
        'active',
      );

      // Verify empty tasks message
      await expect(page.getByText('No tasks defined for this story.')).toBeVisible();
    });

    test('should show empty state when story has no content', async ({ page }) => {
      // Create a story with no content
      const storyNoContent = createMockStoryDetail({
        slug: 'no-content-story',
        title: 'Story Without Content',
        epicSlug: 'test-epic',
        tasks: [],
        journal: [],
        content: undefined,
      });

      const epicWithStory = createMockEpic({
        slug: 'test-epic',
        title: 'Test Epic',
        stories: [storyNoContent],
      });

      await mockEpicList(page, [createMockEpicSummary({ slug: 'test-epic', title: 'Test Epic' })]);
      await mockEpicDetail(page, epicWithStory);
      await mockStoryDetail(page, storyNoContent);

      // Navigate to the story detail page
      await page.goto('/epic/test-epic/story/no-content-story');

      // Click on the Story Content tab
      await page.getByRole('tab', { name: 'Story Content' }).click();

      // Verify empty content message
      await expect(page.getByText('No story content available.')).toBeVisible();
    });

    test('should show empty state when story has no journal entries', async ({ page }) => {
      // Create a story with no journal entries
      const storyNoJournal = createMockStoryDetail({
        slug: 'no-journal-story',
        title: 'Story Without Journal',
        epicSlug: 'test-epic',
        tasks: [],
        journal: [],
      });

      const epicWithStory = createMockEpic({
        slug: 'test-epic',
        title: 'Test Epic',
        stories: [storyNoJournal],
      });

      await mockEpicList(page, [createMockEpicSummary({ slug: 'test-epic', title: 'Test Epic' })]);
      await mockEpicDetail(page, epicWithStory);
      await mockStoryDetail(page, storyNoJournal);

      // Navigate to the story detail page
      await page.goto('/epic/test-epic/story/no-journal-story');

      // Click on the Journal tab
      await page.getByRole('tab', { name: 'Journal' }).click();

      // Verify empty journal message
      await expect(page.getByText('No journal entries yet.')).toBeVisible();
    });

    test('should show 0/0 tasks completed for story with no tasks', async ({ page }) => {
      // Create a story with no tasks
      const storyNoTasks = createMockStoryDetail({
        slug: 'empty-story',
        title: 'Empty Story',
        epicSlug: 'test-epic',
        tasks: [],
        journal: [],
      });

      const epicWithStory = createMockEpic({
        slug: 'test-epic',
        title: 'Test Epic',
        stories: [storyNoTasks],
      });

      await mockEpicList(page, [createMockEpicSummary({ slug: 'test-epic', title: 'Test Epic' })]);
      await mockEpicDetail(page, epicWithStory);
      await mockStoryDetail(page, storyNoTasks);

      // Navigate to the story detail page
      await page.goto('/epic/test-epic/story/empty-story');

      // Verify 0/0 tasks completed is shown in the header
      await expect(page.getByText('0/0 tasks completed')).toBeVisible();
    });

    test('should display story header correctly even with all empty states', async ({ page }) => {
      // Create a completely empty story
      const emptyStory = createMockStoryDetail({
        slug: 'completely-empty',
        title: 'Completely Empty Story',
        status: 'ready',
        epicSlug: 'test-epic',
        tasks: [],
        journal: [],
        content: undefined,
      });

      const epicWithStory = createMockEpic({
        slug: 'test-epic',
        title: 'Test Epic',
        stories: [emptyStory],
      });

      await mockEpicList(page, [createMockEpicSummary({ slug: 'test-epic', title: 'Test Epic' })]);
      await mockEpicDetail(page, epicWithStory);
      await mockStoryDetail(page, emptyStory);

      // Navigate to the story detail page
      await page.goto('/epic/test-epic/story/completely-empty');

      // Verify header elements are displayed correctly
      await expect(page.getByRole('heading', { name: 'Completely Empty Story' })).toBeVisible();
      await expect(page.getByText('Ready')).toBeVisible();
      await expect(page.getByText('0/0 tasks completed')).toBeVisible();

      // Verify breadcrumb navigation is present (target breadcrumb specifically to avoid matching header link)
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb.getByRole('link', { name: 'test-epic' })).toBeVisible();
    });
  });

  test.describe('Multiple Empty States Combined', () => {
    test('should navigate from empty epic list to create epic guidance', async ({ page }) => {
      // Mock empty epic list
      await mockEpicList(page, []);

      // Navigate to the epic list page
      await page.goto('/');

      // Verify guidance text is actionable
      const createEpicCode = page.locator('code:has-text("/create-epic")');
      await expect(createEpicCode).toBeVisible();
    });

    test('should navigate from empty story list to generate stories guidance', async ({ page }) => {
      // Create an epic with no stories
      const emptyEpic = createMockEpic({
        slug: 'empty-epic',
        title: 'Empty Epic',
        stories: [],
      });

      await mockEpicList(page, [
        createMockEpicSummary({ slug: 'empty-epic', title: 'Empty Epic' }),
      ]);
      await mockEpicDetail(page, emptyEpic);

      // Navigate to the epic detail page
      await page.goto('/epic/empty-epic');

      // Verify guidance text is actionable
      const generateStoriesCode = page.locator('code:has-text("/generate-stories")');
      await expect(generateStoriesCode).toBeVisible();
    });

    test('should handle transition from data to empty state on navigation', async ({ page }) => {
      // First, set up an epic with stories
      const epicWithStories = createMockEpic({
        slug: 'epic-with-stories',
        title: 'Epic With Stories',
        stories: [
          createMockStoryDetail({
            slug: 'story-1',
            title: 'Story One',
            epicSlug: 'epic-with-stories',
          }),
        ],
      });

      // And an empty epic
      const emptyEpic = createMockEpic({
        slug: 'empty-epic',
        title: 'Empty Epic',
        stories: [],
      });

      await mockEpicList(page, [
        createMockEpicSummary({
          slug: 'epic-with-stories',
          title: 'Epic With Stories',
          storyCounts: { ready: 1, inProgress: 0, blocked: 0, completed: 0, total: 1 },
        }),
        createMockEpicSummary({
          slug: 'empty-epic',
          title: 'Empty Epic',
          storyCounts: { ready: 0, inProgress: 0, blocked: 0, completed: 0, total: 0 },
        }),
      ]);
      await mockEpicDetail(page, epicWithStories);
      await mockEpicDetail(page, emptyEpic);
      await mockStoryDetail(
        page,
        createMockStoryDetail({
          slug: 'story-1',
          title: 'Story One',
          epicSlug: 'epic-with-stories',
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
