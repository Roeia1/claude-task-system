import { expect, test } from '@playwright/test';
import {
  createMockEpic,
  createMockJournalEntry,
  createMockStoryDetail,
  createMockTask,
  mockEpicDetail,
  mockStoryDetail,
} from '../utils/mock-api.ts';

// Top-level regex patterns for tab names
const REGEX_JOURNAL = /Journal/;
const REGEX_SESSIONS = /Sessions/;

/**
 * Story detail interaction tests for the dashboard.
 * Tests tab switching and collapsible journal entry behavior.
 */
test.describe('Story Detail Interactions', () => {
  test.describe('Tab Switching', () => {
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
        journal: [
          createMockJournalEntry({ type: 'session', title: 'Session 1', content: 'Work done' }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/tab-epic/story/tab-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify Tasks tab is active and content is visible
      await expect(page.getByRole('tab', { name: 'Tasks' })).toHaveAttribute(
        'data-state',
        'active',
      );
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
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Click on Story Content tab
      await page.getByRole('tab', { name: 'Story Content' }).click();

      // Verify tab is active and content is shown
      await expect(page.getByRole('tab', { name: 'Story Content' })).toHaveAttribute(
        'data-state',
        'active',
      );
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
          createMockJournalEntry({
            type: 'session',
            title: 'First Session',
            content: 'Started working',
          }),
          createMockJournalEntry({
            type: 'session',
            title: 'Second Session',
            content: 'Made progress',
          }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/epic/journal-epic/story/journal-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Click on Journal tab
      await page.getByRole('tab', { name: REGEX_JOURNAL }).click();

      // Verify tab is active and journal entries are shown
      await expect(page.getByRole('tab', { name: REGEX_JOURNAL })).toHaveAttribute(
        'data-state',
        'active',
      );
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
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Verify Journal tab shows blocker count
      const journalTab = page.getByRole('tab', { name: REGEX_JOURNAL });
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
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Switch to Story Content
      await page.getByRole('tab', { name: 'Story Content' }).click();
      await expect(page.getByText('Content text')).toBeVisible();

      // Switch to Journal
      await page.getByRole('tab', { name: REGEX_JOURNAL }).click();
      // Look for the journal section heading indicating sessions exist
      await expect(page.getByRole('heading', { name: REGEX_SESSIONS })).toBeVisible();

      // Switch back to Tasks
      await page.getByRole('tab', { name: 'Tasks' }).click();
      await expect(page.getByText('Task A')).toBeVisible();
    });
  });

  test.describe('Collapsible Journal Entries', () => {
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
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });

      // Go to Journal tab
      await page.getByRole('tab', { name: REGEX_JOURNAL }).click();

      // Session entries are collapsed by default
      await expect(page.getByText('Expandable Session')).toBeVisible();
      // Content should not be visible initially (collapsed)
      await expect(
        page.getByText('This is the detailed content of the session.'),
      ).not.toBeVisible();

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
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });
      await page.getByRole('tab', { name: REGEX_JOURNAL }).click();

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
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });
      await page.getByRole('tab', { name: REGEX_JOURNAL }).click();

      // Blocker entries should be expanded by default
      await expect(page.getByText('Critical Blocker')).toBeVisible();
      await expect(
        page.getByText('This blocker content should be visible by default.'),
      ).toBeVisible();
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
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, { timeout: 10_000 });
      await page.getByRole('tab', { name: REGEX_JOURNAL }).click();

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
});
