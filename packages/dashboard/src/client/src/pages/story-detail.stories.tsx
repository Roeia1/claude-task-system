import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router';
import remarkGfm from 'remark-gfm';
import { expect, within } from 'storybook/test';
import { SessionDetailCard, SessionsPanelEmpty } from '@/components/SessionsPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageWrapper } from '@/test-utils/storybook-page-wrapper';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';
import type {
  JournalEntry,
  SessionInfo,
  StoryDetail as StoryDetailType,
  Task,
} from '@/types/dashboard';
import {
  ContentSkeleton,
  HeaderSkeleton,
  JournalEntryItem,
  StoryDetail,
  TaskItem,
} from './StoryDetail.tsx';

// ============================================================================
// Constants
// ============================================================================

/** Number of skeletons to render in loading state (header + content) */
const EXPECTED_SKELETON_COUNT = 2;

/** Minimum number of placeholder elements in skeleton */
const MIN_SKELETON_PLACEHOLDER_COUNT = 5;

/** Expected number of completed tasks in Completed story */
const EXPECTED_COMPLETED_TASK_COUNT = 4;

/** Regex pattern for matching "back to epic list" link text (case insensitive) */
const BACK_TO_EPIC_LIST_PATTERN = /back to epic list/i;

// ============================================================================
// Sample Data
// ============================================================================

const sampleStory: StoryDetailType = {
  id: 'storybook-setup-component-stories',
  title: 'Storybook Setup and Component Stories',
  status: 'inProgress',
  epic: 'dashboard-restructure',
  description: `## Context

The SAGA Dashboard needs Storybook for component development and documentation.

## Acceptance Criteria

- Storybook 10.x is installed and configured
- Stories exist for all custom SAGA components
- pnpm storybook starts without errors`,
  tasks: [
    {
      id: 't1',
      subject: 'Install and configure Storybook 10.x',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't2',
      subject: 'Configure Tailwind CSS and theme integration',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't3',
      subject: 'Create stories for Layout component',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't4',
      subject: 'Create stories for Breadcrumb component',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't5',
      subject: 'Create stories for EpicList page',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't6',
      subject: 'Create stories for EpicDetail page',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't7',
      subject: 'Create stories for StoryDetail page',
      description: '',
      status: 'inProgress',
      blockedBy: [],
    },
    {
      id: 't8',
      subject: 'Create stories for status badges',
      description: '',
      status: 'pending',
      blockedBy: [],
    },
    {
      id: 't9',
      subject: 'Add Storybook scripts and verify build',
      description: '',
      status: 'pending',
      blockedBy: [],
    },
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
  id: 'api-integration',
  title: 'API Integration',
  description: '',
  status: 'inProgress',
  epic: 'dashboard-restructure',
  tasks: [
    { id: 't1', subject: 'Define API schema', description: '', status: 'completed', blockedBy: [] },
    {
      id: 't2',
      subject: 'Implement endpoints',
      description: '',
      status: 'inProgress',
      blockedBy: [],
    },
    { id: 't3', subject: 'Add authentication', description: '', status: 'pending', blockedBy: [] },
    {
      id: 't4',
      subject: 'Write integration tests',
      description: '',
      status: 'pending',
      blockedBy: [],
    },
  ],
  journal: [blockerEntry, sessionEntry],
};

// ============================================================================
// Sample Session Data
// ============================================================================

const sampleSessions: SessionInfo[] = [
  {
    name: 'saga-story-storybook-setup-component-stories-12345',
    storyId: 'storybook-setup-component-stories',
    status: 'running',
    outputFile: '/tmp/saga/sessions/12345.jsonl',
    outputAvailable: true,
    startTime: '2026-01-28T02:00:00Z',
    outputPreview: 'Running task t7...\nCreating stories...',
  },
  {
    name: 'saga-story-storybook-setup-component-stories-67890',
    storyId: 'storybook-setup-component-stories',
    status: 'completed',
    outputFile: '/tmp/saga/sessions/67890.jsonl',
    outputAvailable: true,
    startTime: '2026-01-28T01:00:00Z',
    endTime: '2026-01-28T01:45:00Z',
    outputPreview: 'Tasks t1-t6 completed.',
  },
];

const completedStory: StoryDetailType = {
  id: 'setup-project',
  title: 'Setup Project Structure',
  description: '',
  status: 'completed',
  epic: 'dashboard-restructure',
  tasks: [
    {
      id: 't1',
      subject: 'Initialize repository',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't2',
      subject: 'Configure build tools',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    {
      id: 't3',
      subject: 'Setup linting and formatting',
      description: '',
      status: 'completed',
      blockedBy: [],
    },
    { id: 't4', subject: 'Add CI pipeline', description: '', status: 'completed', blockedBy: [] },
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

// ============================================================================
// Helper Functions
// ============================================================================

/** Renders a story header with navigation, title, and status */
function StoryHeader({
  story,
  showEpicLink = true,
}: {
  story: StoryDetailType;
  showEpicLink?: boolean;
}) {
  const completedCount = story.tasks.filter((t) => t.status === 'completed').length;
  return (
    <div className="space-y-4">
      {showEpicLink && story.epic && (
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <Link to={`/epic/${story.epic}`} className="hover:text-primary">
            {story.epic}
          </Link>
          <span>/</span>
          <span className="text-text">{story.id}</span>
        </div>
      )}
      <h1 className="text-2xl font-bold text-text">{story.title}</h1>
      <div className="flex items-center gap-4">
        <StatusBadge status={story.status} />
        <span className="text-sm text-text-muted">
          {completedCount}/{story.tasks.length} tasks completed
        </span>
      </div>
    </div>
  );
}

/** Renders the Tasks tab content */
function TasksTabContent({ tasks }: { tasks: Task[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-text-muted text-center py-4">No tasks defined for this story.</p>
        ) : (
          <div className="divide-y divide-border-muted">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Renders the Story Content tab with markdown */
function ContentTabContent({ description }: { description: string | undefined }) {
  if (!description) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-text-muted text-center">No content for this story.</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Story Content</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm prose-invert max-w-none prose-headings:text-text prose-p:text-text-muted prose-strong:text-text prose-code:text-primary prose-code:bg-bg-dark prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-bg-dark prose-pre:border prose-pre:border-border-muted prose-a:text-primary prose-a:no-underline prose-a:hover:underline prose-li:text-text-muted prose-table:border prose-table:border-border-muted prose-th:bg-bg-dark prose-th:px-3 prose-th:py-2 prose-th:text-text prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-border-muted">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}

/** Renders the Journal tab content */
function JournalTabContent({
  journal,
  hasBlocker = false,
}: {
  journal: JournalEntry[];
  hasBlocker?: boolean;
}) {
  if (journal.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-text-muted text-center">No journal entries yet.</p>
        </CardContent>
      </Card>
    );
  }

  const blockers = journal.filter((e) => e.type === 'blocker');
  const resolutions = journal.filter((e) => e.type === 'resolution');
  const sessions = journal.filter((e) => e.type === 'session');

  return (
    <div className="space-y-4">
      {blockers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Blockers ({blockers.length})
          </h3>
          {blockers.map((entry) => (
            <JournalEntryItem
              key={`blocker-${entry.title}-${entry.timestamp}`}
              entry={entry}
              defaultOpen={hasBlocker}
            />
          ))}
        </div>
      )}
      {resolutions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-success">Resolutions ({resolutions.length})</h3>
          {resolutions.map((entry) => (
            <JournalEntryItem key={`resolution-${entry.title}-${entry.timestamp}`} entry={entry} />
          ))}
        </div>
      )}
      {sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text">Sessions ({sessions.length})</h3>
          {sessions.map((entry) => (
            <JournalEntryItem key={`session-${entry.title}-${entry.timestamp}`} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders the Sessions tab content */
function SessionsTabContent({ sessions }: { sessions: SessionInfo[] }) {
  if (sessions.length === 0) {
    return <SessionsPanelEmpty />;
  }

  return (
    <div data-testid="sessions-panel" className="space-y-4">
      {sessions.map((session, index) => (
        <SessionDetailCard key={session.name} session={session} defaultExpanded={index === 0} />
      ))}
    </div>
  );
}

// ============================================================================
// Showcase Section Components
// ============================================================================

/** Loading state section for Showcase */
function LoadingStateSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
        Loading State
      </h3>
      <div className="space-y-6">
        <HeaderSkeleton />
        <ContentSkeleton />
      </div>
    </section>
  );
}

/** Not found state section for Showcase */
function NotFoundSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
        Not Found (404)
      </h3>
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-text mb-2">Story not found</h1>
        <p className="text-text-muted mb-4">
          The story &quot;non-existent-story&quot; does not exist.
        </p>
        <Link to="/" className="text-primary hover:underline">
          ← Back to epic list
        </Link>
      </div>
    </section>
  );
}

/** Empty state section for Showcase */
function EmptyStateSection() {
  const emptyStory: StoryDetailType = {
    id: 'new-story',
    title: 'New Story',
    description: '',
    status: 'pending',
    epic: 'dashboard-restructure',
    tasks: [],
    journal: [],
  };

  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
        Empty State
      </h3>
      <div className="space-y-6">
        <StoryHeader story={emptyStory} showEpicLink={false} />
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks">
            <TasksTabContent tasks={[]} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

/** Populated state section for Showcase */
function PopulatedStateSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
        Populated State
      </h3>
      <div className="space-y-6">
        <StoryHeader story={sampleStory} showEpicLink={false} />
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks">
            <TasksTabContent tasks={sampleStory.tasks} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

/** Blocked state section for Showcase */
function BlockedStateSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
        Blocked State
      </h3>
      <div className="space-y-6">
        <StoryHeader story={storyWithBlocker} showEpicLink={false} />
        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">
              Journal
              <Badge className="ml-2 bg-danger/20 text-danger text-xs">1</Badge>
            </TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
          <TabsContent value="journal">
            <JournalTabContent journal={storyWithBlocker.journal ?? []} hasBlocker={true} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

/** Completed state section for Showcase */
function CompletedStateSection() {
  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
        Completed State
      </h3>
      <div className="space-y-6">
        <StoryHeader story={completedStory} showEpicLink={false} />
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks">
            <TasksTabContent tasks={completedStory.tasks} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

// ============================================================================
// Meta Definition
// ============================================================================

/**
 * Full StoryDetail page component showing story tasks and journal.
 */
const meta: Meta<typeof StoryDetail> = {
  title: 'Pages/StoryDetail',
  component: StoryDetail,
  decorators: [
    (Story) => (
      <PageWrapper route="/story/storybook-setup-component-stories">
        <Story />
      </PageWrapper>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main page component displaying story details with tasks and journal entries. Shows loading skeletons, 404/error states, and tabs for Tasks, Story Content, and Journal.',
      },
    },
  },
};

type StoryDetailStory = StoryObj<typeof StoryDetail>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Showcase displaying all StoryDetail page states.
 *
 * Demonstrates the different states the page can be in:
 * - Loading: Shows skeleton placeholders while data is fetched
 * - Not Found: 404 state when story doesn't exist
 * - Empty: Story exists but has no tasks
 * - Populated: Story with tasks in various statuses
 * - Blocked: Story with blocker in journal
 * - Completed: All tasks completed
 */
export const Showcase: StoryDetailStory = {
  render: () => (
    <div className="space-y-12">
      <LoadingStateSection />
      <NotFoundSection />
      <EmptyStateSection />
      <PopulatedStateSection />
      <BlockedStateSection />
      <CompletedStateSection />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify section headings
    await expect(canvas.getByText('Loading State')).toBeInTheDocument();
    await expect(canvas.getByText('Not Found (404)')).toBeInTheDocument();
    await expect(canvas.getByText('Empty State')).toBeInTheDocument();
    await expect(canvas.getByText('Populated State')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked State')).toBeInTheDocument();
    await expect(canvas.getByText('Completed State')).toBeInTheDocument();

    // Verify loading skeleton
    await expect(canvas.getByTestId('story-header-skeleton')).toBeInTheDocument();
    await expect(canvas.getByTestId('story-content-skeleton')).toBeInTheDocument();

    // Verify not found state
    await expect(canvas.getByText('Story not found')).toBeInTheDocument();

    // Verify empty state
    await expect(canvas.getByText('No tasks defined for this story.')).toBeInTheDocument();

    // Verify populated state
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();

    // Verify blocked state
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked: Missing API credentials')).toBeInTheDocument();

    // Verify completed state
    await expect(canvas.getByText('Setup Project Structure')).toBeInTheDocument();

    // Visual snapshots
    await matchDomSnapshot(canvasElement, 'story-detail-showcase');
    await matchPixelSnapshot(canvasElement, 'story-detail-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring StoryDetail page states.
 *
 * Currently shows the populated state with tasks. In a real application,
 * this page fetches data from an API based on the route parameter.
 */
export const Playground: StoryDetailStory = {
  render: () => (
    <div className="space-y-6">
      <StoryHeader story={sampleStory} />
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <TasksTabContent tasks={sampleStory.tasks} />
        </TabsContent>
        <TabsContent value="content">
          <ContentTabContent description={sampleStory.description} />
        </TabsContent>
        <TabsContent value="journal">
          <JournalTabContent journal={sampleStory.journal ?? []} />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTabContent sessions={sampleSessions} />
        </TabsContent>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify story header
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();
    await expect(canvas.getByText('6/9 tasks completed')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();

    // Verify tabs are present
    await expect(canvas.getByRole('tab', { name: 'Tasks' })).toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'Story Content' })).toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'Journal' })).toBeInTheDocument();
    await expect(canvas.getByRole('tab', { name: 'Sessions' })).toBeInTheDocument();

    // Verify epic link (appears in both breadcrumb and story header)
    const epicLinks = canvas
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/epic/dashboard-restructure');
    await expect(epicLinks.length).toBeGreaterThanOrEqual(1);
  },
};

// ============================================================================
// Individual Page State Stories (for visual regression testing)
// ============================================================================

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
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify header and content skeletons are present
    const skeletons = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletons.length).toBe(EXPECTED_SKELETON_COUNT);

    // Verify bg-bg-light placeholder elements
    const placeholders = canvasElement.querySelectorAll('.bg-bg-light');
    await expect(placeholders.length).toBeGreaterThanOrEqual(MIN_SKELETON_PLACEHOLDER_COUNT);

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'story-detail-loading');
    await matchPixelSnapshot(canvasElement, 'story-detail-loading');
  },
};

/**
 * 404 state when story is not found.
 */
export const NotFound: StoryDetailStory = {
  render: () => (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-text mb-2">Story not found</h1>
      <p className="text-text-muted mb-4">
        The story &quot;non-existent-story&quot; does not exist.
      </p>
      <Link to="/" className="text-primary hover:underline">
        ← Back to epic list
      </Link>
    </div>
  ),
  parameters: {
    a11y: { test: 'error' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify error title
    await expect(canvas.getByText('Story not found')).toBeInTheDocument();

    // Filter by explicit back link (not breadcrumb)
    const backLinks = canvas
      .getAllByRole('link')
      .filter((link) => BACK_TO_EPIC_LIST_PATTERN.test(link.textContent || ''));
    await expect(backLinks.length).toBeGreaterThanOrEqual(1);
    await expect(backLinks[0]).toHaveAttribute('href', '/');

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'story-detail-not-found');
    await matchPixelSnapshot(canvasElement, 'story-detail-not-found');
  },
};

/**
 * Error state when fetching fails.
 */
export const ErrorState: StoryDetailStory = {
  render: () => (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-danger mb-2">Error</h1>
      <p className="text-text-muted mb-4">Failed to load story</p>
      <Link to="/" className="text-primary hover:underline">
        ← Back to epic list
      </Link>
    </div>
  ),
  parameters: {
    a11y: { test: 'error' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify error heading with danger styling
    const errorHeading = canvas.getByText('Error');
    await expect(errorHeading).toBeInTheDocument();
    await expect(errorHeading).toHaveClass('text-danger');

    // Verify error message
    await expect(canvas.getByText('Failed to load story')).toBeInTheDocument();

    // Filter by explicit back link (not breadcrumb)
    const backLinks = canvas
      .getAllByRole('link')
      .filter((link) => BACK_TO_EPIC_LIST_PATTERN.test(link.textContent || ''));
    await expect(backLinks.length).toBeGreaterThanOrEqual(1);
  },
};

/**
 * Populated story with tasks and journal (Tasks tab active).
 */
export const Populated: StoryDetailStory = {
  render: () => (
    <div className="space-y-6">
      <StoryHeader story={sampleStory} />
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <TasksTabContent tasks={sampleStory.tasks} />
        </TabsContent>
      </Tabs>
    </div>
  ),
  parameters: {
    a11y: { test: 'error' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify epic link (appears in both breadcrumb and story header)
    const epicLinks = canvas
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/epic/dashboard-restructure');
    await expect(epicLinks.length).toBeGreaterThanOrEqual(1);

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
    await expect(canvas.getByRole('tab', { name: 'Sessions' })).toBeInTheDocument();

    // Verify some task items are rendered (using 'subject' field names from the data)
    await expect(canvas.getByText('Install and configure Storybook 10.x')).toBeInTheDocument();
    await expect(canvas.getByText('Create stories for StoryDetail page')).toBeInTheDocument();

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'story-detail-populated');
    await matchPixelSnapshot(canvasElement, 'story-detail-populated');
  },
};

/**
 * Story with no tasks defined.
 */
export const EmptyTasks: StoryDetailStory = {
  render: () => {
    const emptyStory: StoryDetailType = {
      id: 'new-story',
      title: 'New Story',
      description: '',
      status: 'pending',
      epic: 'dashboard-restructure',
      tasks: [],
      journal: [],
    };

    return (
      <div className="space-y-6">
        <StoryHeader story={emptyStory} />
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
          <TabsContent value="tasks">
            <TasksTabContent tasks={[]} />
          </TabsContent>
        </Tabs>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify story title
    await expect(canvas.getByText('New Story')).toBeInTheDocument();

    // Verify Pending status badge
    const badge = canvas.getByText('Pending');
    await expect(badge).toBeInTheDocument();

    // Verify 0/0 tasks progress
    await expect(canvas.getByText('0/0 tasks completed')).toBeInTheDocument();

    // Verify empty tasks message
    await expect(canvas.getByText('No tasks defined for this story.')).toBeInTheDocument();
  },
};

/**
 * Story with a blocker - Journal tab shows blocker prominently.
 */
export const WithBlocker: StoryDetailStory = {
  render: () => (
    <div className="space-y-6">
      <StoryHeader story={storyWithBlocker} />
      <Tabs defaultValue="journal" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">
            Journal
            <Badge className="ml-2 bg-danger/20 text-danger text-xs">1</Badge>
          </TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="journal">
          <JournalTabContent journal={storyWithBlocker.journal ?? []} hasBlocker={true} />
        </TabsContent>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify story title
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();

    // Verify In Progress status badge
    const badge = canvas.getByText('In Progress');
    await expect(badge).toBeInTheDocument();

    // Verify task progress
    await expect(canvas.getByText('1/4 tasks completed')).toBeInTheDocument();

    // Verify Blockers section header
    await expect(canvas.getByText('Blockers (1)')).toBeInTheDocument();

    // Verify blocker entry is displayed
    await expect(canvas.getByText('Blocked: Missing API credentials')).toBeInTheDocument();

    // Verify Sessions section header
    await expect(canvas.getByText('Sessions (1)')).toBeInTheDocument();

    // Verify session entry title
    await expect(canvas.getByText('Session: 2026-01-28 09:00 UTC')).toBeInTheDocument();

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'story-detail-with-blocker');
    await matchPixelSnapshot(canvasElement, 'story-detail-with-blocker');
  },
};

/**
 * Completed story - all tasks done.
 */
export const Completed: StoryDetailStory = {
  render: () => (
    <div className="space-y-6">
      <StoryHeader story={completedStory} />
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <TasksTabContent tasks={completedStory.tasks} />
        </TabsContent>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify story title
    await expect(canvas.getByText('Setup Project Structure')).toBeInTheDocument();

    // Verify Completed status badge
    const statusBadge = canvas.getAllByText('Completed')[0];
    await expect(statusBadge).toBeInTheDocument();

    // Verify task progress (all completed)
    await expect(canvas.getByText('4/4 tasks completed')).toBeInTheDocument();

    // Verify all tasks are rendered with completed status
    await expect(canvas.getByText('Initialize repository')).toBeInTheDocument();
    await expect(canvas.getByText('Configure build tools')).toBeInTheDocument();
    await expect(canvas.getByText('Setup linting and formatting')).toBeInTheDocument();
    await expect(canvas.getByText('Add CI pipeline')).toBeInTheDocument();

    // Verify all task badges show "completed" (status badge + 4 task badges)
    const completedBadges = canvas.getAllByText('completed');
    await expect(completedBadges.length).toBe(EXPECTED_COMPLETED_TASK_COUNT);
  },
};

/**
 * Story showing the Story Content tab with markdown content.
 */
export const WithContent: StoryDetailStory = {
  render: () => (
    <div className="space-y-6">
      <StoryHeader story={sampleStory} />
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <ContentTabContent description={sampleStory.description} />
        </TabsContent>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify story title
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();

    // Verify Story Content tab is active
    const contentTab = canvas.getByRole('tab', { name: 'Story Content' });
    await expect(contentTab).toBeInTheDocument();

    // Verify Story Content card title
    await expect(canvas.getByText('Story Content', { selector: '.text-lg' })).toBeInTheDocument();

    // Verify markdown content is rendered
    await expect(canvas.getByRole('heading', { name: 'Context' })).toBeInTheDocument();
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
  render: () => {
    const storyWithEmptyJournal: StoryDetailType = {
      id: 'new-story',
      title: 'New Story',
      description: '',
      status: 'pending',
      epic: 'dashboard-restructure',
      tasks: [
        { id: 't1', subject: 'Task 1', description: '', status: 'pending', blockedBy: [] },
        { id: 't2', subject: 'Task 2', description: '', status: 'pending', blockedBy: [] },
        { id: 't3', subject: 'Task 3', description: '', status: 'pending', blockedBy: [] },
      ],
      journal: [],
    };

    return (
      <div className="space-y-6">
        <StoryHeader story={storyWithEmptyJournal} />
        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="content">Story Content</TabsTrigger>
            <TabsTrigger value="journal">Journal</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>
          <TabsContent value="journal">
            <JournalTabContent journal={[]} />
          </TabsContent>
        </Tabs>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify story title
    await expect(canvas.getByText('New Story')).toBeInTheDocument();

    // Verify Pending status badge
    await expect(canvas.getByText('Pending')).toBeInTheDocument();

    // Verify task progress
    await expect(canvas.getByText('0/3 tasks completed')).toBeInTheDocument();

    // Verify Journal tab is active (defaultValue="journal")
    const journalTab = canvas.getByRole('tab', { name: 'Journal' });
    await expect(journalTab).toBeInTheDocument();

    // Verify empty journal message
    await expect(canvas.getByText('No journal entries yet.')).toBeInTheDocument();
  },
};

/**
 * Story showing the Sessions tab with running and completed sessions.
 */
export const WithSessions: StoryDetailStory = {
  render: () => (
    <div className="space-y-6">
      <StoryHeader story={sampleStory} />
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions">
          <SessionsTabContent sessions={sampleSessions} />
        </TabsContent>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify story title
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();

    // Verify Sessions tab is active
    const sessionsTab = canvas.getByRole('tab', { name: 'Sessions' });
    await expect(sessionsTab).toBeInTheDocument();

    // Verify sessions panel is rendered
    await expect(canvas.getByTestId('sessions-panel')).toBeInTheDocument();

    // Verify session cards are rendered
    const sessionCards = canvas.getAllByTestId('session-detail-card');
    await expect(sessionCards.length).toBe(2);

    // Verify status badges
    await expect(canvas.getByText('Running')).toBeInTheDocument();
    await expect(canvas.getByText('Completed')).toBeInTheDocument();

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'story-detail-with-sessions');
    await matchPixelSnapshot(canvasElement, 'story-detail-with-sessions');
  },
};

/**
 * Story showing the Sessions tab with no sessions (empty state).
 */
export const EmptySessions: StoryDetailStory = {
  render: () => (
    <div className="space-y-6">
      <StoryHeader story={sampleStory} />
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="content">Story Content</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions">
          <SessionsTabContent sessions={[]} />
        </TabsContent>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify story title
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();

    // Verify Sessions tab is active
    const sessionsTab = canvas.getByRole('tab', { name: 'Sessions' });
    await expect(sessionsTab).toBeInTheDocument();

    // Verify empty sessions message
    await expect(canvas.getByTestId('sessions-panel-empty')).toBeInTheDocument();
    await expect(canvas.getByText('No sessions found for this story')).toBeInTheDocument();

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'story-detail-empty-sessions');
    await matchPixelSnapshot(canvasElement, 'story-detail-empty-sessions');
  },
};

export default meta;
