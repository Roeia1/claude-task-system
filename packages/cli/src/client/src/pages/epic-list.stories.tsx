import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, within } from 'storybook/test';
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot';
import type { EpicSummary } from '@/types/dashboard';
import { EpicCard, EpicCardSkeleton, EpicList } from './EpicList.tsx';

// ============================================================================
// Constants
// ============================================================================

/** Number of skeleton cards to show in loading state */
const SKELETON_GRID_COUNT = 3;
/** Number of active epics (non-archived) */
const ACTIVE_EPIC_COUNT = 3;
/** Total epics including archived */
const TOTAL_EPICS_WITH_ARCHIVED = 5;

// Regex patterns
const TO_GET_STARTED_REGEX = /to get started/;

// ============================================================================
// Sample Data
// ============================================================================

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

// ============================================================================
// Story Meta
// ============================================================================

/**
 * Epic List page displaying all epics with filtering.
 *
 * Features:
 * - Loading skeleton state during fetch
 * - Empty state with guidance
 * - Grid of epic cards
 * - Archive toggle to show/hide archived epics
 */
const meta: Meta<typeof EpicList> = {
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

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Curated display of EpicList page states:
 * - Loading: Skeleton cards during fetch
 * - Empty: No epics with guidance message
 * - Populated: Grid of epic cards
 * - With archived: Toggle to show/hide archived epics
 */
const Showcase: Story = {
  render: () => (
    <div className="space-y-12">
      {/* Loading State */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-4">Loading State</h3>
        <div className="space-y-6 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text">Epics</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <EpicCardSkeleton />
            <EpicCardSkeleton />
            <EpicCardSkeleton />
          </div>
        </div>
      </section>

      {/* Empty State */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-4">Empty State</h3>
        <div className="space-y-6 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text">Epics</h1>
          </div>
          <div className="text-center py-12">
            <p className="text-text-muted text-lg">No epics found.</p>
            <p className="text-text-muted">
              Run <code className="text-primary">/create-epic</code> to get started.
            </p>
          </div>
        </div>
      </section>

      {/* Populated State */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-4">Populated State</h3>
        <div className="space-y-6 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text">Epics</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sampleEpics.map((epic) => (
              <EpicCard key={epic.slug} epic={epic} />
            ))}
          </div>
        </div>
      </section>

      {/* With Archive Toggle */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-4">With Archive Toggle</h3>
        <div className="space-y-6 border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text">Epics</h1>
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={true}
                readOnly={true}
                className="rounded border-border"
              />
              Show archived
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {epicsWithArchived.map((epic) => (
              <EpicCard key={epic.slug} epic={epic} />
            ))}
          </div>
        </div>
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify section headers
    await expect(canvas.getByText('Loading State')).toBeInTheDocument();
    await expect(canvas.getByText('Empty State')).toBeInTheDocument();
    await expect(canvas.getByText('Populated State')).toBeInTheDocument();
    await expect(canvas.getByText('With Archive Toggle')).toBeInTheDocument();

    // Verify loading skeletons
    const skeletonCards = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletonCards.length).toBe(SKELETON_GRID_COUNT);

    // Verify empty state
    await expect(canvas.getByText('No epics found.')).toBeInTheDocument();
    await expect(canvas.getByText('/create-epic')).toBeInTheDocument();
    await expect(canvas.getByText(TO_GET_STARTED_REGEX)).toBeInTheDocument();

    // Verify populated state epic titles (these appear in both Populated and With Archive sections)
    const dashboardTitles = canvas.getAllByText('Dashboard Restructure and Testing');
    await expect(dashboardTitles.length).toBeGreaterThanOrEqual(1);
    const authTitles = canvas.getAllByText('Authentication Migration');
    await expect(authTitles.length).toBeGreaterThanOrEqual(1);
    const apiTitles = canvas.getAllByText('API Integration');
    await expect(apiTitles.length).toBeGreaterThanOrEqual(1);

    // Verify archived epics (only in With Archive section)
    await expect(canvas.getByText('Legacy Code Cleanup')).toBeInTheDocument();
    await expect(canvas.getByText('Old Feature (Archived)')).toBeInTheDocument();

    // Verify archive checkbox
    const checkbox = canvas.getByRole('checkbox');
    await expect(checkbox).toBeInTheDocument();
    await expect(checkbox).toBeChecked();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'epic-list-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring EpicList page states.
 * Demonstrates different configurations of the epic list.
 */
const Playground: Story = {
  argTypes: {
    state: {
      control: 'select',
      options: ['loading', 'empty', 'populated', 'with-archived'],
      description: 'Page state to display',
    },
    showArchived: {
      control: 'boolean',
      description: 'Whether to show archived epics (when state is with-archived)',
    },
  },
  args: {
    // @ts-expect-error - Custom args for playground
    state: 'populated',
    showArchived: false,
  },
  render: (args) => {
    // @ts-expect-error - Custom args for playground
    const state = args.state as string;
    // @ts-expect-error - Custom args for playground
    const showArchived = args.showArchived as boolean;

    if (state === 'loading') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text">Epics</h1>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <EpicCardSkeleton />
            <EpicCardSkeleton />
            <EpicCardSkeleton />
          </div>
        </div>
      );
    }

    if (state === 'empty') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-text">Epics</h1>
          </div>
          <div className="text-center py-12">
            <p className="text-text-muted text-lg">No epics found.</p>
            <p className="text-text-muted">
              Run <code className="text-primary">/create-epic</code> to get started.
            </p>
          </div>
        </div>
      );
    }

    const epics = state === 'with-archived' && showArchived ? epicsWithArchived : sampleEpics;
    const hasArchivedToggle = state === 'with-archived';

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text">Epics</h1>
          {hasArchivedToggle && (
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                readOnly={true}
                className="rounded border-border"
              />
              Show archived
            </label>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {epics.map((epic) => (
            <EpicCard key={epic.slug} epic={epic} />
          ))}
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify page title is always present
    const titles = canvas.getAllByText('Epics');
    await expect(titles.length).toBeGreaterThan(0);
  },
};

// ============================================================================
// Individual State Stories (for visual regression testing)
// ============================================================================

/**
 * Loading state with skeleton cards.
 */
const Loading: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Epics</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <EpicCardSkeleton />
        <EpicCardSkeleton />
        <EpicCardSkeleton />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    const skeletonCards = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletonCards.length).toBe(SKELETON_GRID_COUNT);
    await matchCanvasSnapshot(canvasElement, 'epic-list-loading');
  },
};

/**
 * Empty state with guidance message.
 */
const Empty: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Epics</h1>
      </div>
      <div className="text-center py-12">
        <p className="text-text-muted text-lg">No epics found.</p>
        <p className="text-text-muted">
          Run <code className="text-primary">/create-epic</code> to get started.
        </p>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    await expect(canvas.getByText('No epics found.')).toBeInTheDocument();
    await expect(canvas.getByText('/create-epic')).toBeInTheDocument();
    await matchCanvasSnapshot(canvasElement, 'epic-list-empty');
  },
};

/**
 * Populated state with epic cards.
 */
const Populated: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Epics</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sampleEpics.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(ACTIVE_EPIC_COUNT);
    await matchCanvasSnapshot(canvasElement, 'epic-list-populated');
  },
};

/**
 * State with archived epics visible.
 */
const WithArchivedVisible: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Epics</h1>
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked={true} readOnly={true} className="rounded border-border" />
          Show archived
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {epicsWithArchived.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </div>
    </div>
  ),
  parameters: {
    a11y: {
      test: 'error',
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Epics')).toBeInTheDocument();
    const checkbox = canvas.getByRole('checkbox');
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toHaveAccessibleName('Show archived');
    await expect(canvas.getByText('Legacy Code Cleanup')).toBeInTheDocument();
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(TOTAL_EPICS_WITH_ARCHIVED);
  },
};

// ============================================================================
// Exports
// ============================================================================

export default meta;
export { Showcase, Playground, Loading, Empty, Populated, WithArchivedVisible };
