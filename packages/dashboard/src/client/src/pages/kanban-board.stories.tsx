import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { StoryCard } from '@/components/StoryCard';
import { PageWrapper } from '@/test-utils/storybook-page-wrapper';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';
import type { StoryDetail } from '@/types/dashboard';
import { KanbanColumn, KanbanError, KanbanSkeleton } from './KanbanBoard.tsx';

// ============================================================================
// Constants
// ============================================================================

/** Number of columns in the kanban board */
const COLUMN_COUNT = 3;

// ============================================================================
// Sample Data
// ============================================================================

const pendingStories: StoryDetail[] = [
  {
    id: 'setup-project',
    title: 'Set Up Project Structure',
    description: 'Initialize the project with required tooling.',
    status: 'pending',
    epic: 'dashboard-restructure',
    epicName: 'Dashboard Restructure',
    tasks: [
      { id: 't1', subject: 'Init repository', description: '', status: 'pending', blockedBy: [] },
      { id: 't2', subject: 'Configure CI', description: '', status: 'pending', blockedBy: ['t1'] },
    ],
    journal: [],
  },
  {
    id: 'write-docs',
    title: 'Write Documentation',
    description: 'Create user-facing docs.',
    status: 'pending',
    tasks: [],
    journal: [],
  },
];

const inProgressStories: StoryDetail[] = [
  {
    id: 'kanban-board',
    title: 'Implement Kanban Board View',
    description: 'Build a 3-column kanban board.',
    status: 'inProgress',
    epic: 'dashboard-restructure',
    epicName: 'Dashboard Restructure',
    tasks: [
      {
        id: 't1',
        subject: 'Create KanbanBoard component',
        description: '',
        status: 'completed',
        blockedBy: [],
      },
      {
        id: 't2',
        subject: 'Add StoryCard component',
        description: '',
        status: 'completed',
        blockedBy: [],
      },
      {
        id: 't3',
        subject: 'Integrate with API',
        description: '',
        status: 'inProgress',
        blockedBy: ['t1'],
      },
      { id: 't4', subject: 'Add tests', description: '', status: 'pending', blockedBy: ['t3'] },
    ],
    journal: [],
  },
];

const completedStories: StoryDetail[] = [
  {
    id: 'flatten-package',
    title: 'Flatten Package Structure',
    description: 'Simplify the package layout.',
    status: 'completed',
    epic: 'dashboard-restructure',
    epicName: 'Dashboard Restructure',
    tasks: [
      { id: 't1', subject: 'Move files', description: '', status: 'completed', blockedBy: [] },
      { id: 't2', subject: 'Update imports', description: '', status: 'completed', blockedBy: [] },
    ],
    journal: [],
  },
  {
    id: 'add-breadcrumbs',
    title: 'Add Breadcrumb Navigation',
    description: 'Add breadcrumb nav to all pages.',
    status: 'completed',
    tasks: [
      {
        id: 't1',
        subject: 'Create Breadcrumb component',
        description: '',
        status: 'completed',
        blockedBy: [],
      },
      {
        id: 't2',
        subject: 'Integrate with router',
        description: '',
        status: 'completed',
        blockedBy: [],
      },
      { id: 't3', subject: 'Add tests', description: '', status: 'completed', blockedBy: ['t2'] },
    ],
    journal: [],
  },
];

const runningStoryIds = new Set(['kanban-board']);

// ============================================================================
// Meta
// ============================================================================

/**
 * KanbanBoard page displaying stories in 3 columns: Pending, In Progress, Completed.
 *
 * Features:
 * - Loading skeleton state
 * - Error state
 * - Empty board with "No stories" per column
 * - Populated board with collapsible story cards
 */
const meta: Meta = {
  title: 'Pages/KanbanBoard',
  decorators: [
    (Story) => (
      <PageWrapper route="/">
        <Story />
      </PageWrapper>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Home page component displaying all stories in a Kanban board layout with Pending, In Progress, and Completed columns.',
      },
    },
  },
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Curated display of all KanbanBoard states:
 * - Loading skeleton
 * - Error
 * - Empty board
 * - Populated board with story cards
 */
const Showcase: Story = {
  render: () => (
    <div className="space-y-12">
      {/* Loading State */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
          Loading State
        </h3>
        <KanbanSkeleton />
      </section>

      {/* Error State */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
          Error State
        </h3>
        <KanbanError />
      </section>

      {/* Empty State */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
          Empty Board
        </h3>
        <div className="flex h-64 gap-4 p-4">
          <KanbanColumn
            label="Pending"
            columnKey="pending"
            stories={[]}
            runningStoryIds={new Set()}
          />
          <KanbanColumn
            label="In Progress"
            columnKey="inProgress"
            stories={[]}
            runningStoryIds={new Set()}
          />
          <KanbanColumn
            label="Completed"
            columnKey="completed"
            stories={[]}
            runningStoryIds={new Set()}
          />
        </div>
      </section>

      {/* Populated State */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
          Populated Board
        </h3>
        <div className="flex gap-4 p-4">
          <KanbanColumn
            label="Pending"
            columnKey="pending"
            stories={pendingStories}
            runningStoryIds={runningStoryIds}
          />
          <KanbanColumn
            label="In Progress"
            columnKey="inProgress"
            stories={inProgressStories}
            runningStoryIds={runningStoryIds}
          />
          <KanbanColumn
            label="Completed"
            columnKey="completed"
            stories={completedStories}
            runningStoryIds={runningStoryIds}
          />
        </div>
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify section headers
    await expect(canvas.getByText('Loading State')).toBeInTheDocument();
    await expect(canvas.getByText('Error State')).toBeInTheDocument();
    await expect(canvas.getByText('Empty Board')).toBeInTheDocument();
    await expect(canvas.getByText('Populated Board')).toBeInTheDocument();

    // Verify loading skeleton
    await expect(canvas.getByTestId('kanban-loading')).toBeInTheDocument();

    // Verify error state
    await expect(canvas.getByTestId('kanban-error')).toBeInTheDocument();
    await expect(canvas.getByText('Failed to load stories')).toBeInTheDocument();

    // Verify empty columns show "No stories"
    const noStoriesTexts = canvas.getAllByText('No stories');
    await expect(noStoriesTexts.length).toBe(COLUMN_COUNT);

    // Verify populated board has story titles
    await expect(canvas.getByText('Set Up Project Structure')).toBeInTheDocument();
    await expect(canvas.getByText('Implement Kanban Board View')).toBeInTheDocument();
    await expect(canvas.getByText('Flatten Package Structure')).toBeInTheDocument();

    // Visual snapshots
    await matchDomSnapshot(canvasElement, 'kanban-board-showcase');
    await matchPixelSnapshot(canvasElement, 'kanban-board-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

const Playground: Story = {
  render: () => (
    <div className="flex gap-4 p-4">
      <KanbanColumn
        label="Pending"
        columnKey="pending"
        stories={pendingStories}
        runningStoryIds={runningStoryIds}
      />
      <KanbanColumn
        label="In Progress"
        columnKey="inProgress"
        stories={inProgressStories}
        runningStoryIds={runningStoryIds}
      />
      <KanbanColumn
        label="Completed"
        columnKey="completed"
        stories={completedStories}
        runningStoryIds={runningStoryIds}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify all 3 columns render
    await expect(canvas.getByTestId('column-pending')).toBeInTheDocument();
    await expect(canvas.getByTestId('column-inProgress')).toBeInTheDocument();
    await expect(canvas.getByTestId('column-completed')).toBeInTheDocument();

    // Verify story counts in column headers
    const pendingCol = canvas.getByTestId('column-pending');
    await expect(within(pendingCol).getByText(String(pendingStories.length))).toBeInTheDocument();

    // Verify running indicator on kanban-board story
    const kanbanCard = canvas.getByTestId('story-card-kanban-board');
    await expect(within(kanbanCard).getByTestId('running-indicator')).toBeInTheDocument();
  },
};

// ============================================================================
// Individual State Stories
// ============================================================================

const Loading: Story = {
  render: () => <KanbanSkeleton />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByTestId('kanban-loading')).toBeInTheDocument();
    // Verify skeleton structure: 3 columns × (1 header skeleton + 1 separator skeleton + 3 card skeletons)
    const skeletons = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletons.length).toBeGreaterThan(0);
    await matchDomSnapshot(canvasElement, 'kanban-board-loading');
    await matchPixelSnapshot(canvasElement, 'kanban-board-loading');
  },
};

const ErrorState: Story = {
  render: () => <KanbanError />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByTestId('kanban-error')).toBeInTheDocument();
    await expect(canvas.getByText('Failed to load stories')).toBeInTheDocument();
    await expect(canvas.getByText('Please try refreshing the page.')).toBeInTheDocument();
    await matchDomSnapshot(canvasElement, 'kanban-board-error');
    await matchPixelSnapshot(canvasElement, 'kanban-board-error');
  },
};

const Empty: Story = {
  render: () => (
    <div className="flex h-96 gap-4 p-4">
      <KanbanColumn label="Pending" columnKey="pending" stories={[]} runningStoryIds={new Set()} />
      <KanbanColumn
        label="In Progress"
        columnKey="inProgress"
        stories={[]}
        runningStoryIds={new Set()}
      />
      <KanbanColumn
        label="Completed"
        columnKey="completed"
        stories={[]}
        runningStoryIds={new Set()}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    // Verify all 3 columns with "No stories"
    const noStoriesTexts = canvas.getAllByText('No stories');
    await expect(noStoriesTexts.length).toBe(COLUMN_COUNT);
    // Verify column counts show 0
    await expect(canvas.getByTestId('column-pending')).toBeInTheDocument();
    await expect(canvas.getByTestId('column-inProgress')).toBeInTheDocument();
    await expect(canvas.getByTestId('column-completed')).toBeInTheDocument();
    await matchDomSnapshot(canvasElement, 'kanban-board-empty');
    await matchPixelSnapshot(canvasElement, 'kanban-board-empty');
  },
};

const Populated: Story = {
  render: () => (
    <div className="flex gap-4 p-4">
      <KanbanColumn
        label="Pending"
        columnKey="pending"
        stories={pendingStories}
        runningStoryIds={runningStoryIds}
      />
      <KanbanColumn
        label="In Progress"
        columnKey="inProgress"
        stories={inProgressStories}
        runningStoryIds={runningStoryIds}
      />
      <KanbanColumn
        label="Completed"
        columnKey="completed"
        stories={completedStories}
        runningStoryIds={runningStoryIds}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();

    // Verify stories in correct columns
    const pendingCol = canvas.getByTestId('column-pending');
    await expect(within(pendingCol).getByText('Set Up Project Structure')).toBeInTheDocument();
    await expect(within(pendingCol).getByText('Write Documentation')).toBeInTheDocument();

    const inProgressCol = canvas.getByTestId('column-inProgress');
    await expect(
      within(inProgressCol).getByText('Implement Kanban Board View'),
    ).toBeInTheDocument();

    const completedCol = canvas.getByTestId('column-completed');
    await expect(within(completedCol).getByText('Flatten Package Structure')).toBeInTheDocument();
    await expect(within(completedCol).getByText('Add Breadcrumb Navigation')).toBeInTheDocument();

    // Verify epic badges
    const epicBadges = canvas.getAllByTestId('epic-badge');
    await expect(epicBadges.length).toBeGreaterThan(0);

    // Verify running indicator
    const kanbanCard = canvas.getByTestId('story-card-kanban-board');
    await expect(within(kanbanCard).getByTestId('running-indicator')).toBeInTheDocument();

    await matchDomSnapshot(canvasElement, 'kanban-board-populated');
    await matchPixelSnapshot(canvasElement, 'kanban-board-populated');
  },
};

/**
 * Story card expanded state showing task list, progress, and links.
 */
const ExpandedCard: Story = {
  render: () => (
    <div className="max-w-sm p-4">
      <StoryCard story={inProgressStories[0]} isSessionRunning={true} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click to expand
    const trigger = canvas.getByTestId('story-card-trigger-kanban-board');
    await userEvent.click(trigger);

    // Verify expanded content
    const content = canvas.getByTestId('story-card-content-kanban-board');
    await expect(content).toBeInTheDocument();

    // Verify task list
    await expect(within(content).getByText('Create KanbanBoard component')).toBeInTheDocument();
    await expect(within(content).getByText('Add StoryCard component')).toBeInTheDocument();
    await expect(within(content).getByText('Integrate with API')).toBeInTheDocument();
    await expect(within(content).getByText('Add tests')).toBeInTheDocument();

    // Verify "Open story" link
    const link = content.querySelector('a[href="/story/kanban-board"]');
    await expect(link).toBeInTheDocument();

    // Verify session running indicator in expanded state
    await expect(within(content).getByText('Session running')).toBeInTheDocument();

    await matchDomSnapshot(canvasElement, 'kanban-board-expanded-card');
    await matchPixelSnapshot(canvasElement, 'kanban-board-expanded-card');
  },
};

// ============================================================================
// Exports
// ============================================================================

export default meta;
export { Showcase, Playground, Loading, ErrorState, Empty, Populated, ExpandedCard };
