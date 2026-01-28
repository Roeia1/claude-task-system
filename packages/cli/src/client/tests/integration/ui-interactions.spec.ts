import { test, expect } from '@playwright/test';
import {
  createMockEpicSummary,
  createMockEpic,
  createMockStoryDetail,
  createMockTask,
  createMockJournalEntry,
  mockEpicList,
  mockEpicDetail,
  mockStoryDetail,
} from '../utils/mock-api';

test.describe('UI Interactions', () => {
  test.describe('Navigation - Epic List to Epic Detail', () => {
    test('should navigate from epic list to epic detail when clicking an epic card', async ({ page }) => {
      // Setup mock data
      const epic = createMockEpicSummary({
        slug: 'test-epic',
        title: 'Test Epic',
        storyCounts: { ready: 1, inProgress: 1, blocked: 0, completed: 2, total: 4 },
      });
      const epicDetail = createMockEpic({
        slug: 'test-epic',
        title: 'Test Epic',
        stories: [
          createMockStoryDetail({ slug: 'story-1', title: 'Story One', status: 'ready', epicSlug: 'test-epic' }),
        ],
      });

      await mockEpicList(page, [epic]);
      await mockEpicDetail(page, epicDetail);

      // Navigate to epic list
      await page.goto('/');
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
        slug: 'progress-epic',
        title: 'Progress Epic',
        storyCounts: { ready: 1, inProgress: 2, blocked: 0, completed: 3, total: 6 },
      });
      const epicDetail = createMockEpic({
        slug: 'progress-epic',
        title: 'Progress Epic',
        storyCounts: { ready: 1, inProgress: 2, blocked: 0, completed: 3, total: 6 },
        stories: [],
      });

      await mockEpicList(page, [epic]);
      await mockEpicDetail(page, epicDetail);

      await page.goto('/');
      await page.getByText('Progress Epic').click();

      // Verify progress information is displayed
      await expect(page.getByText('3/6 stories completed')).toBeVisible();
    });

    test('should navigate to correct epic when multiple epics exist', async ({ page }) => {
      const epics = [
        createMockEpicSummary({ slug: 'epic-alpha', title: 'Epic Alpha' }),
        createMockEpicSummary({ slug: 'epic-beta', title: 'Epic Beta' }),
        createMockEpicSummary({ slug: 'epic-gamma', title: 'Epic Gamma' }),
      ];

      await mockEpicList(page, epics);
      await mockEpicDetail(page, createMockEpic({ slug: 'epic-beta', title: 'Epic Beta', stories: [] }));

      await page.goto('/');

      // Click on the middle epic
      await page.getByText('Epic Beta').click();

      // Verify correct URL
      await expect(page).toHaveURL('/epic/epic-beta');
    });
  });

  test.describe('Navigation - Epic Detail to Story Detail', () => {
    test('should navigate from epic detail to story detail when clicking a story card', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'test-epic',
        title: 'Test Epic',
        stories: [
          createMockStoryDetail({
            slug: 'my-story',
            title: 'My Story',
            status: 'in_progress',
            epicSlug: 'test-epic',
            tasks: [createMockTask({ id: 't1', title: 'Task 1', status: 'completed' })],
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'my-story',
        title: 'My Story',
        status: 'in_progress',
        epicSlug: 'test-epic',
        tasks: [createMockTask({ id: 't1', title: 'Task 1', status: 'completed' })],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      // Navigate directly to epic detail
      await page.goto('/epic/test-epic');
      await expect(page.getByText('My Story')).toBeVisible();

      // Click on the story card
      await page.getByText('My Story').click();

      // Verify navigation to story detail
      await expect(page).toHaveURL('/epic/test-epic/story/my-story');
      await expect(page.getByRole('heading', { name: 'My Story' })).toBeVisible();
    });

    test('should show story status badge after navigation', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'epic-1',
        title: 'Epic One',
        stories: [
          createMockStoryDetail({
            slug: 'blocked-story',
            title: 'Blocked Story',
            status: 'blocked',
            epicSlug: 'epic-1',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'blocked-story',
        title: 'Blocked Story',
        status: 'blocked',
        epicSlug: 'epic-1',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/epic-1');
      await page.getByText('Blocked Story').click();

      // Verify the status badge shows "Blocked"
      await expect(page.getByText('Blocked', { exact: true })).toBeVisible();
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should show breadcrumb on epic detail page', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'my-epic',
        title: 'My Epic',
        stories: [],
      });

      await mockEpicDetail(page, epicDetail);

      await page.goto('/epic/my-epic');

      // Verify breadcrumb shows "Epics" link and current epic
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.getByText('Epics')).toBeVisible();
      await expect(breadcrumb.getByText('my-epic')).toBeVisible();
    });

    test('should navigate back to epic list via breadcrumb', async ({ page }) => {
      const epics = [createMockEpicSummary({ slug: 'test-epic', title: 'Test Epic' })];
      const epicDetail = createMockEpic({ slug: 'test-epic', title: 'Test Epic', stories: [] });

      await mockEpicList(page, epics);
      await mockEpicDetail(page, epicDetail);

      await page.goto('/epic/test-epic');

      // Click on "Epics" in breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await breadcrumb.getByText('Epics').click();

      // Verify navigation back to home
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();
    });

    test('should show full breadcrumb path on story detail page', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'parent-epic',
        title: 'Parent Epic',
        stories: [
          createMockStoryDetail({
            slug: 'child-story',
            title: 'Child Story',
            status: 'ready',
            epicSlug: 'parent-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'child-story',
        title: 'Child Story',
        status: 'ready',
        epicSlug: 'parent-epic',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/parent-epic/story/child-story');

      // Verify breadcrumb shows full path
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.getByText('Epics')).toBeVisible();
      await expect(breadcrumb.getByText('parent-epic')).toBeVisible();
      await expect(breadcrumb.getByText('child-story')).toBeVisible();
    });

    test('should navigate to epic detail via breadcrumb from story detail', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'nav-epic',
        title: 'Navigation Epic',
        stories: [
          createMockStoryDetail({
            slug: 'nav-story',
            title: 'Navigation Story',
            status: 'ready',
            epicSlug: 'nav-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'nav-story',
        title: 'Navigation Story',
        status: 'ready',
        epicSlug: 'nav-epic',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/nav-epic/story/nav-story');

      // Click on the epic name in breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await breadcrumb.getByText('nav-epic').click();

      // Verify navigation to epic detail
      await expect(page).toHaveURL('/epic/nav-epic');
    });
  });

  test.describe('Archive Toggle', () => {
    test('should show archive toggle when archived epics exist', async ({ page }) => {
      const epics = [
        createMockEpicSummary({ slug: 'active-epic', title: 'Active Epic', isArchived: false }),
        createMockEpicSummary({ slug: 'archived-epic', title: 'Archived Epic', isArchived: true }),
      ];

      await mockEpicList(page, epics);

      await page.goto('/');

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

      // Enable the toggle
      await page.getByText('Show archived').click();
      await expect(page.getByText('Archived Epic')).toBeVisible();

      // Disable the toggle
      await page.getByText('Show archived').click();
      await expect(page.getByText('Archived Epic')).not.toBeVisible();
    });

    test('should show only archived epics when all epics are archived and toggle is on', async ({ page }) => {
      const epics = [
        createMockEpicSummary({ slug: 'archived-1', title: 'Archived One', isArchived: true }),
        createMockEpicSummary({ slug: 'archived-2', title: 'Archived Two', isArchived: true }),
      ];

      await mockEpicList(page, epics);

      await page.goto('/');

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

  test.describe('Tab Switching - Story Detail', () => {
    test('should show Tasks tab by default on story detail', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'tab-epic',
        title: 'Tab Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'tab-story',
        title: 'Tab Story',
        status: 'in_progress',
        epicSlug: 'tab-epic',
        tasks: [createMockTask({ id: 't1', title: 'Sample Task', status: 'pending' })],
        content: 'Story content here',
        journal: [createMockJournalEntry({ type: 'session', title: 'Session 1', content: 'Work done' })],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/tab-epic/story/tab-story');

      // Verify Tasks tab is active and content is visible
      await expect(page.getByRole('tab', { name: 'Tasks' })).toHaveAttribute('data-state', 'active');
      await expect(page.getByText('Sample Task')).toBeVisible();
    });

    test('should switch to Story Content tab and display content', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'content-epic',
        title: 'Content Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'content-story',
        title: 'Content Story',
        status: 'ready',
        epicSlug: 'content-epic',
        tasks: [],
        content: 'This is the full story content.',
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/content-epic/story/content-story');

      // Click on Story Content tab
      await page.getByRole('tab', { name: 'Story Content' }).click();

      // Verify tab is active and content is shown
      await expect(page.getByRole('tab', { name: 'Story Content' })).toHaveAttribute('data-state', 'active');
      await expect(page.getByText('This is the full story content.')).toBeVisible();
    });

    test('should switch to Journal tab and display entries', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'journal-epic',
        title: 'Journal Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'journal-story',
        title: 'Journal Story',
        status: 'in_progress',
        epicSlug: 'journal-epic',
        tasks: [],
        journal: [
          createMockJournalEntry({ type: 'session', title: 'First Session', content: 'Started working' }),
          createMockJournalEntry({ type: 'session', title: 'Second Session', content: 'Made progress' }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/journal-epic/story/journal-story');

      // Click on Journal tab
      await page.getByRole('tab', { name: /Journal/ }).click();

      // Verify tab is active and journal entries are shown
      await expect(page.getByRole('tab', { name: /Journal/ })).toHaveAttribute('data-state', 'active');
      await expect(page.getByText('First Session')).toBeVisible();
      await expect(page.getByText('Second Session')).toBeVisible();
    });

    test('should show blocker count badge on Journal tab when blockers exist', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'blocker-epic',
        title: 'Blocker Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'blocker-story',
        title: 'Blocker Story',
        status: 'blocked',
        epicSlug: 'blocker-epic',
        tasks: [],
        journal: [
          createMockJournalEntry({ type: 'blocker', title: 'Blocker 1', content: 'Need info' }),
          createMockJournalEntry({ type: 'blocker', title: 'Blocker 2', content: 'Need access' }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/blocker-epic/story/blocker-story');

      // Verify Journal tab shows blocker count
      const journalTab = page.getByRole('tab', { name: /Journal/ });
      await expect(journalTab.getByText('2')).toBeVisible();
    });

    test('should persist tab selection when switching between tabs', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'persist-epic',
        title: 'Persist Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'persist-story',
        title: 'Persist Story',
        status: 'ready',
        epicSlug: 'persist-epic',
        tasks: [createMockTask({ id: 't1', title: 'Task A', status: 'pending' })],
        content: 'Content text',
        journal: [createMockJournalEntry({ type: 'session', title: 'Session', content: 'Notes' })],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/persist-epic/story/persist-story');

      // Switch to Story Content
      await page.getByRole('tab', { name: 'Story Content' }).click();
      await expect(page.getByText('Content text')).toBeVisible();

      // Switch to Journal
      await page.getByRole('tab', { name: /Journal/ }).click();
      // Look for the journal section heading indicating sessions exist
      await expect(page.getByRole('heading', { name: /Sessions/ })).toBeVisible();

      // Switch back to Tasks
      await page.getByRole('tab', { name: 'Tasks' }).click();
      await expect(page.getByText('Task A')).toBeVisible();
    });
  });

  test.describe('Collapsible Sections - Journal Entries', () => {
    test('should expand journal entry when clicked', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'collapsible-epic',
        title: 'Collapsible Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'collapsible-story',
        title: 'Collapsible Story',
        status: 'in_progress',
        epicSlug: 'collapsible-epic',
        tasks: [],
        journal: [
          createMockJournalEntry({
            type: 'session',
            title: 'Expandable Session',
            content: 'This is the detailed content of the session.',
          }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/collapsible-epic/story/collapsible-story');

      // Go to Journal tab
      await page.getByRole('tab', { name: /Journal/ }).click();

      // Session entries are collapsed by default
      await expect(page.getByText('Expandable Session')).toBeVisible();
      // Content should not be visible initially (collapsed)
      await expect(page.getByText('This is the detailed content of the session.')).not.toBeVisible();

      // Click to expand
      await page.getByText('Expandable Session').click();

      // Now content should be visible
      await expect(page.getByText('This is the detailed content of the session.')).toBeVisible();
    });

    test('should collapse journal entry when clicked again', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'toggle-epic',
        title: 'Toggle Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'toggle-story',
        title: 'Toggle Story',
        status: 'in_progress',
        epicSlug: 'toggle-epic',
        tasks: [],
        journal: [
          createMockJournalEntry({
            type: 'session',
            title: 'Toggle Session',
            content: 'Content to toggle',
          }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/toggle-epic/story/toggle-story');
      await page.getByRole('tab', { name: /Journal/ }).click();

      // Expand
      await page.getByText('Toggle Session').click();
      await expect(page.getByText('Content to toggle')).toBeVisible();

      // Collapse
      await page.getByText('Toggle Session').click();
      await expect(page.getByText('Content to toggle')).not.toBeVisible();
    });

    test('should show blocker entries expanded by default', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'blocker-expand-epic',
        title: 'Blocker Expand Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'blocker-expand-story',
        title: 'Blocker Expand Story',
        status: 'blocked',
        epicSlug: 'blocker-expand-epic',
        tasks: [],
        journal: [
          createMockJournalEntry({
            type: 'blocker',
            title: 'Critical Blocker',
            content: 'This blocker content should be visible by default.',
          }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/blocker-expand-epic/story/blocker-expand-story');
      await page.getByRole('tab', { name: /Journal/ }).click();

      // Blocker entries should be expanded by default
      await expect(page.getByText('Critical Blocker')).toBeVisible();
      await expect(page.getByText('This blocker content should be visible by default.')).toBeVisible();
    });

    test('should allow multiple entries to be expanded independently', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'multi-epic',
        title: 'Multi Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'multi-story',
        title: 'Multi Story',
        status: 'in_progress',
        epicSlug: 'multi-epic',
        tasks: [],
        journal: [
          createMockJournalEntry({ type: 'session', title: 'Session A', content: 'Content A' }),
          createMockJournalEntry({ type: 'session', title: 'Session B', content: 'Content B' }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/multi-epic/story/multi-story');
      await page.getByRole('tab', { name: /Journal/ }).click();

      // Both collapsed initially
      await expect(page.getByText('Content A')).not.toBeVisible();
      await expect(page.getByText('Content B')).not.toBeVisible();

      // Expand first entry
      await page.getByText('Session A').click();
      await expect(page.getByText('Content A')).toBeVisible();
      await expect(page.getByText('Content B')).not.toBeVisible();

      // Expand second entry
      await page.getByText('Session B').click();
      await expect(page.getByText('Content A')).toBeVisible();
      await expect(page.getByText('Content B')).toBeVisible();
    });
  });

  test.describe('Full Navigation Flow', () => {
    test('should complete full navigation flow: list -> epic -> story -> back to epic -> back to list', async ({ page }) => {
      const epics = [
        createMockEpicSummary({
          slug: 'flow-epic',
          title: 'Flow Epic',
          storyCounts: { ready: 1, inProgress: 0, blocked: 0, completed: 0, total: 1 },
        }),
      ];
      const epicDetail = createMockEpic({
        slug: 'flow-epic',
        title: 'Flow Epic',
        stories: [
          createMockStoryDetail({
            slug: 'flow-story',
            title: 'Flow Story',
            status: 'ready',
            epicSlug: 'flow-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'flow-story',
        title: 'Flow Story',
        status: 'ready',
        epicSlug: 'flow-epic',
        tasks: [createMockTask({ id: 't1', title: 'Flow Task', status: 'pending' })],
      });

      await mockEpicList(page, epics);
      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      // Start at epic list
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();

      // Navigate to epic detail
      await page.getByText('Flow Epic').click();
      await expect(page).toHaveURL('/epic/flow-epic');
      await expect(page.getByRole('heading', { name: 'Flow Epic' })).toBeVisible();

      // Navigate to story detail
      await page.getByText('Flow Story').click();
      await expect(page).toHaveURL('/epic/flow-epic/story/flow-story');
      await expect(page.getByRole('heading', { name: 'Flow Story' })).toBeVisible();
      await expect(page.getByText('Flow Task')).toBeVisible();

      // Navigate back to epic via breadcrumb
      const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
      await breadcrumb.getByText('flow-epic').click();
      await expect(page).toHaveURL('/epic/flow-epic');

      // Navigate back to list via breadcrumb
      await breadcrumb.getByText('Epics').click();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: 'Epics' })).toBeVisible();
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      const epics = [createMockEpicSummary({ slug: 'nav-epic', title: 'Nav Epic' })];
      const epicDetail = createMockEpic({
        slug: 'nav-epic',
        title: 'Nav Epic',
        stories: [
          createMockStoryDetail({
            slug: 'nav-story',
            title: 'Nav Story',
            status: 'ready',
            epicSlug: 'nav-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'nav-story',
        title: 'Nav Story',
        status: 'ready',
        epicSlug: 'nav-epic',
      });

      await mockEpicList(page, epics);
      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      // Navigate forward through app
      await page.goto('/');
      await page.getByText('Nav Epic').click();
      await page.getByText('Nav Story').click();
      await expect(page).toHaveURL('/epic/nav-epic/story/nav-story');

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
      await expect(page).toHaveURL('/epic/nav-epic/story/nav-story');
    });

    test('should navigate correctly via links in story header', async ({ page }) => {
      const epicDetail = createMockEpic({
        slug: 'link-epic',
        title: 'Link Epic',
        stories: [
          createMockStoryDetail({
            slug: 'link-story',
            title: 'Link Story',
            status: 'in_progress',
            epicSlug: 'link-epic',
          }),
        ],
      });
      const storyDetail = createMockStoryDetail({
        slug: 'link-story',
        title: 'Link Story',
        status: 'in_progress',
        epicSlug: 'link-epic',
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/link-epic/story/link-story');

      // The story detail page has an inline link to the epic in the header
      // Find and click the epic link in the story header (above the title)
      const epicLink = page.locator('.flex.items-center.gap-2').getByText('link-epic');
      await epicLink.click();

      // Verify navigation to epic detail
      await expect(page).toHaveURL('/epic/link-epic');
    });
  });
});
