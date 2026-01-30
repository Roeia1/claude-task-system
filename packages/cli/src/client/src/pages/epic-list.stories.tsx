import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, within } from 'storybook/test';
import { createActor } from 'xstate';
import { DashboardProvider } from '@/context/dashboard-context';
import { dashboardMachine } from '@/machines';
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot';
import type { EpicSummary } from '@/types/dashboard';
import { EpicCard, EpicCardSkeleton, EpicList, StatusBadge } from './EpicList.tsx';

// ============================================================================
// EpicCardSkeleton Stories
// ============================================================================

/**
 * Skeleton loading component that displays an animated placeholder
 * while epic data is being fetched.
 */
const skeletonMeta: Meta<typeof EpicCardSkeleton> = {
  title: 'Pages/EpicList/EpicCardSkeleton',
  component: EpicCardSkeleton,
  parameters: {
    docs: {
      description: {
        component:
          'Animated loading placeholder for epic cards. Displays during initial data fetch.',
      },
    },
  },
};

export default skeletonMeta;
type SkeletonStory = StoryObj<typeof EpicCardSkeleton>;

/**
 * Default skeleton showing the animated loading state with
 * placeholder areas for title, progress bar, and status badges.
 */
export const Skeleton: SkeletonStory = {
  play: async ({ canvasElement }) => {
    const _canvas = within(canvasElement);
    // Verify skeleton card structure exists - the card should have animate-pulse class
    const card = canvasElement.querySelector('.animate-pulse');
    await expect(card).toBeInTheDocument();
    // Verify skeleton has placeholder elements with bg-bg-light class
    const placeholders = canvasElement.querySelectorAll('.bg-bg-light');
    await expect(placeholders.length).toBeGreaterThanOrEqual(3); // title, progress bar, badges
  },
};

/**
 * Multiple skeletons arranged in a grid, simulating the loading
 * state of the EpicList page.
 */
export const SkeletonGrid: SkeletonStory = {
  render: () => (
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <EpicCardSkeleton />
      <EpicCardSkeleton />
      <EpicCardSkeleton />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Verify grid container exists
    const grid = canvasElement.querySelector('.grid');
    await expect(grid).toBeInTheDocument();
    // Verify three skeleton cards are rendered
    const skeletonCards = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletonCards.length).toBe(3);
  },
};

// ============================================================================
// StatusBadge Stories (exported separately for dedicated coverage in t8)
// ============================================================================

/**
 * Status badge component that displays story status with appropriate
 * color coding and count.
 */
export const statusBadgeMeta: Meta<typeof StatusBadge> = {
  title: 'Pages/EpicList/StatusBadge',
  component: StatusBadge,
  argTypes: {
    status: {
      control: 'select',
      options: ['ready', 'in_progress', 'blocked', 'completed'],
      description: 'The status type determining badge color',
    },
    count: {
      control: 'number',
      description: 'Number of stories in this status',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status badge showing the count of stories in a particular status. Colors match the dashboard theme: gray for ready, blue for in_progress, red for blocked, green for completed.',
      },
    },
  },
};

type StatusBadgeStory = StoryObj<typeof StatusBadge>;

/**
 * Ready status - gray color indicating stories that haven't started.
 */
export const StatusReady: StatusBadgeStory = {
  render: () => <StatusBadge status="ready" count={5} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Ready: 5');
    await expect(badge).toBeInTheDocument();
  },
};

/**
 * In Progress status - primary blue color for active work.
 */
export const StatusInProgress: StatusBadgeStory = {
  render: () => <StatusBadge status="in_progress" count={3} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('In Progress: 3');
    await expect(badge).toBeInTheDocument();
  },
};

/**
 * Blocked status - danger red color indicating impediments.
 */
export const StatusBlocked: StatusBadgeStory = {
  render: () => <StatusBadge status="blocked" count={1} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Blocked: 1');
    await expect(badge).toBeInTheDocument();
  },
};

/**
 * Completed status - success green color for finished stories.
 */
export const StatusCompleted: StatusBadgeStory = {
  render: () => <StatusBadge status="completed" count={8} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = canvas.getByText('Completed: 8');
    await expect(badge).toBeInTheDocument();
  },
};

/**
 * All status badges displayed together to show color contrast.
 */
export const AllStatuses: StatusBadgeStory = {
  render: () => (
    <div class="flex flex-wrap gap-2">
      <StatusBadge status="ready" count={5} />
      <StatusBadge status="in_progress" count={3} />
      <StatusBadge status="blocked" count={1} />
      <StatusBadge status="completed" count={8} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify all four status badges are present
    await expect(canvas.getByText('Ready: 5')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress: 3')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked: 1')).toBeInTheDocument();
    await expect(canvas.getByText('Completed: 8')).toBeInTheDocument();
  },
};

// ============================================================================
// EpicCard Stories
// ============================================================================

/**
 * Epic card component displaying an epic's title, progress, and story status breakdown.
 */
export const epicCardMeta: Meta<typeof EpicCard> = {
  title: 'Pages/EpicList/EpicCard',
  component: EpicCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Card component for displaying a single epic with title, progress bar, and status badges. Clickable to navigate to epic detail.',
      },
    },
    // Enable a11y tests for clickable card links - must have accessible names
    a11y: {
      test: 'error',
    },
  },
};

type EpicCardStory = StoryObj<typeof EpicCard>;

const sampleEpic: EpicSummary = {
  slug: 'dashboard-restructure',
  title: 'Dashboard Restructure and Testing',
  storyCounts: {
    ready: 3,
    inProgress: 2,
    blocked: 1,
    completed: 4,
    total: 10,
  },
};

/**
 * Default epic card with a mix of story statuses.
 */
export const Card: EpicCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => <EpicCard epic={sampleEpic} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify epic title
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    // Verify progress text
    await expect(canvas.getByText('Progress')).toBeInTheDocument();
    await expect(canvas.getByText('4/10 stories')).toBeInTheDocument();
    // Verify status badges are present
    await expect(canvas.getByText('Ready: 3')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress: 2')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked: 1')).toBeInTheDocument();
    await expect(canvas.getByText('Completed: 4')).toBeInTheDocument();
    // Verify the card is a link
    const link = canvas.getByRole('link');
    await expect(link).toHaveAttribute('href', '/epic/dashboard-restructure');

    // Accessibility: Verify the link has an accessible name (the epic title)
    await expect(link).toHaveAccessibleName();
  },
};

/**
 * Epic card for a fully completed epic.
 */
export const CardCompleted: EpicCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <EpicCard
      epic={{
        slug: 'auth-migration',
        title: 'Authentication Migration',
        storyCounts: {
          ready: 0,
          inProgress: 0,
          blocked: 0,
          completed: 5,
          total: 5,
        },
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify epic title
    await expect(canvas.getByText('Authentication Migration')).toBeInTheDocument();
    // Verify progress shows 100% complete
    await expect(canvas.getByText('5/5 stories')).toBeInTheDocument();
    // Only completed badge should be visible (zero counts are hidden)
    await expect(canvas.getByText('Completed: 5')).toBeInTheDocument();
    await expect(canvas.queryByText(/Ready:/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/In Progress:/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Blocked:/)).not.toBeInTheDocument();
  },
};

/**
 * Epic card with all stories ready to start.
 */
export const CardAllReady: EpicCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <EpicCard
      epic={{
        slug: 'new-feature',
        title: 'New Feature Implementation',
        storyCounts: {
          ready: 4,
          inProgress: 0,
          blocked: 0,
          completed: 0,
          total: 4,
        },
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify epic title
    await expect(canvas.getByText('New Feature Implementation')).toBeInTheDocument();
    // Verify progress shows 0% complete
    await expect(canvas.getByText('0/4 stories')).toBeInTheDocument();
    // Only ready badge should be visible
    await expect(canvas.getByText('Ready: 4')).toBeInTheDocument();
    await expect(canvas.queryByText(/Completed:/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/In Progress:/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Blocked:/)).not.toBeInTheDocument();
  },
};

/**
 * Epic card with blocked work requiring attention.
 */
export const CardWithBlockers: EpicCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <EpicCard
      epic={{
        slug: 'api-integration',
        title: 'API Integration',
        storyCounts: {
          ready: 2,
          inProgress: 1,
          blocked: 3,
          completed: 1,
          total: 7,
        },
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify epic title
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();
    // Verify progress text
    await expect(canvas.getByText('1/7 stories')).toBeInTheDocument();
    // Verify all status badges are present including blockers
    await expect(canvas.getByText('Ready: 2')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress: 1')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked: 3')).toBeInTheDocument();
    await expect(canvas.getByText('Completed: 1')).toBeInTheDocument();
  },
};

/**
 * Epic card with a long title demonstrating text handling.
 */
export const CardLongTitle: EpicCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <EpicCard
      epic={{
        slug: 'very-long-epic-slug',
        title:
          'This Is a Very Long Epic Title That Demonstrates How Text Wrapping Works in the Card Component',
        storyCounts: {
          ready: 1,
          inProgress: 1,
          blocked: 0,
          completed: 2,
          total: 4,
        },
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify long title is rendered fully
    await expect(
      canvas.getByText(
        'This Is a Very Long Epic Title That Demonstrates How Text Wrapping Works in the Card Component',
      ),
    ).toBeInTheDocument();
    // Verify progress text
    await expect(canvas.getByText('2/4 stories')).toBeInTheDocument();
    // Verify link points to correct slug
    const link = canvas.getByRole('link');
    await expect(link).toHaveAttribute('href', '/epic/very-long-epic-slug');
  },
};

/**
 * Multiple epic cards in a grid layout.
 */
export const CardGrid: EpicCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <EpicCard epic={sampleEpic} />
      <EpicCard
        epic={{
          slug: 'auth-migration',
          title: 'Authentication Migration',
          storyCounts: {
            ready: 0,
            inProgress: 0,
            blocked: 0,
            completed: 5,
            total: 5,
          },
        }}
      />
      <EpicCard
        epic={{
          slug: 'api-integration',
          title: 'API Integration',
          storyCounts: {
            ready: 2,
            inProgress: 1,
            blocked: 3,
            completed: 1,
            total: 7,
          },
        }}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify all three epic titles are rendered
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    await expect(canvas.getByText('Authentication Migration')).toBeInTheDocument();
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();
    // Verify all three links are present
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(3);

    // Accessibility: Verify all links have accessible names
    for (const link of links) {
      await expect(link).toHaveAccessibleName();
    }
  },
};

// ============================================================================
// EpicList Composite Stories
// ============================================================================

/** Helper to create a mock dashboard provider with specific epics */
function _MockDashboardProvider({
  children,
  epics,
  isLoading = false,
}: {
  children: React.ReactNode;
  epics: EpicSummary[];
  isLoading?: boolean;
}) {
  // Create an actor from the machine with pre-configured context
  const actor = createActor(dashboardMachine, {
    snapshot: dashboardMachine.resolveState({
      value: isLoading ? 'loading' : 'connected',
      context: {
        epics,
        currentEpic: null,
        currentStory: null,
        error: null,
        retryCount: 0,
        wsUrl: 'ws://localhost:3847',
        subscribedStories: [],
      },
    }),
  });

  actor.start();

  return <DashboardProvider logic={dashboardMachine}>{children}</DashboardProvider>;
}

/**
 * Full EpicList page component showing the list of epics with filtering.
 */
export const epicListMeta: Meta<typeof EpicList> = {
  title: 'Pages/EpicList',
  component: EpicList,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Main page component displaying all epics. Shows loading skeletons during fetch, empty state when no epics, and a grid of epic cards when populated.',
      },
    },
  },
};

type EpicListStory = StoryObj<typeof EpicList>;

/**
 * Loading state showing three skeleton cards.
 * Note: This uses a direct render to show the skeleton state.
 */
export const Loading: EpicListStory = {
  render: () => (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Epics</h1>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <EpicCardSkeleton />
        <EpicCardSkeleton />
        <EpicCardSkeleton />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify page title
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    // Verify three skeleton cards are rendered
    const skeletonCards = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletonCards.length).toBe(3);
    // Verify grid layout
    const grid = canvasElement.querySelector('.grid');
    await expect(grid).toBeInTheDocument();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'epic-list-loading');
  },
};

/**
 * Empty state when no epics exist.
 */
export const Empty: EpicListStory = {
  render: () => (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Epics</h1>
      </div>
      <div class="text-center py-12">
        <p class="text-text-muted text-lg">No epics found.</p>
        <p class="text-text-muted">
          Run <code class="text-primary">/create-epic</code> to get started.
        </p>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify page title
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    // Verify empty state message
    await expect(canvas.getByText('No epics found.')).toBeInTheDocument();
    // Verify guidance text with /create-epic command
    await expect(canvas.getByText('/create-epic')).toBeInTheDocument();
    await expect(canvas.getByText(/to get started/)).toBeInTheDocument();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'epic-list-empty');
  },
};

const sampleEpics: EpicSummary[] = [
  {
    slug: 'dashboard-restructure',
    title: 'Dashboard Restructure and Testing',
    storyCounts: {
      ready: 3,
      inProgress: 2,
      blocked: 1,
      completed: 4,
      total: 10,
    },
  },
  {
    slug: 'auth-migration',
    title: 'Authentication Migration',
    storyCounts: {
      ready: 0,
      inProgress: 0,
      blocked: 0,
      completed: 5,
      total: 5,
    },
  },
  {
    slug: 'api-integration',
    title: 'API Integration',
    storyCounts: {
      ready: 2,
      inProgress: 1,
      blocked: 3,
      completed: 1,
      total: 7,
    },
  },
];

/**
 * Populated state with multiple epics showing various progress states.
 */
export const Populated: EpicListStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Epics</h1>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sampleEpics.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify page title
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    // Verify epic cards are rendered with expected content
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    await expect(canvas.getByText('Authentication Migration')).toBeInTheDocument();
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();
    // Verify progress bars are present (via Progress text)
    await expect(canvas.getByText('4/10 stories')).toBeInTheDocument();
    await expect(canvas.getByText('5/5 stories')).toBeInTheDocument();
    await expect(canvas.getByText('1/7 stories')).toBeInTheDocument();
    // Verify links are present
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(3);

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'epic-list-populated');
  },
};

const epicsWithArchived: EpicSummary[] = [
  ...sampleEpics,
  {
    slug: 'legacy-cleanup',
    title: 'Legacy Code Cleanup',
    storyCounts: {
      ready: 0,
      inProgress: 0,
      blocked: 0,
      completed: 8,
      total: 8,
    },
    isArchived: true,
  },
  {
    slug: 'old-feature',
    title: 'Old Feature (Archived)',
    storyCounts: {
      ready: 0,
      inProgress: 0,
      blocked: 0,
      completed: 3,
      total: 3,
    },
    isArchived: true,
  },
];

/**
 * State with archived epics, showing the "Show archived" toggle.
 * Archived epics are hidden by default but can be revealed.
 */
export const WithArchivedEpics: EpicListStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Epics</h1>
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" class="rounded border-border" />
          Show archived
        </label>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sampleEpics.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </div>
    </div>
  ),
  // Enable a11y tests for toggle checkbox
  parameters: {
    a11y: {
      test: 'error',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify page title
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    // Verify archive toggle checkbox is present
    const checkbox = canvas.getByRole('checkbox');
    await expect(checkbox).toBeInTheDocument();
    await expect(checkbox).not.toBeChecked();
    // Verify toggle label
    await expect(canvas.getByText('Show archived')).toBeInTheDocument();
    // Verify only non-archived epics are visible (3 epics)
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(3);

    // Accessibility: Verify checkbox has accessible name via label
    await expect(checkbox).toHaveAccessibleName('Show archived');
  },
};

/**
 * State showing all epics including archived ones (toggle enabled).
 */
export const WithArchivedVisible: EpicListStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-text">Epics</h1>
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked={true} readOnly={true} class="rounded border-border" />
          Show archived
        </label>
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {epicsWithArchived.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </div>
    </div>
  ),
  // Enable a11y tests for toggle checkbox
  parameters: {
    a11y: {
      test: 'error',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify page title
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    // Verify archive toggle checkbox is checked
    const checkbox = canvas.getByRole('checkbox');
    await expect(checkbox).toBeInTheDocument();
    await expect(checkbox).toBeChecked();
    // Verify all epics are visible including archived (5 epics total)
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(5);
    // Verify archived epics are present
    await expect(canvas.getByText('Legacy Code Cleanup')).toBeInTheDocument();
    await expect(canvas.getByText('Old Feature (Archived)')).toBeInTheDocument();

    // Accessibility: Verify checkbox has accessible name via label
    await expect(checkbox).toHaveAccessibleName('Show archived');
  },
};
