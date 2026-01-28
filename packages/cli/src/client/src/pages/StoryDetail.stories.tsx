import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, AlertCircle } from 'lucide-react'
import {
  StoryDetail,
  HeaderSkeleton,
  ContentSkeleton,
  StatusBadge,
  TaskStatusIcon,
  TaskItem,
  JournalEntryItem,
} from './StoryDetail'
import type {
  StoryDetail as StoryDetailType,
  Task,
  JournalEntry,
  TaskStatus,
} from '@/types/dashboard'

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
}

export default headerSkeletonMeta
type HeaderSkeletonStory = StoryObj<typeof HeaderSkeleton>

/**
 * Default header skeleton showing the animated loading state.
 */
export const Skeleton: HeaderSkeletonStory = {}

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
}

type ContentSkeletonStory = StoryObj<typeof ContentSkeleton>

/**
 * Default content skeleton showing the animated loading state.
 */
export const ContentLoading: ContentSkeletonStory = {
  render: () => <ContentSkeleton />,
}

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
}

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
}

type TaskStatusIconStory = StoryObj<typeof TaskStatusIcon>

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
}

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
}

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
}

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
}

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
}

type TaskItemStory = StoryObj<typeof TaskItem>

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Write unit tests for API endpoints',
  status: 'pending',
  ...overrides,
})

/**
 * Pending task - not yet started.
 */
export const TaskPending: TaskItemStory = {
  render: () => <TaskItem task={createTask({ status: 'pending' })} />,
}

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
}

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
}

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
}

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
}

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
}

type JournalEntryStory = StoryObj<typeof JournalEntryItem>

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
})

/**
 * Session entry - neutral color, collapsed by default.
 */
export const EntrySession: JournalEntryStory = {
  render: () => <JournalEntryItem entry={createJournalEntry()} />,
}

/**
 * Session entry - expanded to show content.
 */
export const EntrySessionExpanded: JournalEntryStory = {
  render: () => <JournalEntryItem entry={createJournalEntry()} defaultOpen={true} />,
}

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
}

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
}

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
}

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
}

type StatusBadgeStory = StoryObj<typeof StatusBadge>

/**
 * Ready status - gray badge.
 */
export const BadgeReady: StatusBadgeStory = {
  render: () => <StatusBadge status="ready" />,
}

/**
 * In Progress status - primary blue badge.
 */
export const BadgeInProgress: StatusBadgeStory = {
  render: () => <StatusBadge status="in_progress" />,
}

/**
 * Blocked status - danger red badge.
 */
export const BadgeBlocked: StatusBadgeStory = {
  render: () => <StatusBadge status="blocked" />,
}

/**
 * Completed status - success green badge.
 */
export const BadgeCompleted: StatusBadgeStory = {
  render: () => <StatusBadge status="completed" />,
}

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
}

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
}

type StoryDetailStory = StoryObj<typeof StoryDetail>

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
}

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
}

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
}

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
}

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
}

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
                <p className="text-text-muted text-center py-4">
                  No tasks defined for this story.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
}

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
  journal: [
    {
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
    },
    {
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
    },
  ],
}

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
                <JournalEntryItem
                  entry={storyWithBlocker.journal.find((e) => e.type === 'blocker')!}
                  defaultOpen={true}
                />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text">Sessions (1)</h3>
                <JournalEntryItem
                  entry={storyWithBlocker.journal.find((e) => e.type === 'session')!}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
}

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
}

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
}

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
                <div className="prose prose-sm prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-text font-mono bg-bg-dark p-4 rounded-md overflow-x-auto">
                    {sampleStory.content}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MemoryRouter>
  ),
}

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
}
