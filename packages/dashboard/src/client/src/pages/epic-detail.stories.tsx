import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link } from 'react-router';
import { expect, within } from 'storybook/test';
import { EpicContent } from '@/components/EpicContent';
import { Progress } from '@/components/ui/progress';
import { PageWrapper } from '@/test-utils/storybook-page-wrapper';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';
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
    id: 'storybook-setup',
    title: 'Storybook Setup and Component Stories',
    description: 'Set up Storybook for component development.',
    status: 'inProgress',
    epic: 'dashboard-restructure',
    tasks: [
      {
        id: 't1',
        subject: 'Install Storybook',
        description: '',
        status: 'completed',
        blockedBy: [],
      },
      {
        id: 't2',
        subject: 'Configure Tailwind',
        description: '',
        status: 'completed',
        blockedBy: [],
      },
      {
        id: 't3',
        subject: 'Create Layout stories',
        description: '',
        status: 'completed',
        blockedBy: [],
      },
      {
        id: 't4',
        subject: 'Create page stories',
        description: '',
        status: 'inProgress',
        blockedBy: [],
      },
      { id: 't5', subject: 'Verify build', description: '', status: 'pending', blockedBy: [] },
    ],
    journal: [],
  },
  {
    id: 'visual-regression',
    title: 'Visual Regression Testing',
    description: 'Add visual regression testing.',
    status: 'inProgress',
    epic: 'dashboard-restructure',
    tasks: [
      { id: 't1', subject: 'Research tools', description: '', status: 'completed', blockedBy: [] },
      {
        id: 't2',
        subject: 'Configure chromatic',
        description: '',
        status: 'inProgress',
        blockedBy: [],
      },
      { id: 't3', subject: 'Add snapshots', description: '', status: 'pending', blockedBy: [] },
    ],
    journal: [],
  },
  {
    id: 'playwright-integration',
    title: 'Playwright Integration Tests',
    description: 'Integration tests with Playwright.',
    status: 'pending',
    epic: 'dashboard-restructure',
    tasks: [
      {
        id: 't1',
        subject: 'Install Playwright',
        description: '',
        status: 'pending',
        blockedBy: [],
      },
      {
        id: 't2',
        subject: 'Write component tests',
        description: '',
        status: 'pending',
        blockedBy: [],
      },
      {
        id: 't3',
        subject: 'Add CI integration',
        description: '',
        status: 'pending',
        blockedBy: [],
      },
    ],
    journal: [],
  },
  {
    id: 'flatten-package',
    title: 'Flatten Dashboard Package Structure',
    description: 'Flatten the package structure.',
    status: 'completed',
    epic: 'dashboard-restructure',
    tasks: [
      { id: 't1', subject: 'Move files', description: '', status: 'completed', blockedBy: [] },
      { id: 't2', subject: 'Update imports', description: '', status: 'completed', blockedBy: [] },
      { id: 't3', subject: 'Verify build', description: '', status: 'completed', blockedBy: [] },
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
                <StoryCard key={story.id} story={story} />
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

    // Visual snapshots
    await matchDomSnapshot(canvasElement, 'epic-detail-showcase');
    await matchPixelSnapshot(canvasElement, 'epic-detail-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

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
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    await expect(canvas.getByText('1/4 stories completed')).toBeInTheDocument();
    const storyLinks = canvas
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('/story/'));
    await expect(storyLinks.length).toBe(STORY_CARD_COUNT);
  },
};

// ============================================================================
// Individual Page State Stories
// ============================================================================

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
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    const headerSkeleton = canvas.getByTestId('epic-header-skeleton');
    await expect(headerSkeleton).toBeInTheDocument();
    await expect(headerSkeleton).toHaveClass('animate-pulse');
    const storySkeletons = canvas.getAllByTestId('story-card-skeleton');
    await expect(storySkeletons.length).toBe(SKELETON_CARD_COUNT);
    await matchDomSnapshot(canvasElement, 'epic-detail-loading');
    await matchPixelSnapshot(canvasElement, 'epic-detail-loading');
  },
};

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
  parameters: { a11y: { test: 'error' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    await expect(canvas.getByText('Epic not found')).toBeInTheDocument();
    await expect(canvas.getByText(NON_EXISTENT_EPIC_PATTERN)).toBeInTheDocument();
    const backLinks = canvas
      .getAllByRole('link')
      .filter((link) => BACK_TO_EPIC_LIST_PATTERN.test(link.textContent || ''));
    await expect(backLinks.length).toBeGreaterThanOrEqual(1);
    await expect(backLinks[0]).toHaveAttribute('href', '/');
    await matchDomSnapshot(canvasElement, 'epic-detail-not-found');
    await matchPixelSnapshot(canvasElement, 'epic-detail-not-found');
  },
};

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
  parameters: { a11y: { test: 'error' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    const errorHeading = canvas.getByText('Error');
    await expect(errorHeading).toBeInTheDocument();
    await expect(errorHeading).toHaveClass('text-danger');
    await expect(canvas.getByText('Failed to load epic')).toBeInTheDocument();
    const backLinks = canvas
      .getAllByRole('link')
      .filter((link) => BACK_TO_EPIC_LIST_PATTERN.test(link.textContent || ''));
    await expect(backLinks.length).toBeGreaterThanOrEqual(1);
  },
};

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
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    await expect(canvas.getByText('0/0 stories completed')).toBeInTheDocument();
    await expect(canvas.getByText('No stories in this epic.')).toBeInTheDocument();
    await expect(canvas.getByText('/generate-stories')).toBeInTheDocument();
    await matchDomSnapshot(canvasElement, 'epic-detail-empty');
    await matchPixelSnapshot(canvasElement, 'epic-detail-empty');
  },
};

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
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    await expect(canvas.getByText('1/4 stories completed')).toBeInTheDocument();
    await expect(canvas.getByTestId('epic-content')).toBeInTheDocument();
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();
    await expect(canvas.getByText('Visual Regression Testing')).toBeInTheDocument();
    await expect(canvas.getByText('Playwright Integration Tests')).toBeInTheDocument();
    await expect(canvas.getByText('Flatten Dashboard Package Structure')).toBeInTheDocument();
    const storyLinks = canvas
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.includes('/story/'));
    await expect(storyLinks.length).toBe(STORY_CARD_COUNT);
    await matchDomSnapshot(canvasElement, 'epic-detail-populated');
    await matchPixelSnapshot(canvasElement, 'epic-detail-populated');
  },
};

export const AllCompleted: EpicDetailStory = {
  render: () => {
    const completedStories: StoryDetailType[] = [
      {
        id: 'setup',
        title: 'Project Setup',
        description: 'Set up the project.',
        status: 'completed',
        epic: 'auth-migration',
        tasks: [
          { id: 't1', subject: 'Init', description: '', status: 'completed', blockedBy: [] },
          { id: 't2', subject: 'Config', description: '', status: 'completed', blockedBy: [] },
        ],
        journal: [],
      },
      {
        id: 'migration',
        title: 'Database Migration',
        description: 'Migrate the database.',
        status: 'completed',
        epic: 'auth-migration',
        tasks: [
          { id: 't1', subject: 'Schema', description: '', status: 'completed', blockedBy: [] },
          { id: 't2', subject: 'Data', description: '', status: 'completed', blockedBy: [] },
        ],
        journal: [],
      },
      {
        id: 'testing',
        title: 'Integration Testing',
        description: 'Integration tests.',
        status: 'completed',
        epic: 'auth-migration',
        tasks: [
          { id: 't1', subject: 'Unit tests', description: '', status: 'completed', blockedBy: [] },
          { id: 't2', subject: 'E2E tests', description: '', status: 'completed', blockedBy: [] },
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
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('SAGA')).toBeInTheDocument();
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    await expect(canvas.getByText('Authentication Migration')).toBeInTheDocument();
    await expect(canvas.getByText('3/3 stories completed')).toBeInTheDocument();
    await expect(canvas.getByText('Project Setup')).toBeInTheDocument();
    await expect(canvas.getByText('Database Migration')).toBeInTheDocument();
    await expect(canvas.getByText('Integration Testing')).toBeInTheDocument();
    const completedBadges = canvas.getAllByText('Completed');
    await expect(completedBadges.length).toBe(COMPLETED_STORY_COUNT);
  },
};

export default meta;
