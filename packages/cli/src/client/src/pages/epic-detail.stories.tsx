import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link, MemoryRouter } from 'react-router';
import { expect, within } from 'storybook/test';
import { EpicContent } from '@/components/EpicContent';
import { Progress } from '@/components/ui/progress';
import { matchCanvasSnapshot } from '@/test-utils/visual-snapshot';
import type { StoryDetail as StoryDetailType } from '@/types/dashboard';
import {
  EpicDetail,
  HeaderSkeleton,
  StatusBadge,
  StoryCard,
  StoryCardSkeleton,
} from './EpicDetail.tsx';

// ============================================================================
// HeaderSkeleton Stories
// ============================================================================

/**
 * Skeleton loading component that displays an animated placeholder
 * for the epic header while data is being fetched.
 */
const headerSkeletonMeta: Meta<typeof HeaderSkeleton> = {
  title: 'Pages/EpicDetail/HeaderSkeleton',
  component: HeaderSkeleton,
  parameters: {
    docs: {
      description: {
        component:
          'Animated loading placeholder for the epic header area. Shows placeholders for title, progress bar, and story counts.',
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
    await expect(placeholders.length).toBeGreaterThanOrEqual(4);
  },
};

// ============================================================================
// StoryCardSkeleton Stories
// ============================================================================

/**
 * Skeleton loading component for story cards.
 */
export const storyCardSkeletonMeta: Meta<typeof StoryCardSkeleton> = {
  title: 'Pages/EpicDetail/StoryCardSkeleton',
  component: StoryCardSkeleton,
  parameters: {
    docs: {
      description: {
        component:
          'Animated loading placeholder for story cards. Displays during data fetch for the stories list.',
      },
    },
  },
};

type StoryCardSkeletonStory = StoryObj<typeof StoryCardSkeleton>;

/**
 * Default story card skeleton showing the animated loading state.
 */
export const CardSkeleton: StoryCardSkeletonStory = {
  render: () => <StoryCardSkeleton />,
  play: async ({ canvasElement }) => {
    // Verify animate-pulse class for loading animation
    const pulseContainer = canvasElement.querySelector('.animate-pulse');
    await expect(pulseContainer).toBeInTheDocument();
    // Verify bg-bg-light placeholder elements
    const placeholders = canvasElement.querySelectorAll('.bg-bg-light');
    await expect(placeholders.length).toBeGreaterThanOrEqual(2);
  },
};

/**
 * Multiple story card skeletons arranged in a grid, simulating the loading
 * state of the story list.
 */
export const CardSkeletonGrid: StoryCardSkeletonStory = {
  render: () => (
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StoryCardSkeleton />
      <StoryCardSkeleton />
      <StoryCardSkeleton />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Verify grid layout
    const grid = canvasElement.querySelector('.grid');
    await expect(grid).toBeInTheDocument();
    // Verify three skeleton cards
    const skeletonCards = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletonCards.length).toBe(3);
  },
};

// ============================================================================
// StatusBadge Stories (EpicDetail variant - no count)
// ============================================================================

/**
 * Status badge component that displays story status with appropriate
 * color coding (without count, unlike EpicList's StatusBadge).
 */
export const statusBadgeMeta: Meta<typeof StatusBadge> = {
  title: 'Pages/EpicDetail/StatusBadge',
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
          'Status badge showing story status with color coding but no count. Colors: gray for ready, blue for in_progress, red for blocked, green for completed.',
      },
    },
  },
};

type StatusBadgeStory = StoryObj<typeof StatusBadge>;

/**
 * Ready status - gray color indicating stories that haven't started.
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
 * In Progress status - primary blue color for active work.
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
 * Blocked status - danger red color indicating impediments.
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
 * Completed status - success green color for finished stories.
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
 * All status badges displayed together to show color contrast.
 */
export const AllBadges: StatusBadgeStory = {
  render: () => (
    <div class="flex flex-wrap gap-2">
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
// StoryCard Stories
// ============================================================================

/**
 * Story card component displaying a story's title, status, and task progress.
 */
export const storyCardMeta: Meta<typeof StoryCard> = {
  title: 'Pages/EpicDetail/StoryCard',
  component: StoryCard,
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
          'Card component for displaying a single story with title, status badge, and task progress. Clickable to navigate to story detail.',
      },
    },
    // Enable a11y tests for clickable card links - must have accessible names
    a11y: {
      test: 'error',
    },
  },
};

type StoryCardStory = StoryObj<typeof StoryCard>;

const createSampleStory = (overrides: Partial<StoryDetailType> = {}): StoryDetailType => ({
  slug: 'setup-testing-framework',
  title: 'Setup Testing Framework',
  status: 'in_progress',
  epicSlug: 'dashboard-restructure',
  tasks: [
    { id: 't1', title: 'Install dependencies', status: 'completed' },
    { id: 't2', title: 'Configure vitest', status: 'completed' },
    { id: 't3', title: 'Write initial tests', status: 'in_progress' },
    { id: 't4', title: 'Add CI integration', status: 'pending' },
  ],
  journal: [],
  ...overrides,
});

/**
 * Default story card with an in-progress story.
 */
export const Card: StoryCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => <StoryCard story={createSampleStory()} epicSlug="dashboard-restructure" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('Setup Testing Framework')).toBeInTheDocument();
    // Verify status badge
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    // Verify task progress text
    await expect(canvas.getByText('2/4 tasks completed')).toBeInTheDocument();
    // Verify link with correct href
    const link = canvas.getByRole('link');
    await expect(link).toHaveAttribute(
      'href',
      '/epic/dashboard-restructure/story/setup-testing-framework',
    );

    // Accessibility: Verify the link has an accessible name (the story title)
    await expect(link).toHaveAccessibleName();
  },
};

/**
 * Story card for a ready story (not started).
 */
export const CardReady: StoryCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <StoryCard
      story={createSampleStory({
        slug: 'add-visual-regression',
        title: 'Add Visual Regression Testing',
        status: 'ready',
        tasks: [
          { id: 't1', title: 'Research tools', status: 'pending' },
          { id: 't2', title: 'Configure chromatic', status: 'pending' },
          { id: 't3', title: 'Add baseline snapshots', status: 'pending' },
        ],
      })}
      epicSlug="dashboard-restructure"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('Add Visual Regression Testing')).toBeInTheDocument();
    // Verify status badge
    const badge = canvas.getByText('Ready');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-text-muted/20');
    // Verify task progress text (0 completed)
    await expect(canvas.getByText('0/3 tasks completed')).toBeInTheDocument();
  },
};

/**
 * Story card for a blocked story.
 */
export const CardBlocked: StoryCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <StoryCard
      story={createSampleStory({
        slug: 'api-integration',
        title: 'API Integration',
        status: 'blocked',
        tasks: [
          { id: 't1', title: 'Define schema', status: 'completed' },
          { id: 't2', title: 'Implement endpoints', status: 'in_progress' },
          { id: 't3', title: 'Write tests', status: 'pending' },
        ],
      })}
      epicSlug="dashboard-restructure"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();
    // Verify status badge
    const badge = canvas.getByText('Blocked');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-danger/20');
    // Verify task progress text
    await expect(canvas.getByText('1/3 tasks completed')).toBeInTheDocument();
  },
};

/**
 * Story card for a completed story.
 */
export const CardCompleted: StoryCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <StoryCard
      story={createSampleStory({
        slug: 'setup-project',
        title: 'Setup Project Structure',
        status: 'completed',
        tasks: [
          { id: 't1', title: 'Initialize repo', status: 'completed' },
          { id: 't2', title: 'Configure linting', status: 'completed' },
          { id: 't3', title: 'Setup build', status: 'completed' },
        ],
      })}
      epicSlug="dashboard-restructure"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('Setup Project Structure')).toBeInTheDocument();
    // Verify status badge
    const badge = canvas.getByText('Completed');
    await expect(badge).toBeInTheDocument();
    await expect(badge).toHaveClass('bg-success/20');
    // Verify task progress text (all completed)
    await expect(canvas.getByText('3/3 tasks completed')).toBeInTheDocument();
  },
};

/**
 * Story card with a long title demonstrating text handling.
 */
export const CardLongTitle: StoryCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <StoryCard
      story={createSampleStory({
        slug: 'long-title-story',
        title:
          'This Is a Very Long Story Title That Demonstrates How Text Wrapping Works in the Card Component',
        status: 'in_progress',
      })}
      epicSlug="dashboard-restructure"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify long title is displayed
    await expect(
      canvas.getByText(
        'This Is a Very Long Story Title That Demonstrates How Text Wrapping Works in the Card Component',
      ),
    ).toBeInTheDocument();
    // Verify link with correct href
    const link = canvas.getByRole('link');
    await expect(link).toHaveAttribute(
      'href',
      '/epic/dashboard-restructure/story/long-title-story',
    );
  },
};

/**
 * Multiple story cards in a grid layout showing different statuses.
 */
export const CardGrid: StoryCardStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StoryCard
        story={createSampleStory({
          slug: 'blocked-story',
          title: 'API Integration (Blocked)',
          status: 'blocked',
          tasks: [
            { id: 't1', title: 'Task 1', status: 'completed' },
            { id: 't2', title: 'Task 2', status: 'in_progress' },
          ],
        })}
        epicSlug="dashboard-restructure"
      />
      <StoryCard
        story={createSampleStory({
          slug: 'in-progress-story',
          title: 'Setup Testing',
          status: 'in_progress',
        })}
        epicSlug="dashboard-restructure"
      />
      <StoryCard
        story={createSampleStory({
          slug: 'ready-story',
          title: 'Add Documentation',
          status: 'ready',
          tasks: [
            { id: 't1', title: 'Write docs', status: 'pending' },
            { id: 't2', title: 'Add examples', status: 'pending' },
          ],
        })}
        epicSlug="dashboard-restructure"
      />
      <StoryCard
        story={createSampleStory({
          slug: 'completed-story',
          title: 'Setup Project',
          status: 'completed',
          tasks: [
            { id: 't1', title: 'Init', status: 'completed' },
            { id: 't2', title: 'Config', status: 'completed' },
          ],
        })}
        epicSlug="dashboard-restructure"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify grid layout
    const grid = canvasElement.querySelector('.grid');
    await expect(grid).toBeInTheDocument();
    // Verify all four story cards by title
    await expect(canvas.getByText('API Integration (Blocked)')).toBeInTheDocument();
    await expect(canvas.getByText('Setup Testing')).toBeInTheDocument();
    await expect(canvas.getByText('Add Documentation')).toBeInTheDocument();
    await expect(canvas.getByText('Setup Project')).toBeInTheDocument();
    // Verify all status badges are present
    await expect(canvas.getByText('Blocked')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    await expect(canvas.getByText('Ready')).toBeInTheDocument();
    await expect(canvas.getByText('Completed')).toBeInTheDocument();
    // Verify four links
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(4);

    // Accessibility: Verify all links have accessible names
    for (const link of links) {
      await expect(link).toHaveAccessibleName();
    }
  },
};

// ============================================================================
// EpicDetail Composite Stories
// ============================================================================

/**
 * Full EpicDetail page component showing an epic's stories.
 */
export const epicDetailMeta: Meta<typeof EpicDetail> = {
  title: 'Pages/EpicDetail',
  component: EpicDetail,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Main page component displaying epic details and its stories. Shows loading skeletons during fetch, 404 for missing epics, error states, and populated view with story cards.',
      },
    },
  },
};

type EpicDetailStory = StoryObj<typeof EpicDetail>;

/**
 * Loading state showing header and story card skeletons.
 */
export const Loading: EpicDetailStory = {
  render: () => (
    <div class="space-y-6">
      <HeaderSkeleton />
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StoryCardSkeleton />
        <StoryCardSkeleton />
        <StoryCardSkeleton />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Verify header skeleton is present
    const headerSkeleton = canvasElement.querySelector('.animate-pulse');
    await expect(headerSkeleton).toBeInTheDocument();
    // Verify grid with story card skeletons
    const grid = canvasElement.querySelector('.grid');
    await expect(grid).toBeInTheDocument();
    // Verify three story card skeletons
    const skeletonCards = canvasElement.querySelectorAll('.animate-pulse');
    await expect(skeletonCards.length).toBe(4); // 1 header + 3 cards

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'epic-detail-loading');
  },
};

/**
 * 404 state when epic is not found.
 */
export const NotFound: EpicDetailStory = {
  render: () => (
    <MemoryRouter>
      <div class="text-center py-12">
        <h1 class="text-2xl font-bold text-text mb-2">Epic not found</h1>
        <p class="text-text-muted mb-4">The epic &quot;non-existent-epic&quot; does not exist.</p>
        <Link to="/" class="text-primary hover:underline">
          ← Back to epic list
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
    await expect(canvas.getByText('Epic not found')).toBeInTheDocument();
    // Verify error message with epic name
    await expect(
      canvas.getByText(/The epic "non-existent-epic" does not exist/),
    ).toBeInTheDocument();
    // Verify back link
    const backLink = canvas.getByRole('link', { name: /back to epic list/i });
    await expect(backLink).toBeInTheDocument();
    await expect(backLink).toHaveAttribute('href', '/');

    // Accessibility: Verify back link has accessible name
    await expect(backLink).toHaveAccessibleName();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'epic-detail-not-found');
  },
};

/**
 * Error state when fetching fails.
 */
export const ErrorState: EpicDetailStory = {
  render: () => (
    <MemoryRouter>
      <div class="text-center py-12">
        <h1 class="text-2xl font-bold text-danger mb-2">Error</h1>
        <p class="text-text-muted mb-4">Failed to load epic</p>
        <Link to="/" class="text-primary hover:underline">
          ← Back to epic list
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
    await expect(canvas.getByText('Failed to load epic')).toBeInTheDocument();
    // Verify back link
    const backLink = canvas.getByRole('link', { name: /back to epic list/i });
    await expect(backLink).toBeInTheDocument();
    await expect(backLink).toHaveAttribute('href', '/');

    // Accessibility: Verify back link has accessible name
    await expect(backLink).toHaveAccessibleName();
  },
};

/**
 * Empty state when epic has no stories.
 */
export const Empty: EpicDetailStory = {
  render: () => (
    <MemoryRouter>
      <div class="space-y-6">
        <div class="space-y-4">
          <h1 class="text-2xl font-bold text-text">Dashboard Restructure and Testing</h1>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-text-muted">Progress</span>
              <span class="text-text-muted">0/0 stories completed</span>
            </div>
            <Progress value={0} />
          </div>
        </div>

        <div class="text-center py-12">
          <p class="text-text-muted text-lg">No stories in this epic.</p>
          <p class="text-text-muted">
            Run <code class="text-primary">/generate-stories</code> to create stories.
          </p>
        </div>
      </div>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify epic title
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    // Verify progress text
    await expect(canvas.getByText('Progress')).toBeInTheDocument();
    await expect(canvas.getByText('0/0 stories completed')).toBeInTheDocument();
    // Verify empty state message
    await expect(canvas.getByText('No stories in this epic.')).toBeInTheDocument();
    // Verify guidance text with command
    await expect(canvas.getByText('/generate-stories')).toBeInTheDocument();

    // Visual snapshot test
    await matchCanvasSnapshot(canvasElement, 'epic-detail-empty');
  },
};

const sampleStories: StoryDetailType[] = [
  {
    slug: 'storybook-setup',
    title: 'Storybook Setup and Component Stories',
    status: 'in_progress',
    epicSlug: 'dashboard-restructure',
    tasks: [
      { id: 't1', title: 'Install Storybook', status: 'completed' },
      { id: 't2', title: 'Configure Tailwind', status: 'completed' },
      { id: 't3', title: 'Create Layout stories', status: 'completed' },
      { id: 't4', title: 'Create page stories', status: 'in_progress' },
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
      { id: 't2', title: 'Configure chromatic', status: 'in_progress' },
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

/**
 * Populated state with multiple stories showing various statuses.
 * Stories are sorted by status priority: blocked, in_progress, ready, completed.
 */
export const Populated: EpicDetailStory = {
  render: () => (
    <MemoryRouter>
      <div class="space-y-6">
        {/* Epic header */}
        <div class="space-y-4">
          <h1 class="text-2xl font-bold text-text">Dashboard Restructure and Testing</h1>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-text-muted">Progress</span>
              <span class="text-text-muted">1/4 stories completed</span>
            </div>
            <Progress value={25} />
          </div>
        </div>

        {/* Epic content (markdown documentation) */}
        <EpicContent content={sampleEpicContent} />

        {/* Stories list */}
        <div class="space-y-4">
          <h2 class="text-lg font-semibold text-text">Stories</h2>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sampleStories.map((story) => (
              <StoryCard key={story.slug} story={story} epicSlug="dashboard-restructure" />
            ))}
          </div>
        </div>
      </div>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify epic title
    await expect(canvas.getByText('Dashboard Restructure and Testing')).toBeInTheDocument();
    // Verify progress text
    await expect(canvas.getByText('1/4 stories completed')).toBeInTheDocument();
    // Verify EpicContent section is present
    await expect(canvas.getByTestId('epic-content')).toBeInTheDocument();
    await expect(canvas.getByText('Epic Documentation')).toBeInTheDocument();
    // Verify markdown content is rendered (heading inside prose)
    const epicContent = canvasElement.querySelector('[data-testid="epic-content"]');
    const proseContainer = epicContent?.querySelector('.prose');
    await expect(proseContainer?.querySelector('h1')).toHaveTextContent(
      'Dashboard Restructure Epic',
    );
    // Verify table is rendered
    await expect(epicContent?.querySelector('table')).toBeInTheDocument();
    // Verify "Stories" section header
    await expect(canvas.getByText('Stories')).toBeInTheDocument();
    // Verify all story cards by title
    await expect(canvas.getByText('Storybook Setup and Component Stories')).toBeInTheDocument();
    await expect(canvas.getByText('Visual Regression Testing')).toBeInTheDocument();
    await expect(canvas.getByText('Playwright Integration Tests')).toBeInTheDocument();
    await expect(canvas.getByText('Flatten Dashboard Package Structure')).toBeInTheDocument();
    // Verify various status badges are present
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    await expect(canvas.getByText('Blocked')).toBeInTheDocument();
    await expect(canvas.getByText('Ready')).toBeInTheDocument();
    await expect(canvas.getByText('Completed')).toBeInTheDocument();
    // Verify four story card links
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(4);

    // Visual snapshot test
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
      <MemoryRouter>
        <div class="space-y-6">
          <div class="space-y-4">
            <h1 class="text-2xl font-bold text-text">Authentication Migration</h1>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-text-muted">Progress</span>
                <span class="text-text-muted">3/3 stories completed</span>
              </div>
              <Progress value={100} />
            </div>
          </div>

          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-text">Stories</h2>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedStories.map((story) => (
                <StoryCard key={story.slug} story={story} epicSlug="auth-migration" />
              ))}
            </div>
          </div>
        </div>
      </MemoryRouter>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify epic title
    await expect(canvas.getByText('Authentication Migration')).toBeInTheDocument();
    // Verify 100% progress text
    await expect(canvas.getByText('3/3 stories completed')).toBeInTheDocument();
    // Verify all story cards are completed
    await expect(canvas.getByText('Project Setup')).toBeInTheDocument();
    await expect(canvas.getByText('Database Migration')).toBeInTheDocument();
    await expect(canvas.getByText('Integration Testing')).toBeInTheDocument();
    // Verify all status badges are "Completed"
    const completedBadges = canvas.getAllByText('Completed');
    await expect(completedBadges.length).toBe(3);
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
          { id: 't2', title: 'Review with team', status: 'in_progress' },
        ],
        journal: [],
      },
      {
        slug: 'auth-endpoint',
        title: 'Authentication Endpoint',
        status: 'blocked',
        epicSlug: 'api-integration',
        tasks: [
          { id: 't1', title: 'Implement', status: 'in_progress' },
          { id: 't2', title: 'Add tests', status: 'pending' },
        ],
        journal: [],
      },
      {
        slug: 'data-endpoint',
        title: 'Data Endpoint',
        status: 'in_progress',
        epicSlug: 'api-integration',
        tasks: [
          { id: 't1', title: 'Implement CRUD', status: 'completed' },
          { id: 't2', title: 'Add validation', status: 'in_progress' },
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
      <MemoryRouter>
        <div class="space-y-6">
          <div class="space-y-4">
            <h1 class="text-2xl font-bold text-text">API Integration</h1>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-text-muted">Progress</span>
                <span class="text-text-muted">0/4 stories completed</span>
              </div>
              <Progress value={0} />
            </div>
          </div>

          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-text">Stories</h2>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {blockedStories.map((story) => (
                <StoryCard key={story.slug} story={story} epicSlug="api-integration" />
              ))}
            </div>
          </div>
        </div>
      </MemoryRouter>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify epic title
    await expect(canvas.getByText('API Integration')).toBeInTheDocument();
    // Verify 0% progress text
    await expect(canvas.getByText('0/4 stories completed')).toBeInTheDocument();
    // Verify all story cards
    await expect(canvas.getByText('API Design')).toBeInTheDocument();
    await expect(canvas.getByText('Authentication Endpoint')).toBeInTheDocument();
    await expect(canvas.getByText('Data Endpoint')).toBeInTheDocument();
    await expect(canvas.getByText('API Documentation')).toBeInTheDocument();
    // Verify blocked stories have "Blocked" badges (2 blocked stories)
    const blockedBadges = canvas.getAllByText('Blocked');
    await expect(blockedBadges.length).toBe(2);
    // Verify other statuses are present
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    await expect(canvas.getByText('Ready')).toBeInTheDocument();
  },
};
