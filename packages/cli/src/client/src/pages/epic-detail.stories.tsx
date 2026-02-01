import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link } from 'react-router';
import { expect, within } from 'storybook/test';
import { EpicContent } from '@/components/EpicContent';
import { Progress } from '@/components/ui/progress';
import { PageWrapper } from '@/test-utils/storybook-page-wrapper';
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot';
import type { StoryDetail as StoryDetailType } from '@/types/dashboard';
import { EpicDetail, HeaderSkeleton, StoryCard, StoryCardSkeleton } from './EpicDetail.tsx';

// ============================================================================
// Constants
// ============================================================================

/** Number of skeleton cards in grid */
const SKELETON_CARD_COUNT = 3;

/** Number of story cards in grid */
const STORY_CARD_COUNT = 4;

/** Number of completed stories in AllCompleted story */
const COMPLETED_STORY_COUNT = 3;

/** Regex pattern for matching error message about non-existent epic */
const NON_EXISTENT_EPIC_PATTERN = /The epic "non-existent-epic" does not exist/;

/** Regex pattern for matching "back to epic list" link text (case insensitive) */
const BACK_TO_EPIC_LIST_PATTERN = /back to epic list/i;

// ============================================================================
// Sample Data
// ============================================================================

const sampleStories: StoryDetailType[] = [
  {
    slug: 'storybook-setup',
    title: 'Storybook Setup and Component Stories',
    status: 'inProgress',
    epicSlug: 'dashboard-restructure',
    tasks: [
      { id: 't1', title: 'Install Storybook', status: 'completed' },
      { id: 't2', title: 'Configure Tailwind', status: 'completed' },
      { id: 't3', title: 'Create Layout stories', status: 'completed' },
      { id: 't4', title: 'Create page stories', status: 'inProgress' },
      { id: 't5', title: 'Verify build', status: 'pending' },
    ],
    journal: [],
  },
  {
    slug: 'visual-regression',
    title: 'Visual Regression Testing',
    status: 'blocked',
    epicSlug: 'dashboard-restructure',
    tasks: [
      { id: 't1', title: 'Research tools', status: 'completed' },
      { id: 't2', title: 'Configure chromatic', status: 'inProgress' },
      { id: 't3', title: 'Add snapshots', status: 'pending' },
    ],
    journal: [],
  },
  {
    slug: 'playwright-integration',
    title: 'Playwright Integration Tests',
    status: 'ready',
    epicSlug: 'dashboard-restructure',
    tasks: [
      { id: 't1', title: 'Install Playwright', status: 'pending' },
      { id: 't2', title: 'Write component tests', status: 'pending' },
      { id: 't3', title: 'Add CI integration', status: 'pending' },
    ],
    journal: [],
  },
  {
    slug: 'flatten-package',
    title: 'Flatten Dashboard Package Structure',
    status: 'completed',
    epicSlug: 'dashboard-restructure',
    tasks: [
      { id: 't1', title: 'Move files', status: 'completed' },
      { id: 't2', title: 'Update imports', status: 'completed' },
      { id: 't3', title: 'Verify build', status: 'completed' },
    ],
    journal: [],
  },
];

const sampleEpicContent = `# Dashboard Restructure Epic

This epic covers the complete restructuring of the SAGA dashboard to improve usability and add new features.

## Goals

- Improve navigation with breadcrumbs
- Add epic content display with markdown rendering
- Implement session management UI
- Add visual regression testing

## Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript |
| Styling | TailwindCSS |
| Components | Radix UI |
| Testing | Vitest + Playwright |
`;

// ============================================================================
// Meta Definition
// ============================================================================

/**
 * Full EpicDetail page component showing an epic's stories.
 */
const meta: Meta<typeof EpicDetail> = {
  title: 'Pages/EpicDetail',
  component: EpicDetail,
  decorators: [
    (Story) => (
      <PageWrapper route="/epic/dashboard-restructure">
        <Story />
      </PageWrapper>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Main page component displaying epic details and its stories. Shows loading skeletons during fetch, 404 for missing epics, error states, and populated view with story cards.',
      },
    },
  },
};

type EpicDetailStory = StoryObj<typeof EpicDetail>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Showcase displaying all EpicDetail page states.
 *
 * Demonstrates the different states the page can be in:
 * - Loading: Shows skeleton placeholders while data is fetched
 * - Not Found: 404 state when epic doesn't exist
 * - Error: When fetching fails
 * - Empty: Epic exists but has no stories
 * - Populated: Epic with stories in various statuses
 * - All Completed: 100% progress state
 * - With Blockers: Highlighting blocked stories
 */
export const Showcase: EpicDetailStory = {
  render: () => (
    <div className="space-y-12">
      {/* Loading State */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
          Loading State
        </h3>
        <div className="space-y-6">
          <HeaderSkeleton />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StoryCardSkeleton />
            <StoryCardSkeleton />
            <StoryCardSkeleton />
          </div>
        </div>
      </section>

      {/* Not Found State */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
          Not Found (404)
        </h3>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-text mb-2">Epic not found</h1>
          <p className="text-text-muted mb-4">
            The epic &quot;non-existent-epic&quot; does not exist.
          </p>
          <Link to="/" className="text-primary hover:underline">
            ← Back to epic list
          </Link>
        </div>
      </section>

      {/* Empty State */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
          Empty State
        </h3>
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-text">Dashboard Restructure and Testing</h1>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Progress</span>
                <span className="text-text-muted">0/0 stories completed</span>
              </div>
              <Progress value={0} />
            </div>
          </div>
          <div className="text-center py-12">
            <p className="text-text-muted text-lg">No stories in this epic.</p>
            <p className="text-text-muted">
              Run <code className="text-primary">/generate-stories</code> to create stories.
            </p>
          </div>
        </div>
      </section>

      {/* Populated State */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-text border-b border-border pb-2">
          Populated State
        </h3>
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-text">Dashboard Restructure and Testing</h1>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Progress</span>
                <span className="text-text-muted">1/4 stories completed</span>
              </div>
              <Progress value={25} />
            </div>
          </div>
          <EpicContent content={sampleEpicContent} />
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text">Stories</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sampleStories.map((story) => (
                <StoryCard key={story.slug} story={story} epicSlug="dashboard-restructure" />
              ))}
            </div>
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

    // Verify section headings
    await expect(canvas.getByText('Loading State')).toBeInTheDocument();
    await expect(canvas.getByText('Not Found (404)')).toBeInTheDocument();
    await expect(canvas.getByText('Empty State')).toBeInTheDocument();
    await expect(canvas.getByText('Populated State')).toBeInTheDocument();

    // Verify loading skeletons
    const skeletons = canvas.getAllByTestId('story-card-skeleton');
    await expect(skeletons.length).toBe(SKELETON_CARD_COUNT);

    // Verify not found state
    await expect(canvas.getByText('Epic not found')).toBeInTheDocument();
    await expect(canvas.getByText(NON_EXISTENT_EPIC_PATTERN)).toBeInTheDocument();

    // Verify empty state
    await expect(canvas.getByText('No stories in this epic.')).toBeInTheDocument();
    await expect(canvas.getByText('/generate-stories')).toBeInTheDocument();

    // Verify populated state story cards
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();
    await expect(canvas.getByText('Visual Regression Testing')).toBeInTheDocument();

    // Visual snapshot
    await matchCanvasSnapshot(canvasElement, 'epic-detail-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring EpicDetail page states.
 *
 * Currently shows the populated state with stories. In a real application,
 * this page fetches data from an API based on the route parameter.
 */
export const Playground: EpicDetailStory = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text">Dashboard Restructure and Testing</h1>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Progress</span>
            <span className="text-text-muted">1/4 stories completed</span>
          </div>
          <Progress value={25} />
        </div>
      </div>
      <EpicContent content={sampleEpicContent} />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text">Stories</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleStories.map((story) => (
            <StoryCard key={story.slug} story={story} epicSlug="dashboard-restructure" />
          ))}
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();

    // Verify epic title
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    // Verify progress text
    await expect(canvas.getByText('1/4 stories completed')).toBeInTheDocument();
    // Verify story cards - filter by href to exclude breadcrumb links
    const storyLinks = canvas
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('/story/'));
    await expect(storyLinks.length).toBe(STORY_CARD_COUNT);
  },
};

// ============================================================================
// Individual Page State Stories (for visual regression testing)
// ============================================================================

/**
 * Loading state showing header and story card skeletons.
 */
export const Loading: EpicDetailStory = {
  render: () => (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StoryCardSkeleton />
        <StoryCardSkeleton />
        <StoryCardSkeleton />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    // Verify loading skeletons
    const headerSkeleton = canvas.getByTestId('epic-header-skeleton');
    await expect(headerSkeleton).toBeInTheDocument();
    await expect(headerSkeleton).toHaveClass('animate-pulse');
    const storySkeletons = canvas.getAllByTestId('story-card-skeleton');
    await expect(storySkeletons.length).toBe(SKELETON_CARD_COUNT);
    await matchCanvasSnapshot(canvasElement, 'epic-detail-loading');
  },
};

/**
 * 404 state when epic is not found.
 */
export const NotFound: EpicDetailStory = {
  render: () => (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-text mb-2">Epic not found</h1>
      <p className="text-text-muted mb-4">The epic &quot;non-existent-epic&quot; does not exist.</p>
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
    // Verify not found state
    await expect(canvas.getByText('Epic not found')).toBeInTheDocument();
    await expect(canvas.getByText(NON_EXISTENT_EPIC_PATTERN)).toBeInTheDocument();
    // Filter by explicit back link (not breadcrumb)
    const backLinks = canvas
      .getAllByRole('link')
      .filter((link) => BACK_TO_EPIC_LIST_PATTERN.test(link.textContent || ''));
    await expect(backLinks.length).toBeGreaterThanOrEqual(1);
    await expect(backLinks[0]).toHaveAttribute('href', '/');
    await matchCanvasSnapshot(canvasElement, 'epic-detail-not-found');
  },
};

/**
 * Error state when fetching fails.
 */
export const ErrorState: EpicDetailStory = {
  render: () => (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-danger mb-2">Error</h1>
      <p className="text-text-muted mb-4">Failed to load epic</p>
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
    // Verify error state
    const errorHeading = canvas.getByText('Error');
    await expect(errorHeading).toBeInTheDocument();
    await expect(errorHeading).toHaveClass('text-danger');
    await expect(canvas.getByText('Failed to load epic')).toBeInTheDocument();
    // Filter by explicit back link (not breadcrumb)
    const backLinks = canvas
      .getAllByRole('link')
      .filter((link) => BACK_TO_EPIC_LIST_PATTERN.test(link.textContent || ''));
    await expect(backLinks.length).toBeGreaterThanOrEqual(1);
  },
};

/**
 * Empty state when epic has no stories.
 */
export const Empty: EpicDetailStory = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text">Dashboard Restructure and Testing</h1>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Progress</span>
            <span className="text-text-muted">0/0 stories completed</span>
          </div>
          <Progress value={0} />
        </div>
      </div>
      <div className="text-center py-12">
        <p className="text-text-muted text-lg">No stories in this epic.</p>
        <p className="text-text-muted">
          Run <code className="text-primary">/generate-stories</code> to create stories.
        </p>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    // Verify empty state content
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    await expect(canvas.getByText('0/0 stories completed')).toBeInTheDocument();
    await expect(canvas.getByText('No stories in this epic.')).toBeInTheDocument();
    await expect(canvas.getByText('/generate-stories')).toBeInTheDocument();
    await matchCanvasSnapshot(canvasElement, 'epic-detail-empty');
  },
};

/**
 * Populated state with multiple stories showing various statuses.
 */
export const Populated: EpicDetailStory = {
  render: () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-text">Dashboard Restructure and Testing</h1>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Progress</span>
            <span className="text-text-muted">1/4 stories completed</span>
          </div>
          <Progress value={25} />
        </div>
      </div>
      <EpicContent content={sampleEpicContent} />
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text">Stories</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleStories.map((story) => (
            <StoryCard key={story.slug} story={story} epicSlug="dashboard-restructure" />
          ))}
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    // Verify populated state content
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    await expect(canvas.getByText('1/4 stories completed')).toBeInTheDocument();
    await expect(canvas.getByTestId('epic-content')).toBeInTheDocument();
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();
    await expect(canvas.getByText('Visual Regression Testing')).toBeInTheDocument();
    await expect(canvas.getByText('Playwright Integration Tests')).toBeInTheDocument();
    await expect(canvas.getByText('Flatten Dashboard Package Structure')).toBeInTheDocument();
    // Filter by story links (not breadcrumb links)
    const storyLinks = canvas
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('/story/'));
    await expect(storyLinks.length).toBe(STORY_CARD_COUNT);
    await matchCanvasSnapshot(canvasElement, 'epic-detail-populated');
  },
};

/**
 * Epic with all completed stories (100% progress).
 */
export const AllCompleted: EpicDetailStory = {
  render: () => {
    const completedStories: StoryDetailType[] = [
      {
        slug: 'setup',
        title: 'Project Setup',
        status: 'completed',
        epicSlug: 'auth-migration',
        tasks: [
          { id: 't1', title: 'Init', status: 'completed' },
          { id: 't2', title: 'Config', status: 'completed' },
        ],
        journal: [],
      },
      {
        slug: 'migration',
        title: 'Database Migration',
        status: 'completed',
        epicSlug: 'auth-migration',
        tasks: [
          { id: 't1', title: 'Schema', status: 'completed' },
          { id: 't2', title: 'Data', status: 'completed' },
        ],
        journal: [],
      },
      {
        slug: 'testing',
        title: 'Integration Testing',
        status: 'completed',
        epicSlug: 'auth-migration',
        tasks: [
          { id: 't1', title: 'Unit tests', status: 'completed' },
          { id: 't2', title: 'E2E tests', status: 'completed' },
        ],
        journal: [],
      },
    ];

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-text">Authentication Migration</h1>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Progress</span>
              <span className="text-text-muted">3/3 stories completed</span>
            </div>
            <Progress value={100} />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Stories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedStories.map((story) => (
              <StoryCard key={story.slug} story={story} epicSlug="auth-migration" />
            ))}
          </div>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    // Verify all completed state
    await expect(canvas.getByText('Authentication Migration')).toBeInTheDocument();
    await expect(canvas.getByText('3/3 stories completed')).toBeInTheDocument();
    await expect(canvas.getByText('Project Setup')).toBeInTheDocument();
    await expect(canvas.getByText('Database Migration')).toBeInTheDocument();
    await expect(canvas.getByText('Integration Testing')).toBeInTheDocument();
    const completedBadges = canvas.getAllByText('Completed');
    await expect(completedBadges.length).toBe(COMPLETED_STORY_COUNT);
  },
};

/**
 * Epic with multiple blocked stories requiring attention.
 */
export const WithBlockers: EpicDetailStory = {
  render: () => {
    const blockedStories: StoryDetailType[] = [
      {
        slug: 'api-design',
        title: 'API Design',
        status: 'blocked',
        epicSlug: 'api-integration',
        tasks: [
          { id: 't1', title: 'Define schema', status: 'completed' },
          { id: 't2', title: 'Review with team', status: 'inProgress' },
        ],
        journal: [],
      },
      {
        slug: 'auth-endpoint',
        title: 'Authentication Endpoint',
        status: 'blocked',
        epicSlug: 'api-integration',
        tasks: [
          { id: 't1', title: 'Implement', status: 'inProgress' },
          { id: 't2', title: 'Add tests', status: 'pending' },
        ],
        journal: [],
      },
      {
        slug: 'data-endpoint',
        title: 'Data Endpoint',
        status: 'inProgress',
        epicSlug: 'api-integration',
        tasks: [
          { id: 't1', title: 'Implement CRUD', status: 'completed' },
          { id: 't2', title: 'Add validation', status: 'inProgress' },
        ],
        journal: [],
      },
      {
        slug: 'docs',
        title: 'API Documentation',
        status: 'ready',
        epicSlug: 'api-integration',
        tasks: [
          { id: 't1', title: 'Write docs', status: 'pending' },
          { id: 't2', title: 'Add examples', status: 'pending' },
        ],
        journal: [],
      },
    ];

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-text">API Integration</h1>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Progress</span>
              <span className="text-text-muted">0/4 stories completed</span>
            </div>
            <Progress value={0} />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Stories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {blockedStories.map((story) => (
              <StoryCard key={story.slug} story={story} epicSlug="api-integration" />
            ))}
          </div>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify Layout header with SAGA Dashboard
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    // Verify blocked stories state
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();
    await expect(canvas.getByText('0/4 stories completed')).toBeInTheDocument();
    await expect(canvas.getByText('API Design')).toBeInTheDocument();
    await expect(canvas.getByText('Authentication Endpoint')).toBeInTheDocument();
    await expect(canvas.getByText('Data Endpoint')).toBeInTheDocument();
    await expect(canvas.getByText('API Documentation')).toBeInTheDocument();
    const blockedBadges = canvas.getAllByText('Blocked');
    await expect(blockedBadges.length).toBe(2);
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    await expect(canvas.getByText('Ready')).toBeInTheDocument();
  },
};

export default meta;
