import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockStoryDetail,
  createMockTask,
  mockAllStories,
  mockEpicDetail,
  mockSessions,
  mockStoryDetail,
} from '../utils/mock-api.ts';

// Regex patterns defined at module level for performance
const OPEN_STORY_REGEX = /Open story/;

/**
 * Navigation tests for the dashboard.
 * Tests navigation between kanban board, epic detail, and story detail pages.
 */
test.describe('Navigation', () => {
  test.describe('Kanban Board to Story Detail', () => {
    test('should navigate from kanban board to story detail when clicking "Open story" link', async ({
      page,
    }) => {
      const story = createMockStoryDetail({
        id: 'test-story',
        title: 'Test Story',
        status: 'pending',
        epic: 'test-epic',
      });

      await mockAllStories(page, [story]);
      await mockSessions(page, []);
      await mockStoryDetail(page, story);

      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Test Story')).toBeVisible();

      // Expand the story card and click "Open story"
      await page.getByTestId('story-card-trigger-test-story').click();
      await page.getByRole('link', { name: OPEN_STORY_REGEX }).click();

      await expect(page).toHaveURL('/story/test-story');
      await expect(page.getByRole('heading', { name: 'Test Story' })).toBeVisible();
    });

    test('should show stories in correct kanban columns', async ({ page }) => {
      const stories = [
        createMockStoryDetail({ id: 'pending-s', title: 'Pending Story', status: 'pending' }),
        createMockStoryDetail({ id: 'progress-s', title: 'Progress Story', status: 'inProgress' }),
        createMockStoryDetail({ id: 'done-s', title: 'Done Story', status: 'completed' }),
      ];

      await mockAllStories(page, stories);
      await mockSessions(page, []);

      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

      // Verify stories are in the correct columns
      const pendingCol = page.getByTestId('column-pending');
      await expect(pendingCol.getByText('Pending Story')).toBeVisible();

      const inProgressCol = page.getByTestId('column-inProgress');
      await expect(inProgressCol.getByText('Progress Story')).toBeVisible();

      const completedCol = page.getByTestId('column-completed');
      await expect(completedCol.getByText('Done Story')).toBeVisible();
    });
  });

  test.describe('Epic Detail to Story Detail', () => {
    test('should navigate from epic detail to story detail when clicking a story card', async ({
      page,
    }) => {
      const epicDetail = createMockEpic({
        id: 'test-epic',
        title: 'Test Epic',
        stories: [
          createMockStoryDetail({
            id: 'my-story',
            title: 'My Story',
            status: 'inProgress',
            epic: 'test-epic',
            tasks: [
              createMockTask({
                id: 't1',
                subject: 'Task 1',
                status: 'completed',
              }),
            ],
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        id: 'my-story',
        title: 'My Story',
        status: 'inProgress',
        epic: 'test-epic',
        tasks: [createMockTask({ id: 't1', subject: 'Task 1', status: 'completed' })],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      // Navigate directly to epic detail
      await page.goto('/epic/test-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(page.getByText('My Story')).toBeVisible();

      // Click on the story card
      await page.getByText('My Story').click();

      // Verify navigation to story detail
      await expect(page).toHaveURL('/story/my-story');
      await expect(page.getByRole('heading', { name: 'My Story' })).toBeVisible();
    });

    test('should show story status badge after navigation', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'epic-1',
        title: 'Epic One',
        stories: [
          createMockStoryDetail({
            id: 'pending-story',
            title: 'Pending Story',
            status: 'pending',
            epic: 'epic-1',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        id: 'pending-story',
        title: 'Pending Story',
        status: 'pending',
        epic: 'epic-1',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/epic-1');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await page.getByText('Pending Story').click();
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify the status badge shows "Pending"
      await expect(page.getByText('Pending', { exact: true })).toBeVisible();
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should show breadcrumb on epic detail page', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'my-epic',
        title: 'My Epic',
        stories: [],
      });

      await mockEpicDetail(page, epicDetail);

      await page.goto('/epic/my-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify breadcrumb shows "Board" link and current epic
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.getByText('Board')).toBeVisible();
      await expect(breadcrumb.getByText('my-epic')).toBeVisible();
    });

    test('should navigate back to kanban board via breadcrumb', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'test-epic',
        title: 'Test Epic',
        stories: [],
      });

      await mockAllStories(page, []);
      await mockSessions(page, []);
      await mockEpicDetail(page, epicDetail);

      await page.goto('/epic/test-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Click on "Board" in breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await breadcrumb.getByText('Board').click();

      // Verify navigation back to home (kanban board)
      await expect(page).toHaveURL('/');
    });

    test('should show full breadcrumb path on story detail page', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'parent-epic',
        title: 'Parent Epic',
        stories: [
          createMockStoryDetail({
            id: 'child-story',
            title: 'Child Story',
            status: 'pending',
            epic: 'parent-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        id: 'child-story',
        title: 'Child Story',
        status: 'pending',
        epic: 'parent-epic',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/child-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify breadcrumb shows path with epic context: Board > parent-epic > child-story
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.getByText('Board')).toBeVisible();
      await expect(breadcrumb.getByText('parent-epic')).toBeVisible();
      await expect(breadcrumb.getByText('child-story')).toBeVisible();
    });

    test('should navigate to epic detail via epic link in story header', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'nav-epic',
        title: 'Navigation Epic',
        stories: [
          createMockStoryDetail({
            id: 'nav-story',
            title: 'Navigation Story',
            status: 'pending',
            epic: 'nav-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        id: 'nav-story',
        title: 'Navigation Story',
        status: 'pending',
        epic: 'nav-epic',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/nav-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Click on the epic link in the story header (epic link also appears in breadcrumb)
      await page.getByRole('link', { name: 'nav-epic' }).first().click();

      // Verify navigation to epic detail
      await expect(page).toHaveURL('/epic/nav-epic');
    });
  });

  test.describe('Full Navigation Flow', () => {
    test('should complete full navigation flow: kanban -> story detail -> epic detail -> back', async ({
      page,
    }) => {
      const story = createMockStoryDetail({
        id: 'flow-story',
        title: 'Flow Story',
        status: 'pending',
        epic: 'flow-epic',
        tasks: [createMockTask({ id: 't1', subject: 'Flow Task', status: 'pending' })],
      });
      const epicDetail = createMockEpic({
        id: 'flow-epic',
        title: 'Flow Epic',
        stories: [story],
      });

      await mockAllStories(page, [story]);
      await mockSessions(page, []);
      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, story);

      // Start at kanban board
      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Flow Story')).toBeVisible();

      // Expand card and navigate to story detail
      await page.getByTestId('story-card-trigger-flow-story').click();
      await page.getByRole('link', { name: OPEN_STORY_REGEX }).click();
      await expect(page).toHaveURL('/story/flow-story');
      await expect(page.getByRole('heading', { name: 'Flow Story' })).toBeVisible();
      await expect(page.getByText('Flow Task')).toBeVisible();

      // Navigate to epic via the epic link (breadcrumb or story header)
      await page.getByRole('link', { name: 'flow-epic' }).first().click();
      await expect(page).toHaveURL('/epic/flow-epic');

      // Navigate back to kanban via breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await breadcrumb.getByText('Board').click();
      await expect(page).toHaveURL('/');
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      const story = createMockStoryDetail({
        id: 'nav-story',
        title: 'Nav Story',
        status: 'pending',
        epic: 'nav-epic',
      });
      const epicDetail = createMockEpic({
        id: 'nav-epic',
        title: 'Nav Epic',
        stories: [story],
      });

      await mockAllStories(page, [story]);
      await mockSessions(page, []);
      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, story);

      // Start at kanban board
      await page.goto('/');
      await expect(page.getByTestId('kanban-board')).toBeVisible({ timeout: 10_000 });

      // Navigate to story detail via expand + click
      await page.getByTestId('story-card-trigger-nav-story').click();
      await page.getByRole('link', { name: OPEN_STORY_REGEX }).click();
      await expect(page).toHaveURL('/story/nav-story');

      // Go back to kanban
      await page.goBack();
      await expect(page).toHaveURL('/');

      // Go forward to story
      await page.goForward();
      await expect(page).toHaveURL('/story/nav-story');
    });

    test('should navigate correctly via links in story header', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'link-epic',
        title: 'Link Epic',
        stories: [
          createMockStoryDetail({
            id: 'link-story',
            title: 'Link Story',
            status: 'inProgress',
            epic: 'link-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        id: 'link-story',
        title: 'Link Story',
        status: 'inProgress',
        epic: 'link-epic',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/link-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // The story detail page has an inline link to the epic in the header
      const epicLink = page.getByRole('main').getByRole('link', { name: 'link-epic' });
      await epicLink.click();

      // Verify navigation to epic detail
      await expect(page).toHaveURL('/epic/link-epic');
    });
  });
});
