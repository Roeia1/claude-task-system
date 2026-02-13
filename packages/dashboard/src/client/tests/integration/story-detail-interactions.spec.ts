import { expect } from '@playwright/test';
import { test } from '../fixtures.ts';
import {
  createMockEpic,
  createMockJournalEntry,
  createMockStoryDetail,
  createMockTask,
  type MockSession,
  mockEpicDetail,
  mockSessions,
  mockStoryDetail,
} from '../utils/mock-api.ts';

// Top-level regex patterns for tab names
const REGEX_JOURNAL = /Journal/;
const REGEX_SESSIONS = /Sessions/;

// Session test data constants
const RUNNING_SESSION: MockSession = {
  name: 'saga-story-session-story-12345',
  storyId: 'session-story',
  status: 'running',
  startTime: '2026-01-30T10:00:00Z',
  outputAvailable: true,
  outputPreview: 'Running tests...\nAll tests passed.',
};

const COMPLETED_SESSION: MockSession = {
  name: 'saga-story-session-story-67890',
  storyId: 'session-story',
  status: 'completed',
  startTime: '2026-01-30T08:00:00Z',
  outputAvailable: true,
  outputPreview: 'Build complete.',
};

const OUTPUT_UNAVAILABLE_SESSION: MockSession = {
  name: 'saga-story-session-story-11111',
  storyId: 'session-story',
  status: 'completed',
  startTime: '2026-01-30T06:00:00Z',
  outputAvailable: false,
};

/**
 * Story detail interaction tests for the dashboard.
 * Tests tab switching and collapsible journal entry behavior.
 */
test.describe('Story Detail Interactions', () => {
  test.describe('Tab Switching', () => {
    test('should show Tasks tab by default on story detail', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'tab-epic',
        title: 'Tab Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'tab-story',
        title: 'Tab Story',
        status: 'in_progress',
        epic: 'tab-epic',
        tasks: [createMockTask({ id: 't1', subject: 'Sample Task', status: 'pending' })],
        description: 'Story content here',
        journal: [
          createMockJournalEntry({
            type: 'session',
            title: 'Session 1',
            content: 'Work done',
          }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/tab-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify Tasks tab is active and content is visible
      await expect(page.getByRole('tab', { name: 'Tasks' })).toHaveAttribute(
        'data-state',
        'active',
      );
      await expect(page.getByText('Sample Task')).toBeVisible();
    });

    test('should switch to Story Content tab and display content', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'content-epic',
        title: 'Content Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'content-story',
        title: 'Content Story',
        status: 'pending',
        epic: 'content-epic',
        tasks: [],
        description: 'This is the full story content.',
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/content-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

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
        id: 'journal-epic',
        title: 'Journal Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'journal-story',
        title: 'Journal Story',
        status: 'in_progress',
        epic: 'journal-epic',
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

      await page.goto('/story/journal-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

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
        id: 'blocker-epic',
        title: 'Blocker Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'blocker-story',
        title: 'Blocker Story',
        status: 'pending',
        epic: 'blocker-epic',
        tasks: [],
        journal: [
          createMockJournalEntry({
            type: 'blocker',
            title: 'Blocker 1',
            content: 'Need info',
          }),
          createMockJournalEntry({
            type: 'blocker',
            title: 'Blocker 2',
            content: 'Need access',
          }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/blocker-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify Journal tab shows blocker count
      const journalTab = page.getByRole('tab', { name: REGEX_JOURNAL });
      await expect(journalTab.getByText('2')).toBeVisible();
    });

    test('should persist tab selection when switching between tabs', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'persist-epic',
        title: 'Persist Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'persist-story',
        title: 'Persist Story',
        status: 'pending',
        epic: 'persist-epic',
        tasks: [createMockTask({ id: 't1', subject: 'Task A', status: 'pending' })],
        description: 'Content text',
        journal: [
          createMockJournalEntry({
            type: 'session',
            title: 'Session',
            content: 'Notes',
          }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/persist-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

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
        id: 'collapsible-epic',
        title: 'Collapsible Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'collapsible-story',
        title: 'Collapsible Story',
        status: 'in_progress',
        epic: 'collapsible-epic',
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

      await page.goto('/story/collapsible-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

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
        id: 'toggle-epic',
        title: 'Toggle Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'toggle-story',
        title: 'Toggle Story',
        status: 'in_progress',
        epic: 'toggle-epic',
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

      await page.goto('/story/toggle-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
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
        id: 'blocker-expand-epic',
        title: 'Blocker Expand Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'blocker-expand-story',
        title: 'Blocker Expand Story',
        status: 'pending',
        epic: 'blocker-expand-epic',
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

      await page.goto('/story/blocker-expand-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
      await page.getByRole('tab', { name: REGEX_JOURNAL }).click();

      // Blocker entries should be expanded by default
      await expect(page.getByText('Critical Blocker')).toBeVisible();
      await expect(
        page.getByText('This blocker content should be visible by default.'),
      ).toBeVisible();
    });

    test('should allow multiple entries to be expanded independently', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'multi-epic',
        title: 'Multi Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'multi-story',
        title: 'Multi Story',
        status: 'in_progress',
        epic: 'multi-epic',
        tasks: [],
        journal: [
          createMockJournalEntry({
            type: 'session',
            title: 'Session A',
            content: 'Content A',
          }),
          createMockJournalEntry({
            type: 'session',
            title: 'Session B',
            content: 'Content B',
          }),
        ],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);

      await page.goto('/story/multi-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });
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

  test.describe('Sessions Tab', () => {
    test('should switch to Sessions tab and display empty state when no sessions', async ({
      page,
    }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, []);

      await page.goto('/story/session-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Click Sessions tab
      await page.getByRole('tab', { name: REGEX_SESSIONS }).click();
      await expect(page.getByRole('tab', { name: REGEX_SESSIONS })).toHaveAttribute(
        'data-state',
        'active',
      );

      // Verify empty state
      await expect(page.getByTestId('sessions-panel-empty')).toBeVisible();
      await expect(page.getByText('No sessions found for this story')).toBeVisible();
    });

    test('should display session cards when sessions exist', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, [RUNNING_SESSION, COMPLETED_SESSION]);

      await page.goto('/story/session-story');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Click Sessions tab
      await page.getByRole('tab', { name: REGEX_SESSIONS }).click();
      await expect(page.getByRole('tab', { name: REGEX_SESSIONS })).toHaveAttribute(
        'data-state',
        'active',
      );

      // Verify session cards are displayed
      await expect(page.getByTestId('session-detail-card')).toHaveCount(2);
    });

    test('should navigate to Sessions tab via URL query parameter ?tab=sessions', async ({
      page,
    }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, [RUNNING_SESSION]);

      // Navigate directly with query parameter
      await page.goto('/story/session-story?tab=sessions');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify Sessions tab is active
      await expect(page.getByRole('tab', { name: REGEX_SESSIONS })).toHaveAttribute(
        'data-state',
        'active',
      );
      await expect(page.getByTestId('sessions-panel')).toBeVisible();
    });

    test('should show running session with Running status badge', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, [RUNNING_SESSION]);

      await page.goto('/story/session-story?tab=sessions');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify Running badge is displayed
      const sessionCard = page.getByTestId('session-detail-card');
      await expect(sessionCard.getByText('Running')).toBeVisible();
    });

    test('should show completed session with Completed status badge', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, [COMPLETED_SESSION]);

      await page.goto('/story/session-story?tab=sessions');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify Completed badge is displayed
      const sessionCard = page.getByTestId('session-detail-card');
      await expect(sessionCard.getByText('Completed')).toBeVisible();
    });

    test('should expand session card to show log viewer on click', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      // Create two sessions - the older one won't be auto-expanded
      // Only the most recent one (by startTime) is auto-expanded
      const olderSession: MockSession = {
        ...COMPLETED_SESSION,
        name: 'saga-story-session-story-older',
        startTime: '2026-01-30T06:00:00Z', // Older
      };
      const newerSession: MockSession = {
        ...COMPLETED_SESSION,
        name: 'saga-story-session-story-newer',
        startTime: '2026-01-30T10:00:00Z', // Newer (will be auto-expanded)
      };

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, [olderSession, newerSession]);

      await page.goto('/story/session-story?tab=sessions');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // The newer session is auto-expanded, older one is collapsed
      // Find the older session card (second in list since sorted by startTime descending)
      const sessionCards = page.getByTestId('session-detail-card');
      const olderSessionCard = sessionCards.nth(1); // Second card (older session)

      // Verify log viewer is NOT visible for the older session (collapsed)
      await expect(olderSessionCard.getByTestId('log-viewer')).not.toBeVisible();

      // Click to expand the older session
      await olderSessionCard.click();

      // Verify log viewer is now visible for the older session
      await expect(olderSessionCard.getByTestId('log-viewer')).toBeVisible();
    });

    test('should collapse session card when clicked again', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, [RUNNING_SESSION]);

      await page.goto('/story/session-story?tab=sessions');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // The running session should be auto-expanded
      await expect(page.getByTestId('log-viewer')).toBeVisible();

      // Click on the session name (inside the header/trigger) to collapse
      await page.getByText(RUNNING_SESSION.name).click();

      // Verify log viewer is hidden
      await expect(page.getByTestId('log-viewer')).not.toBeVisible();
    });

    test('should show "Output unavailable" for sessions without output', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, [OUTPUT_UNAVAILABLE_SESSION]);

      await page.goto('/story/session-story?tab=sessions');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify "Output unavailable" message is displayed
      await expect(page.getByText('Output unavailable')).toBeVisible();
    });

    test('should auto-expand most recent running session', async ({ page }) => {
      const epicDetail = createMockEpic({
        id: 'session-epic',
        title: 'Session Epic',
        stories: [],
      });
      const storyDetail = createMockStoryDetail({
        id: 'session-story',
        title: 'Session Story',
        status: 'in_progress',
        epic: 'session-epic',
        tasks: [],
        journal: [],
      });

      // Create sessions with different timestamps
      const olderRunningSession: MockSession = {
        name: 'saga-story-session-story-11111',
        storyId: 'session-story',
        status: 'running',
        startTime: '2026-01-30T08:00:00Z',
        outputAvailable: true,
        outputPreview: 'Older session...',
      };
      const newerRunningSession: MockSession = {
        name: 'saga-story-session-story-22222',
        storyId: 'session-story',
        status: 'running',
        startTime: '2026-01-30T12:00:00Z',
        outputAvailable: true,
        outputPreview: 'Newer session...',
      };

      await mockEpicDetail(page, epicDetail);
      await mockStoryDetail(page, storyDetail);
      await mockSessions(page, [olderRunningSession, newerRunningSession, COMPLETED_SESSION]);

      await page.goto('/story/session-story?tab=sessions');
      await expect(page.getByTestId('story-header-skeleton')).toHaveCount(0, {
        timeout: 10_000,
      });

      // Verify there's exactly one log viewer visible (auto-expanded)
      await expect(page.getByTestId('log-viewer')).toHaveCount(1);

      // The most recent running session (newer) should be expanded
      // It's the first card in the list since sessions are sorted by startTime descending
      const sessionCards = page.getByTestId('session-detail-card');
      const firstCard = sessionCards.first();
      await expect(firstCard.getByText(newerRunningSession.name)).toBeVisible();
    });
  });
});
