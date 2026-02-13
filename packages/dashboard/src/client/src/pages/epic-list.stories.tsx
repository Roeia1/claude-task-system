import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { PageWrapper } from '@/test-utils/storybook-page-wrapper';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';
import type { EpicSummary } from '@/types/dashboard';
import { EpicCard, EpicCardSkeleton, EpicList } from './EpicList.tsx';

// ============================================================================
// Constants
// ============================================================================

/** Number of skeleton cards to show in loading state */
const SKELETON_GRID_COUNT = 3;
/** Number of active epics */
const ACTIVE_EPIC_COUNT = 3;

// Regex patterns
const TO_GET_STARTED_REGEX = /to get started/;

// ============================================================================
// Sample Data
// ============================================================================

const sampleEpics: EpicSummary[] = [
  {
    id: 'dashboard-restructure',
    title: 'Dashboard Restructure and Testing',
    description: 'Restructure the dashboard for better testing.',
    status: 'inProgress',
    storyCounts: {
      pending: 3,
      inProgress: 2,
      completed: 4,
      total: 10,
    },
  },
  {
    id: 'auth-migration',
    title: 'Authentication Migration',
    description: 'Migrate authentication to new system.',
    status: 'completed',
    storyCounts: {
      pending: 0,
      inProgress: 0,
      completed: 5,
      total: 5,
    },
  },
  {
    id: 'api-integration',
    title: 'API Integration',
    description: 'Integrate with external APIs.',
    status: 'inProgress',
    storyCounts: {
      pending: 2,
      inProgress: 1,
      completed: 1,
      total: 7,
    },
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
 */
const meta: Meta<typeof EpicList> = {
  title: 'Pages/EpicList',
  component: EpicList,
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
              <EpicCard key={epic.id} epic={epic} />
            ))}
          </div>
        </div>
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify section headers
    await expect(canvas.getByText('Loading State')).toBeInTheDocument();
    await expect(canvas.getByText('Empty State')).toBeInTheDocument();
    await expect(canvas.getByText('Populated State')).toBeInTheDocument();

    // Verify loading skeletons
    const skeletonCards = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletonCards.length).toBe(SKELETON_GRID_COUNT);

    // Verify empty state
    await expect(canvas.getByText('No epics found.')).toBeInTheDocument();
    await expect(canvas.getByText('/create-epic')).toBeInTheDocument();
    await expect(canvas.getByText(TO_GET_STARTED_REGEX)).toBeInTheDocument();

    // Verify populated state epic titles
    const dashboardTitles = canvas.getAllByText('Dashboard Restructure and Testing');
    await expect(dashboardTitles.length).toBeGreaterThanOrEqual(1);
    const authTitles = canvas.getAllByText('Authentication Migration');
    await expect(authTitles.length).toBeGreaterThanOrEqual(1);
    const apiTitles = canvas.getAllByText('API Integration');
    await expect(apiTitles.length).toBeGreaterThanOrEqual(1);

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'epic-list-showcase');
    await matchPixelSnapshot(canvasElement, 'epic-list-showcase');
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
      options: ['loading', 'empty', 'populated'],
      description: 'Page state to display',
    },
  },
  args: {
    // @ts-expect-error - Custom args for playground
    state: 'populated',
  },
  render: (args) => {
    // @ts-expect-error - Custom args for playground
    const state = args.state as string;

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

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text">Epics</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleEpics.map((epic) => (
            <EpicCard key={epic.id} epic={epic} />
          ))}
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify page title is always present (breadcrumb + page title)
    const epicTexts = canvas.getAllByText('Epics');
    await expect(epicTexts.length).toBeGreaterThan(0);
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
    // Verify header with SAGA Dashboard (from Layout)
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    // Verify page title and breadcrumb contain Epics
    const epicTexts = canvas.getAllByText('Epics');
    await expect(epicTexts.length).toBeGreaterThanOrEqual(1);
    // Verify skeleton cards
    const skeletonCards = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletonCards.length).toBe(SKELETON_GRID_COUNT);
    await matchDomSnapshot(canvasElement, 'epic-list-loading');
    await matchPixelSnapshot(canvasElement, 'epic-list-loading');
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
    // Verify header with SAGA Dashboard (from Layout)
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    // Verify page title and breadcrumb contain Epics
    const epicTexts = canvas.getAllByText('Epics');
    await expect(epicTexts.length).toBeGreaterThanOrEqual(1);
    // Verify empty state content
    await expect(canvas.getByText('No epics found.')).toBeInTheDocument();
    await expect(canvas.getByText('/create-epic')).toBeInTheDocument();
    await matchDomSnapshot(canvasElement, 'epic-list-empty');
    await matchPixelSnapshot(canvasElement, 'epic-list-empty');
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
          <EpicCard key={epic.id} epic={epic} />
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify header with SAGA Dashboard (from Layout)
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    // Verify page title and breadcrumb contain Epics
    const epicTexts = canvas.getAllByText('Epics');
    await expect(epicTexts.length).toBeGreaterThanOrEqual(1);
    // Verify epic card content
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    // Note: Links now include breadcrumb navigation, so check epic cards specifically
    const epicLinks = canvas
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/epic/'));
    await expect(epicLinks.length).toBe(ACTIVE_EPIC_COUNT);
    await matchDomSnapshot(canvasElement, 'epic-list-populated');
    await matchPixelSnapshot(canvasElement, 'epic-list-populated');
  },
};

// ============================================================================
// Exports
// ============================================================================

export default meta;
export { Showcase, Playground, Loading, Empty, Populated };
