import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertCircle, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link, MemoryRouter } from 'react-router-dom';
import remarkGfm from 'remark-gfm';
import { expect, within } from 'storybook/test';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot';
import type { JournalEntry, StoryDetail as StoryDetailType, Task } from '@/types/dashboard';
import {
  ContentSkeleton,
  HeaderSkeleton,
  JournalEntryItem,
  StatusBadge,
  StoryDetail,
  TaskItem,
  TaskStatusIcon,
} from './StoryDetail';

// ============================================================================
// HeaderSkeleton Stories
// ============================================================================

/**
 * Skeleton loading component that displays an animated placeholder
 * for the story header while data is being fetched.
 */
const headerSkeletonMeta: Meta<typeof HeaderSkeleton> = {
  title: 'Pages/StoryDetail/HeaderSkeleton',
  component: HeaderSkeleton,
  parameters: {
    docs: {
      description: {
        component:
          'Animated loading placeholder for the story header area. Shows placeholders for title, status badge, and task progress.',
      },
    },
  },
};

export default headerSkeletonMeta;
type HeaderSkeletonStory = StoryObj<typeof HeaderSkeleton>;

/**
 * Default header skeleton showing the animated loading state.
 */
export const Skeleton: HeaderSkeletonStory = {
  play: async ({ canvasElement }) => {
    // Verify animate-pulse class for loading animation
    const pulseContainer = canvasElement.querySelector('.animate-pulse');
    await expect(pulseContainer).toBeInTheDocument();
    // Verify bg-bg-light placeholder elements
    const placeholders = canvasElement.querySelectorAll('.bg-bg-light');
    await expect(placeholders.length).toBeGreaterThanOrEqual(3);
  },
};

// ============================================================================
// ContentSkeleton Stories
// ============================================================================

/**
 * Skeleton loading component for content sections (tasks, story content, journal).
 */
export const contentSkeletonMeta: Meta<typeof ContentSkeleton> = {
  title: 'Pages/StoryDetail/ContentSkeleton',
  component: ContentSkeleton,
  parameters: {
    docs: {
      description: {
        component:
          'Animated loading placeholder for content sections. Displays during data fetch for tasks or story content.',
      },
    },
  },
};

type ContentSkeletonStory = StoryObj<typeof ContentSkeleton>;

/**
 * Default content skeleton showing the animated loading state.
 */
export const ContentLoading: ContentSkeletonStory = {
  render: () => <ContentSkeleton />,
  play: async ({ canvasElement }) => {
    // Verify animate-pulse class for loading animation
    const pulseContainer = canvasElement.querySelector('.animate-pulse');
    await expect(pulseContainer).toBeInTheDocument();
    // Verify bg-bg-light placeholder elements
    const placeholders = canvasElement.querySelectorAll('.bg-bg-light');
    await expect(placeholders.length).toBeGreaterThanOrEqual(3);
  },
};

/**
 * Multiple content skeletons stacked, simulating loading state for multiple sections.
 */
export const ContentLoadingStacked: ContentSkeletonStory = {
  render: () => (
    <div className="space-y-6">
      <ContentSkeleton />
      <ContentSkeleton />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Verify two stacked content skeletons
    const pulseContainers = canvasElement.querySelectorAll('.animate-pulse');
    await expect(pulseContainers.length).toBe(2);
    // Verify space-y-6 container
    const container = canvasElement.querySelector('.space-y-6');
    await expect(container).toBeInTheDocument();
  },
};

// ============================================================================
// TaskStatusIcon Stories
// ============================================================================

/**
 * Task status icon showing visual state of task completion.
 */
export const taskStatusIconMeta: Meta<typeof TaskStatusIcon> = {
  title: 'Pages/StoryDetail/TaskStatusIcon',
  component: TaskStatusIcon,
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'in_progress', 'completed'],
      description: 'The task status determining icon appearance',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Visual icon indicating task status. Muted circle for pending, blue filled circle for in_progress, green checkmark for completed.',
      },
    },
  },
};

type TaskStatusIconStory = StoryObj<typeof TaskStatusIcon>;

/**
 * Pending status - muted circle icon for tasks not yet started.
 */
export const IconPending: TaskStatusIconStory = {
  render: () => (
    <div className="flex items-center gap-2">
      <TaskStatusIcon status="pending" />
      <span className="text-text-muted">Pending task</span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify pending text is displayed
    await expect(canvas.getByText('Pending task')).toBeInTheDocument();
    // Verify circle icon with text-muted color
    const icon = canvasElement.querySelector(
      'svg[class*="circle"]:not([class*="check"]):not([class*="alert"])',
    );
    await expect(icon).toBeInTheDocument();
    await expect(icon).toHaveClass('text-text-muted');
  },
};

/**
 * In Progress status - primary blue filled circle for active tasks.
 */
export const IconInProgress: TaskStatusIconStory = {
  render: () => (
    <div className="flex items-center gap-2">
      <TaskStatusIcon status="in_progress" />
      <span className="text-primary">In progress task</span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify in progress text is displayed
    await expect(canvas.getByText('In progress task')).toBeInTheDocument();
    // Verify circle icon with primary color and fill
    const icon = canvasElement.querySelector(
      'svg[class*="circle"]:not([class*="check"]):not([class*="alert"])',
    );
    await expect(icon).toBeInTheDocument();
    await expect(icon).toHaveClass('text-primary');
    await expect(icon).toHaveClass('fill-primary/20');
  },
};

/**
 * Completed status - success green checkmark for finished tasks.
 */
export const IconCompleted: TaskStatusIconStory = {
  render: () => (
    <div className="flex items-center gap-2">
      <TaskStatusIcon status="completed" />
      <span className="text-success">Completed task</span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify completed text is displayed
    await expect(canvas.getByText('Completed task')).toBeInTheDocument();
    // Verify check-circle icon with success color
    const icon = canvasElement.querySelector('svg[class*="check"][class*="circle"]');
    await expect(icon).toBeInTheDocument();
    await expect(icon).toHaveClass('text-success');
  },
};

/**
 * All task status icons displayed together for comparison.
 */
export const AllTaskIcons: TaskStatusIconStory = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TaskStatusIcon status="pending" />
        <span className="text-text-muted">Pending</span>
      </div>
      <div className="flex items-center gap-2">
        <TaskStatusIcon status="in_progress" />
        <span className="text-primary">In Progress</span>
      </div>
      <div className="flex items-center gap-2">
        <TaskStatusIcon status="completed" />
        <span className="text-success">Completed</span>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify all three status labels are present
    await expect(canvas.getByText('Pending')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    await expect(canvas.getByText('Completed')).toBeInTheDocument();
    // Verify icons are present (2 circles + 1 check-circle)
    const circleIcons = canvasElement.querySelectorAll(
      'svg[class*="circle"]:not([class*="check"]):not([class*="alert"])',
    );
    await expect(circleIcons.length).toBe(2);
    const checkIcon = canvasElement.querySelector('svg[class*="check"][class*="circle"]');
    await expect(checkIcon).toBeInTheDocument();
  },
};

// ============================================================================
// TaskItem Stories
// ============================================================================

/**
 * Single task item component showing task title and status.
 */
export const taskItemMeta: Meta<typeof TaskItem> = {
  title: 'Pages/StoryDetail/TaskItem',
  component: TaskItem,
  parameters: {
    docs: {
      description: {
        component:
          'Task row component displaying task title with status icon and badge. Shows strikethrough text for completed tasks.',
      },
    },
  },
};

type TaskItemStory = StoryObj<typeof TaskItem>;

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Write unit tests for API endpoints',
  status: 'pending',
  ...overrides,
});

/**
 * Pending task - not yet started.
 */
export const TaskPending: TaskItemStory = {
  render: () => <TaskItem task={createTask({ status: 'pending' })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify task title
    await expect(canvas.getByText('Write unit tests for API endpoints')).toBeInTheDocument();
    // Verify pending status badge
    const badge = canvas.getByText('pending');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-text-muted/20');
    // Verify pending icon (circle)
    const icon = canvasElement.querySelector(
      'svg[class*="circle"]:not([class*="check"]):not([class*="alert"])',
    );
    await expect(icon).toBeInTheDocument();
  },
};

/**
 * In progress task - currently being worked on.
 */
export const TaskInProgress: TaskItemStory = {
  render: () => (
    <TaskItem
      task={createTask({
        title: 'Implement authentication flow',
        status: 'in_progress',
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify task title
    await expect(canvas.getByText('Implement authentication flow')).toBeInTheDocument();
    // Verify in_progress status badge
    const badge = canvas.getByText('in progress');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-primary/20');
    // Verify in_progress icon (circle with fill)
    const icon = canvasElement.querySelector(
      'svg[class*="circle"]:not([class*="check"]):not([class*="alert"])',
    );
    await expect(icon).toBeInTheDocument();
    await expect(icon).toHaveClass('text-primary');
  },
};

/**
 * Completed task - shows strikethrough text.
 */
export const TaskCompleted: TaskItemStory = {
  render: () => (
    <TaskItem
      task={createTask({
        title: 'Setup project structure',
        status: 'completed',
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify task title with strikethrough styling
    const titleElement = canvas.getByText('Setup project structure');
    await expect(titleElement).toBeInTheDocument();
    await expect(titleElement).toHaveClass('line-through');
    await expect(titleElement).toHaveClass('text-text-muted');
    // Verify completed status badge
    const badge = canvas.getByText('completed');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-success/20');
    // Verify completed icon (check-circle)
    const icon = canvasElement.querySelector('svg[class*="check"][class*="circle"]');
    await expect(icon).toBeInTheDocument();
    await expect(icon).toHaveClass('text-success');
  },
};

/**
 * Task with long title demonstrating text handling.
 */
export const TaskLongTitle: TaskItemStory = {
  render: () => (
    <TaskItem
      task={createTask({
        title:
          'This is a very long task title that demonstrates how text wrapping works in the task item component when the content exceeds normal length',
        status: 'in_progress',
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify long task title is displayed
    await expect(
      canvas.getByText(
        'This is a very long task title that demonstrates how text wrapping works in the task item component when the content exceeds normal length',
      ),
    ).toBeInTheDocument();
    // Verify status badge
    await expect(canvas.getByText('in progress')).toBeInTheDocument();
  },
};

/**
 * Multiple tasks showing all status types.
 */
export const AllTaskStatuses: TaskItemStory = {
  render: () => (
    <div className="divide-y divide-border-muted">
      <TaskItem
        task={createTask({
          id: 't1',
          title: 'Setup project structure',
          status: 'completed',
        })}
      />
      <TaskItem
        task={createTask({
          id: 't2',
          title: 'Implement core functionality',
          status: 'in_progress',
        })}
      />
      <TaskItem
        task={createTask({
          id: 't3',
          title: 'Write documentation',
          status: 'pending',
        })}
      />
      <TaskItem
        task={createTask({
          id: 't4',
          title: 'Add integration tests',
          status: 'pending',
        })}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify all task titles
    await expect(canvas.getByText('Setup project structure')).toBeInTheDocument();
    await expect(canvas.getByText('Implement core functionality')).toBeInTheDocument();
    await expect(canvas.getByText('Write documentation')).toBeInTheDocument();
    await expect(canvas.getByText('Add integration tests')).toBeInTheDocument();
    // Verify all status badges (1 completed, 1 in_progress, 2 pending)
    await expect(canvas.getByText('completed')).toBeInTheDocument();
    await expect(canvas.getByText('in progress')).toBeInTheDocument();
    const pendingBadges = canvas.getAllByText('pending');
    await expect(pendingBadges.length).toBe(2);
    // Verify icons (1 check-circle, 3 circles)
    const checkIcons = canvasElement.querySelectorAll('svg[class*="check"][class*="circle"]');
    await expect(checkIcons.length).toBe(1);
    const circleIcons = canvasElement.querySelectorAll(
      'svg[class*="circle"]:not([class*="check"]):not([class*="alert"])',
    );
    await expect(circleIcons.length).toBe(3);
  },
};

// ============================================================================
// JournalEntryItem Stories
// ============================================================================

/**
 * Collapsible journal entry component for session logs, blockers, and resolutions.
 */
export const journalEntryMeta: Meta<typeof JournalEntryItem> = {
  title: 'Pages/StoryDetail/JournalEntryItem',
  component: JournalEntryItem,
  parameters: {
    docs: {
      description: {
        component:
          'Collapsible card showing journal entries. Color-coded: neutral for sessions, red for blockers, green for resolutions.',
      },
    },
  },
};

type JournalEntryStory = StoryObj<typeof JournalEntryItem>;

const createJournalEntry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  type: 'session',
  title: 'Session: 2026-01-28 01:00 UTC',
  content: `### Task: t1 - Setup project structure

**What was done:**
- Initialized the repository
- Added dependencies to package.json
- Created folder structure

**Decisions:**
- Used Vite for faster development builds
- Chose vitest for testing (better ESM support)

**Next steps:**
- t2: Implement core functionality`,
  timestamp: '2026-01-28 01:00 UTC',
  ...overrides,
});

/**
 * Session entry - neutral color, collapsed by default.
 */
export const EntrySession: JournalEntryStory = {
  render: () => <JournalEntryItem entry={createJournalEntry()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify entry title
    await expect(canvas.getByText('Session: 2026-01-28 01:00 UTC')).toBeInTheDocument();
    // Verify session type badge
    const badge = canvas.getByText('session');
    await expect(badge).toBeInTheDocument();
    // Verify collapsed state (chevron-right visible, content hidden)
    const chevronRight = canvasElement.querySelector('svg[class*="chevron-right"]');
    await expect(chevronRight).toBeInTheDocument();
    // Verify bg-bg-light neutral styling for session type
    const card = canvasElement.querySelector('.bg-bg-light');
    await expect(card).toBeInTheDocument();
  },
};

/**
 * Session entry - expanded to show content.
 */
export const EntrySessionExpanded: JournalEntryStory = {
  render: () => <JournalEntryItem entry={createJournalEntry()} defaultOpen={true} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify entry title
    await expect(canvas.getByText('Session: 2026-01-28 01:00 UTC')).toBeInTheDocument();
    // Verify expanded state (chevron-down visible)
    const chevronDown = canvasElement.querySelector('svg[class*="chevron-down"]');
    await expect(chevronDown).toBeInTheDocument();
    // Verify content is visible (check for specific text from content)
    await expect(canvas.getByText(/What was done:/)).toBeInTheDocument();
    await expect(canvas.getByText(/Used Vite for faster development builds/)).toBeInTheDocument();
  },
};

/**
 * Blocker entry - red color, indicates impediment.
 */
export const EntryBlocker: JournalEntryStory = {
  render: () => (
    <JournalEntryItem
      entry={createJournalEntry({
        type: 'blocker',
        title: 'Blocked: Missing API credentials',
        content: `## Blocker: Cannot access external API

**Task**: t2 - Implement API integration
**What I'm trying to do**: Connect to the external data API
**What I tried**:
- Checked environment variables
- Looked for credentials in secrets

**What I need**: API credentials from the team lead
**Suggested options**:
1. Wait for credentials (recommended)
2. Mock the API for now`,
      })}
      defaultOpen={true}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify blocker title
    await expect(canvas.getByText('Blocked: Missing API credentials')).toBeInTheDocument();
    // Verify blocker type badge with danger styling
    const badge = canvas.getByText('blocker');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('text-danger');
    // Verify alert icon for blocker
    const alertIcon = canvasElement.querySelector('svg[class*="alert"][class*="circle"]');
    await expect(alertIcon).toBeInTheDocument();
    // Verify blocker content is visible
    await expect(canvas.getByText(/Cannot access external API/)).toBeInTheDocument();
    await expect(canvas.getByText(/What I need/)).toBeInTheDocument();
    // Verify bg-danger/10 styling for blocker type
    const card = canvasElement.querySelector('[class*="bg-danger"]');
    await expect(card).toBeInTheDocument();
  },
};

/**
 * Resolution entry - green color, shows how a blocker was resolved.
 */
export const EntryResolution: JournalEntryStory = {
  render: () => (
    <JournalEntryItem
      entry={createJournalEntry({
        type: 'resolution',
        title: 'Resolution: API credentials received',
        content: `## Resolution

**Blocker resolved**: API credentials obtained from team lead

**Action taken**:
- Added credentials to .env file
- Verified API connection works
- Continuing with t2 implementation`,
      })}
      defaultOpen={true}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify resolution title
    await expect(canvas.getByText('Resolution: API credentials received')).toBeInTheDocument();
    // Verify resolution type badge with success styling
    const badge = canvas.getByText('resolution');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('text-success');
    // Verify resolution content is visible
    await expect(canvas.getByText(/Blocker resolved/)).toBeInTheDocument();
    await expect(canvas.getByText(/Action taken/)).toBeInTheDocument();
    // Verify bg-success/10 styling for resolution type
    const card = canvasElement.querySelector('[class*="bg-success"]');
    await expect(card).toBeInTheDocument();
  },
};

/**
 * All journal entry types displayed together.
 */
export const AllEntryTypes: JournalEntryStory = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Blockers (1)
        </h3>
        <JournalEntryItem
          entry={createJournalEntry({
            type: 'blocker',
            title: 'Blocked: Database schema unclear',
            content: 'Need clarification on the data model before proceeding.',
          })}
          defaultOpen={true}
        />
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-success flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Resolutions (1)
        </h3>
        <JournalEntryItem
          entry={createJournalEntry({
            type: 'resolution',
            title: 'Resolution: Schema finalized',
            content: 'Team agreed on schema. Using normalized approach.',
          })}
        />
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">Sessions (2)</h3>
        <JournalEntryItem
          entry={createJournalEntry({
            title: 'Session: 2026-01-28 09:00 UTC',
            content: 'Completed initial setup tasks.',
            timestamp: '2026-01-28 09:00 UTC',
          })}
        />
        <JournalEntryItem
          entry={createJournalEntry({
            title: 'Session: 2026-01-27 14:00 UTC',
            content: 'Started project, created repository.',
            timestamp: '2026-01-27 14:00 UTC',
          })}
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify section headers
    await expect(canvas.getByText('Blockers (1)')).toBeInTheDocument();
    await expect(canvas.getByText('Resolutions (1)')).toBeInTheDocument();
    await expect(canvas.getByText('Sessions (2)')).toBeInTheDocument();
    // Verify blocker entry
    await expect(canvas.getByText('Blocked: Database schema unclear')).toBeInTheDocument();
    await expect(canvas.getByText('blocker')).toBeInTheDocument();
    // Verify resolution entry
    await expect(canvas.getByText('Resolution: Schema finalized')).toBeInTheDocument();
    await expect(canvas.getByText('resolution')).toBeInTheDocument();
    // Verify session entries
    await expect(canvas.getByText('Session: 2026-01-28 09:00 UTC')).toBeInTheDocument();
    await expect(canvas.getByText('Session: 2026-01-27 14:00 UTC')).toBeInTheDocument();
    const sessionBadges = canvas.getAllByText('session');
    await expect(sessionBadges.length).toBe(2);
  },
};

// ============================================================================
// StatusBadge Stories (StoryDetail variant)
// ============================================================================

/**
 * Status badge component for story status (same as EpicDetail variant).
 */
export const statusBadgeMeta: Meta<typeof StatusBadge> = {
  title: 'Pages/StoryDetail/StatusBadge',
  component: StatusBadge,
  argTypes: {
    status: {
      control: 'select',
      options: ['ready', 'in_progress', 'blocked', 'completed'],
      description: 'The status type determining badge color and label',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status badge showing story status. Gray for ready, blue for in_progress, red for blocked, green for completed.',
      },
    },
  },
};

type StatusBadgeStory = StoryObj<typeof StatusBadge>;

/**
 * Ready status - gray badge.
 */
export const BadgeReady: StatusBadgeStory = {
  render: () => <StatusBadge status="ready" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Ready');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-text-muted/20');
    await expect(badge).toHaveClass('text-text-muted');
  },
};

/**
 * In Progress status - primary blue badge.
 */
export const BadgeInProgress: StatusBadgeStory = {
  render: () => <StatusBadge status="in_progress" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('In Progress');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-primary/20');
    await expect(badge).toHaveClass('text-primary');
  },
};

/**
 * Blocked status - danger red badge.
 */
export const BadgeBlocked: StatusBadgeStory = {
  render: () => <StatusBadge status="blocked" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Blocked');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-danger/20');
    await expect(badge).toHaveClass('text-danger');
  },
};

/**
 * Completed status - success green badge.
 */
export const BadgeCompleted: StatusBadgeStory = {
  render: () => <StatusBadge status="completed" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Completed');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-success/20');
    await expect(badge).toHaveClass('text-success');
  },
};

/**
 * All status badges together.
 */
export const AllBadges: StatusBadgeStory = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="ready" />
      <StatusBadge status="in_progress" />
      <StatusBadge status="blocked" />
      <StatusBadge status="completed" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify all four status badges are present
    await expect(canvas.getByText('Ready')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked')).toBeInTheDocument();
    await expect(canvas.getByText('Completed')).toBeInTheDocument();
  },
};

// ============================================================================
// StoryDetail Composite Stories
// ============================================================================

/**
 * Full StoryDetail page component showing story tasks and journal.
 */
export const storyDetailMeta: Meta<typeof StoryDetail> = {
  title: 'Pages/StoryDetail',
  component: StoryDetail,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Main page component displaying story details with tasks and journal entries. Shows loading skeletons, 404/error states, and tabs for Tasks, Story Content, and Journal.',
      },
    },
  },
};

type StoryDetailStory = StoryObj<typeof StoryDetail>;

/**
 * Loading state showing header and content skeletons.
 */
export const Loading: StoryDetailStory = {
  render: () => (
    <div className="space-y-6">
      <HeaderSkeleton />
      <ContentSkeleton />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Verify header and content skeletons are present
    const skeletons = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletons.length).toBe(2); // 1 header + 1 content
    // Verify bg-bg-light placeholder elements
    const placeholders = canvasElement.querySelectorAll('.bg-bg-light');
    await expect(placeholders.length).toBeGreaterThanOrEqual(5);

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'story-detail-loading');
  },
};

/**
 * 404 state when story is not found.
 */
export const NotFound: StoryDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-text mb-2">Story not found</h1>
        <p className="text-text-muted mb-4">
          The story &quot;non-existent-story&quot; does not exist in epic
          &quot;dashboard-restructure&quot;.
        </p>
        <Link to="/epic/dashboard-restructure" className="text-primary hover:underline">
          ← Back to epic
        </Link>
      </div>
    </MemoryRouter>
  ),
  // Enable a11y tests for back link
  parameters: {
    a11y: {
      test: 'error',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify error title
    await expect(canvas.getByText('Story not found')).toBeInTheDocument();
    // Verify error message with story and epic names
    await expect(
      canvas.getByText(/The story "non-existent-story" does not exist/),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/dashboard-restructure/)).toBeInTheDocument();
    // Verify back link
    const backLink = canvas.getByRole('link', { name: /back to epic/i });
    await expect(backLink).toBeInTheDocument();
    await expect(backLink).toHaveAttribute('href', '/epic/dashboard-restructure');

    // Accessibility: Verify back link has accessible name
    await expect(backLink).toHaveAccessibleName();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'story-detail-not-found');
  },
};

/**
 * Error state when fetching fails.
 */
export const ErrorState: StoryDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-danger mb-2">Error</h1>
        <p className="text-text-muted mb-4">Failed to load story</p>
        <Link to="/epic/dashboard-restructure" className="text-primary hover:underline">
          ← Back to epic
        </Link>
      </div>
    </MemoryRouter>
  ),
  // Enable a11y tests for back link
  parameters: {
    a11y: {
      test: 'error',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify error heading with danger styling
    const errorHeading = canvas.getByText('Error');
    await expect(errorHeading).toBeInTheDocument();
    await expect(errorHeading).toHaveClass('text-danger');
    // Verify error message
    await expect(canvas.getByText('Failed to load story')).toBeInTheDocument();
    // Verify back link
    const backLink = canvas.getByRole('link', { name: /back to epic/i });
    await expect(backLink).toBeInTheDocument();
    await expect(backLink).toHaveAttribute('href', '/epic/dashboard-restructure');

    // Accessibility: Verify back link has accessible name
    await expect(backLink).toHaveAccessibleName();
  },
};

const sampleStory: StoryDetailType = {
  slug: 'storybook-setup-component-stories',
  title: 'Storybook Setup and Component Stories',
  status: 'in_progress',
  epicSlug: 'dashboard-restructure',
  tasks: [
    { id: 't1', title: 'Install and configure Storybook 10.x', status: 'completed' },
    { id: 't2', title: 'Configure Tailwind CSS and theme integration', status: 'completed' },
    { id: 't3', title: 'Create stories for Layout component', status: 'completed' },
    { id: 't4', title: 'Create stories for Breadcrumb component', status: 'completed' },
    { id: 't5', title: 'Create stories for EpicList page', status: 'completed' },
    { id: 't6', title: 'Create stories for EpicDetail page', status: 'completed' },
    { id: 't7', title: 'Create stories for StoryDetail page', status: 'in_progress' },
    { id: 't8', title: 'Create stories for status badges', status: 'pending' },
    { id: 't9', title: 'Add Storybook scripts and verify build', status: 'pending' },
  ],
  journal: [
    {
      type: 'session',
      title: 'Session: 2026-01-28 01:36 UTC',
      content: `### Task: t1 - Install and configure Storybook 10.x

**What was done:**
- Ran npx storybook@10 init from the client directory
- Storybook 10.2.1 was installed with React+Vite framework detection
- Created .storybook/main.ts and .storybook/preview.ts
- Verified Storybook dev server starts without errors`,
      timestamp: '2026-01-28 01:36 UTC',
    },
    {
      type: 'session',
      title: 'Session: 2026-01-28 01:43 UTC',
      content: `### Task: t2 - Configure Tailwind CSS and theme integration

**What was done:**
- Imported global CSS file for Tailwind styles
- Added dark theme decorator
- Created ThemeTest.stories.tsx for verification`,
      timestamp: '2026-01-28 01:43 UTC',
    },
  ],
  content: `## Context

The SAGA Dashboard needs Storybook for component development and documentation.

## Acceptance Criteria

- Storybook 10.x is installed and configured
- Stories exist for all custom SAGA components
- pnpm storybook starts without errors`,
};

/**
 * Populated story with tasks and journal (Tasks tab active).
 */
export const Populated: StoryDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="space-y-6">
        {/* Story header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Link to="/epic/dashboard-restructure" className="hover:text-primary">
              dashboard-restructure
            </Link>
            <span>/</span>
            <span className="text-text">storybook-setup-component-stories</span>
          </div>
          <h1 className="text-2xl font-bold text-text">{sampleStory.title}</h1>
          <div className="flex items-center gap-4">
            <StatusBadge status={sampleStory.status} />
            <span className="text-sm text-text-muted">
              {sampleStory.tasks.filter((t) => t.status === 'completed').length}/
              {sampleStory.tasks.length} tasks completed
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border-muted">
                  {sampleStory.tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
  // Enable a11y tests for interactive elements (tabs, links)
  parameters: {
    a11y: {
      test: 'error',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story header - epic link and story slug
    const epicLink = canvas.getByRole('link', { name: 'dashboard-restructure' });
    await expect(epicLink).toBeInTheDocument();
    await expect(epicLink).toHaveAttribute('href', '/epic/dashboard-restructure');
    await expect(canvas.getByText('storybook-setup-component-stories')).toBeInTheDocument();
    // Verify story title
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();
    // Verify status badge
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    // Verify task progress
    await expect(canvas.getByText('6/9 tasks completed')).toBeInTheDocument();
    // Verify tabs are present
    await expect(canvas.getByRole('tab', { name: 'Tasks' })).toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'Story Content' })).toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'Journal' })).toBeInTheDocument();
    // Verify tasks card title
    await expect(canvas.getByText('Tasks', { selector: '.text-lg' })).toBeInTheDocument();
    // Verify some task items are rendered
    await expect(canvas.getByText('Install and configure Storybook 10.x')).toBeInTheDocument();
    await expect(canvas.getByText('Create stories for StoryDetail page')).toBeInTheDocument();

    // Accessibility: Verify epic link has accessible name
    await expect(epicLink).toHaveAccessibleName();
    // Verify tablist has proper ARIA role
    const tabList = canvasElement.querySelector('[role="tablist"]');
    await expect(tabList).toBeInTheDocument();
    // Verify all tabs have accessible names
    const tabs = canvas.getAllByRole('tab');
    for (const tab of tabs) {
      await expect(tab).toHaveAccessibleName();
    }

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'story-detail-populated');
  },
};

/**
 * Story with no tasks defined.
 */
export const EmptyTasks: StoryDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Link to="/epic/dashboard-restructure" className="hover:text-primary">
              dashboard-restructure
            </Link>
            <span>/</span>
            <span className="text-text">new-story</span>
          </div>
          <h1 className="text-2xl font-bold text-text">New Story</h1>
          <div className="flex items-center gap-4">
            <StatusBadge status="ready" />
            <span className="text-sm text-text-muted">0/0 tasks completed</span>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-muted text-center py-4">No tasks defined for this story.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('New Story')).toBeInTheDocument();
    // Verify Ready status badge
    const badge = canvas.getByText('Ready');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-text-muted/20');
    // Verify 0/0 tasks progress
    await expect(canvas.getByText('0/0 tasks completed')).toBeInTheDocument();
    // Verify empty tasks message
    await expect(canvas.getByText('No tasks defined for this story.')).toBeInTheDocument();
  },
};

const blockerEntry: JournalEntry = {
  type: 'blocker',
  title: 'Blocked: Missing API credentials',
  content: `## Blocker: Cannot access external API

**Task**: t2 - Implement endpoints
**What I'm trying to do**: Connect to the external authentication service
**What I tried**:
- Checked environment variables
- Looked for credentials in vault

**What I need**: API credentials from the security team
**Suggested options**:
1. Wait for credentials from security team
2. Use mock service for development`,
  timestamp: '2026-01-28 10:00 UTC',
};

const sessionEntry: JournalEntry = {
  type: 'session',
  title: 'Session: 2026-01-28 09:00 UTC',
  content: `### Task: t1 - Define API schema

**What was done:**
- Created OpenAPI specification
- Reviewed with team

**Decisions:**
- Using RESTful design
- JWT for authentication`,
  timestamp: '2026-01-28 09:00 UTC',
};

const storyWithBlocker: StoryDetailType = {
  slug: 'api-integration',
  title: 'API Integration',
  status: 'blocked',
  epicSlug: 'dashboard-restructure',
  tasks: [
    { id: 't1', title: 'Define API schema', status: 'completed' },
    { id: 't2', title: 'Implement endpoints', status: 'in_progress' },
    { id: 't3', title: 'Add authentication', status: 'pending' },
    { id: 't4', title: 'Write integration tests', status: 'pending' },
  ],
  journal: [blockerEntry, sessionEntry],
};

/**
 * Story with a blocker - Journal tab shows blocker prominently.
 */
export const WithBlocker: StoryDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Link to="/epic/dashboard-restructure" className="hover:text-primary">
              dashboard-restructure
            </Link>
            <span>/</span>
            <span className="text-text">api-integration</span>
          </div>
          <h1 className="text-2xl font-bold text-text">{storyWithBlocker.title}</h1>
          <div className="flex items-center gap-4">
            <StatusBadge status={storyWithBlocker.status} />
            <span className="text-sm text-text-muted">
              {storyWithBlocker.tasks.filter((t) => t.status === 'completed').length}/
              {storyWithBlocker.tasks.length} tasks completed
            </span>
          </div>
        </div>

        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">
              Journal
              <Badge className="ml-2 bg-danger/20 text-danger text-xs">1</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journal">
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Blockers (1)
                </h3>
                <JournalEntryItem entry={blockerEntry} defaultOpen={true} />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text">Sessions (1)</h3>
                <JournalEntryItem entry={sessionEntry} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();
    // Verify Blocked status badge
    const badge = canvas.getByText('Blocked');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-danger/20');
    // Verify task progress
    await expect(canvas.getByText('1/4 tasks completed')).toBeInTheDocument();
    // Verify Journal tab has blocker count badge
    const journalTabBadge = canvasElement.querySelector('[data-state="active"] .bg-danger\\/20');
    await expect(journalTabBadge).toBeInTheDocument();
    // Verify Blockers section header
    await expect(canvas.getByText('Blockers (1)')).toBeInTheDocument();
    // Verify blocker entry is displayed
    await expect(canvas.getByText('Blocked: Missing API credentials')).toBeInTheDocument();
    // Verify Sessions section header
    await expect(canvas.getByText('Sessions (1)')).toBeInTheDocument();
    // Verify session entry title
    await expect(canvas.getByText('Session: 2026-01-28 09:00 UTC')).toBeInTheDocument();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'story-detail-with-blocker');
  },
};

const completedStory: StoryDetailType = {
  slug: 'setup-project',
  title: 'Setup Project Structure',
  status: 'completed',
  epicSlug: 'dashboard-restructure',
  tasks: [
    { id: 't1', title: 'Initialize repository', status: 'completed' },
    { id: 't2', title: 'Configure build tools', status: 'completed' },
    { id: 't3', title: 'Setup linting and formatting', status: 'completed' },
    { id: 't4', title: 'Add CI pipeline', status: 'completed' },
  ],
  journal: [
    {
      type: 'session',
      title: 'Session: 2026-01-25 14:00 UTC',
      content: `### Task: t3, t4 - Setup linting and CI

**What was done:**
- Configured ESLint and Prettier
- Added GitHub Actions workflow
- All checks passing

**Story completed!**`,
      timestamp: '2026-01-25 14:00 UTC',
    },
    {
      type: 'session',
      title: 'Session: 2026-01-25 10:00 UTC',
      content: `### Task: t1, t2 - Initialize and configure

**What was done:**
- Created repository
- Added Vite and TypeScript config
- Setup project structure`,
      timestamp: '2026-01-25 10:00 UTC',
    },
  ],
};

/**
 * Completed story - all tasks done.
 */
export const Completed: StoryDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Link to="/epic/dashboard-restructure" className="hover:text-primary">
              dashboard-restructure
            </Link>
            <span>/</span>
            <span className="text-text">setup-project</span>
          </div>
          <h1 className="text-2xl font-bold text-text">{completedStory.title}</h1>
          <div className="flex items-center gap-4">
            <StatusBadge status={completedStory.status} />
            <span className="text-sm text-text-muted">
              {completedStory.tasks.length}/{completedStory.tasks.length} tasks completed
            </span>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border-muted">
                  {completedStory.tasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('Setup Project Structure')).toBeInTheDocument();
    // Verify Completed status badge
    const badge = canvas.getByText('Completed');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-success/20');
    // Verify task progress (all completed)
    await expect(canvas.getByText('4/4 tasks completed')).toBeInTheDocument();
    // Verify all tasks are rendered with completed status
    await expect(canvas.getByText('Initialize repository')).toBeInTheDocument();
    await expect(canvas.getByText('Configure build tools')).toBeInTheDocument();
    await expect(canvas.getByText('Setup linting and formatting')).toBeInTheDocument();
    await expect(canvas.getByText('Add CI pipeline')).toBeInTheDocument();
    // Verify all task badges show "completed"
    const completedBadges = canvas.getAllByText('completed');
    await expect(completedBadges.length).toBe(4);
    // Verify all tasks have check-circle icons
    const checkIcons = canvasElement.querySelectorAll('svg[class*="check"][class*="circle"]');
    await expect(checkIcons.length).toBe(4);
  },
};

/**
 * Story showing the Story Content tab with markdown content.
 */
export const WithContent: StoryDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Link to="/epic/dashboard-restructure" className="hover:text-primary">
              dashboard-restructure
            </Link>
            <span>/</span>
            <span className="text-text">storybook-setup-component-stories</span>
          </div>
          <h1 className="text-2xl font-bold text-text">{sampleStory.title}</h1>
          <div className="flex items-center gap-4">
            <StatusBadge status={sampleStory.status} />
            <span className="text-sm text-text-muted">
              {sampleStory.tasks.filter((t) => t.status === 'completed').length}/
              {sampleStory.tasks.length} tasks completed
            </span>
          </div>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Story Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm prose-invert max-w-none prose-headings:text-text prose-p:text-text-muted prose-strong:text-text prose-code:text-primary prose-code:bg-bg-dark prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-bg-dark prose-pre:border prose-pre:border-border-muted prose-a:text-primary prose-a:no-underline prose-a:hover:underline prose-li:text-text-muted prose-table:border prose-table:border-border-muted prose-th:bg-bg-dark prose-th:px-3 prose-th:py-2 prose-th:text-text prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border-muted">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{sampleStory.content}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();
    // Verify Story Content tab is active
    const contentTab = canvas.getByRole('tab', { name: 'Story Content' });
    await expect(contentTab).toBeInTheDocument();
    // Verify Story Content card title
    await expect(canvas.getByText('Story Content', { selector: '.text-lg' })).toBeInTheDocument();
    // Verify markdown content is rendered (check for headings and text)
    await expect(canvas.getByRole('heading', { name: 'Context' })).toBeInTheDocument();
    await expect(canvas.getByText(/The SAGA Dashboard needs Storybook/)).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Acceptance Criteria' })).toBeInTheDocument();
    // Verify prose container is present
    const proseContainer = canvasElement.querySelector('.prose');
    await expect(proseContainer).toBeInTheDocument();
  },
};

/**
 * Story with empty journal - no entries yet.
 */
export const EmptyJournal: StoryDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Link to="/epic/dashboard-restructure" className="hover:text-primary">
              dashboard-restructure
            </Link>
            <span>/</span>
            <span className="text-text">new-story</span>
          </div>
          <h1 className="text-2xl font-bold text-text">New Story</h1>
          <div className="flex items-center gap-4">
            <StatusBadge status="ready" />
            <span className="text-sm text-text-muted">0/3 tasks completed</span>
          </div>
        </div>

        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
          </TabsList>

          <TabsContent value="journal">
            <Card>
              <CardContent className="py-8">
                <p className="text-text-muted text-center">No journal entries yet.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('New Story')).toBeInTheDocument();
    // Verify Ready status badge
    await expect(canvas.getByText('Ready')).toBeInTheDocument();
    // Verify task progress
    await expect(canvas.getByText('0/3 tasks completed')).toBeInTheDocument();
    // Verify Journal tab is active (defaultValue="journal")
    const journalTab = canvas.getByRole('tab', { name: 'Journal' });
    await expect(journalTab).toBeInTheDocument();
    // Verify empty journal message
    await expect(canvas.getByText('No journal entries yet.')).toBeInTheDocument();
  },
};
