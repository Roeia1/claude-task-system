import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockEpicSummary,
  createMockStoryDetail,
  createMockTask,
  mockEpicDetail,
  mockEpicList,
  mockStoryDetail,
} from '../utils/mock-api.ts';

/**
 * Navigation tests for the dashboard.
 * Tests navigation between epic list, epic detail, and story detail pages.
 */
test.describe('Navigation', () => {
  test.describe('Epic List to Epic Detail', () => {
    test('should navigate from epic list to epic detail when clicking an epic card', async ({
      page,
    }) => {
      // Setup mock data
      const epic = createMockEpicSummary({
        id: 'test-epic',
        title: 'Test Epic',
        storyCounts: {
          pending: 1,
          inProgress: 1,
          completed: 2,
          total: 4,
        },
      });
      const epicDetail = createMockEpic({
        id: 'test-epic',
        title: 'Test Epic',
        stories: [
          createMockStoryDetail({
            id: 'story-1',
            title: 'Story One',
            status: 'pending',
            epic: 'test-epic',
          }),
        ],
      });

      await mockEpicList(page, [epic]);
      await mockEpicDetail(page, epicDetail);

      // Navigate to epic list
      await page.goto('/');
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();
      await expect(page.getByText('Test Epic')).toBeVisible();

      // Click on the epic card to navigate
      await page.getByText('Test Epic').click();

      // Verify we're on the epic detail page
      await expect(page).toHaveURL('/epic/test-epic');
      await expect(page.getByRole('heading', { name: 'Test Epic' })).toBeVisible();
    });

    test('should display epic progress after navigation', async ({ page }) => {
      const epic = createMockEpicSummary({
        id: 'progress-epic',
        title: 'Progress Epic',
        storyCounts: {
          pending: 1,
          inProgress: 2,
          completed: 3,
          total: 6,
        },
      });
      const epicDetail = createMockEpic({
        id: 'progress-epic',
        title: 'Progress Epic',
        storyCounts: {
          pending: 1,
          inProgress: 2,
          completed: 3,
          total: 6,
        },
        stories: [],
      });

      await mockEpicList(page, [epic]);
      await mockEpicDetail(page, epicDetail);

      await page.goto('/');
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await page.getByText('Progress Epic').click();
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify progress information is displayed
      await expect(page.getByText('3/6 stories completed')).toBeVisible();
    });

    test('should navigate to correct epic when multiple epics exist', async ({ page }) => {
      const epics = [
        createMockEpicSummary({ id: 'epic-alpha', title: 'Epic Alpha' }),
        createMockEpicSummary({ id: 'epic-beta', title: 'Epic Beta' }),
        createMockEpicSummary({ id: 'epic-gamma', title: 'Epic Gamma' }),
      ];

      await mockEpicList(page, epics);
      await mockEpicDetail(
        page,
        createMockEpic({ id: 'epic-beta', title: 'Epic Beta', stories: [] }),
      );

      await page.goto('/');
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Click on the middle epic
      await page.getByText('Epic Beta').click();

      // Verify correct URL
      await expect(page).toHaveURL('/epic/epic-beta');
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
            status: 'in_progress',
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
        status: 'in_progress',
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

      // Verify breadcrumb shows "Epics" link and current epic
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.getByText('Epics')).toBeVisible();
      await expect(breadcrumb.getByText('my-epic')).toBeVisible();
    });

    test('should navigate back to epic list via breadcrumb', async ({ page }) => {
      const epics = [createMockEpicSummary({ id: 'test-epic', title: 'Test Epic' })];
      const epicDetail = createMockEpic({
        id: 'test-epic',
        title: 'Test Epic',
        stories: [],
      });

      await mockEpicList(page, epics);
      await mockEpicDetail(page, epicDetail);

      await page.goto('/epic/test-epic');
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Click on "Epics" in breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await breadcrumb.getByText('Epics').click();

      // Verify navigation back to home
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();
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

      // Verify breadcrumb shows path with epic context: Epics > parent-epic > child-story
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.getByText('Epics')).toBeVisible();
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
    test('should complete full navigation flow: list -> epic -> story -> back to epic -> back to list', async ({
      page,
    }) => {
      const epics = [
        createMockEpicSummary({
          id: 'flow-epic',
          title: 'Flow Epic',
          storyCounts: {
            pending: 1,
            inProgress: 0,
            completed: 0,
            total: 1,
          },
        }),
      ];
      const epicDetail = createMockEpic({
        id: 'flow-epic',
        title: 'Flow Epic',
        stories: [
          createMockStoryDetail({
            id: 'flow-story',
            title: 'Flow Story',
            status: 'pending',
            epic: 'flow-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        id: 'flow-story',
        title: 'Flow Story',
        status: 'pending',
        epic: 'flow-epic',
        tasks: [createMockTask({ id: 't1', subject: 'Flow Task', status: 'pending' })],
      });

      await mockEpicList(page, epics);
      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      // Start at epic list
      await page.goto('/');
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();

      // Navigate to epic detail
      await page.getByText('Flow Epic').click();
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(page).toHaveURL('/epic/flow-epic');
      await expect(page.getByRole('heading', { name: 'Flow Epic' })).toBeVisible();

      // Navigate to story detail
      await page.getByText('Flow Story').click();
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(page).toHaveURL('/story/flow-story');
      await expect(page.getByRole('heading', { name: 'Flow Story' })).toBeVisible();
      await expect(page.getByText('Flow Task')).toBeVisible();

      // Navigate back to epic via the epic link (breadcrumb or story header)
      await page.getByRole('link', { name: 'flow-epic' }).first().click();
      await expect(page).toHaveURL('/epic/flow-epic');

      // Navigate back to list via breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await breadcrumb.getByText('Epics').click();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      const epics = [createMockEpicSummary({ id: 'nav-epic', title: 'Nav Epic' })];
      const epicDetail = createMockEpic({
        id: 'nav-epic',
        title: 'Nav Epic',
        stories: [
          createMockStoryDetail({
            id: 'nav-story',
            title: 'Nav Story',
            status: 'pending',
            epic: 'nav-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        id: 'nav-story',
        title: 'Nav Story',
        status: 'pending',
        epic: 'nav-epic',
      });

      await mockEpicList(page, epics);
      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      // Navigate forward through app
      await page.goto('/');
      await expect(page.getByTestId('epic-card-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await page.getByText('Nav Epic').click();
      await expect(page.getByTestId('epic-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await page.getByText('Nav Story').click();
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await expect(page).toHaveURL('/story/nav-story');

      // Go back to epic
      await page.goBack();
      await expect(page).toHaveURL('/epic/nav-epic');

      // Go back to list
      await page.goBack();
      await expect(page).toHaveURL('/');

      // Go forward to epic
      await page.goForward();
      await expect(page).toHaveURL('/epic/nav-epic');

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
            status: 'in_progress',
            epic: 'link-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        id: 'link-story',
        title: 'Link Story',
        status: 'in_progress',
        epic: 'link-epic',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/link-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // The story detail page has an inline link to the epic in the header
      // Find and click the epic link in the story header (in main content, not breadcrumb)
      const epicLink = page.getByRole('main').getByRole('link', { name: 'link-epic' });
      await epicLink.click();

      // Verify navigation to epic detail
      await expect(page).toHaveURL('/epic/link-epic');
    });
  });
});
