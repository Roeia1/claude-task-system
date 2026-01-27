import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom'
import { Progress } from '@/components/ui/progress'
import {
  EpicDetail,
  HeaderSkeleton,
  StoryCardSkeleton,
  StatusBadge,
  StoryCard,
} from './EpicDetail'
import type { StoryDetail as StoryDetailType, StoryStatus } from '@/types/dashboard'

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
}

export default headerSkeletonMeta
type HeaderSkeletonStory = StoryObj<typeof HeaderSkeleton>

/**
 * Default header skeleton showing the animated loading state.
 */
export const Skeleton: HeaderSkeletonStory = {}

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
}

type StoryCardSkeletonStory = StoryObj<typeof StoryCardSkeleton>

/**
 * Default story card skeleton showing the animated loading state.
 */
export const CardSkeleton: StoryCardSkeletonStory = {
  render: () => <StoryCardSkeleton />,
}

/**
 * Multiple story card skeletons arranged in a grid, simulating the loading
 * state of the story list.
 */
export const CardSkeletonGrid: StoryCardSkeletonStory = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StoryCardSkeleton />
      <StoryCardSkeleton />
      <StoryCardSkeleton />
    </div>
  ),
}

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
}

type StatusBadgeStory = StoryObj<typeof StatusBadge>

/**
 * Ready status - gray color indicating stories that haven't started.
 */
export const BadgeReady: StatusBadgeStory = {
  render: () => <StatusBadge status="ready" />,
}

/**
 * In Progress status - primary blue color for active work.
 */
export const BadgeInProgress: StatusBadgeStory = {
  render: () => <StatusBadge status="in_progress" />,
}

/**
 * Blocked status - danger red color indicating impediments.
 */
export const BadgeBlocked: StatusBadgeStory = {
  render: () => <StatusBadge status="blocked" />,
}

/**
 * Completed status - success green color for finished stories.
 */
export const BadgeCompleted: StatusBadgeStory = {
  render: () => <StatusBadge status="completed" />,
}

/**
 * All status badges displayed together to show color contrast.
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
  },
}

type StoryCardStory = StoryObj<typeof StoryCard>

const createSampleStory = (
  overrides: Partial<StoryDetailType> = {}
): StoryDetailType => ({
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
})

/**
 * Default story card with an in-progress story.
 */
export const Card: StoryCardStory = {
  render: () => (
    <StoryCard story={createSampleStory()} epicSlug="dashboard-restructure" />
  ),
}

/**
 * Story card for a ready story (not started).
 */
export const CardReady: StoryCardStory = {
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
}

/**
 * Story card for a blocked story.
 */
export const CardBlocked: StoryCardStory = {
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
}

/**
 * Story card for a completed story.
 */
export const CardCompleted: StoryCardStory = {
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
}

/**
 * Story card with a long title demonstrating text handling.
 */
export const CardLongTitle: StoryCardStory = {
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
}

/**
 * Multiple story cards in a grid layout showing different statuses.
 */
export const CardGrid: StoryCardStory = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
}

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
}

type EpicDetailStory = StoryObj<typeof EpicDetail>

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
}

/**
 * 404 state when epic is not found.
 */
export const NotFound: EpicDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-text mb-2">Epic not found</h1>
        <p className="text-text-muted mb-4">
          The epic &quot;non-existent-epic&quot; does not exist.
        </p>
        <Link to="/" className="text-primary hover:underline">
          ← Back to epic list
        </Link>
      </div>
    </MemoryRouter>
  ),
}

/**
 * Error state when fetching fails.
 */
export const ErrorState: EpicDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-danger mb-2">Error</h1>
        <p className="text-text-muted mb-4">Failed to load epic</p>
        <Link to="/" className="text-primary hover:underline">
          ← Back to epic list
        </Link>
      </div>
    </MemoryRouter>
  ),
}

/**
 * Empty state when epic has no stories.
 */
export const Empty: EpicDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-text">
            Dashboard Restructure and Testing
          </h1>
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
            Run <code className="text-primary">/generate-stories</code> to create
            stories.
          </p>
        </div>
      </div>
    </MemoryRouter>
  ),
}

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
]

/**
 * Populated state with multiple stories showing various statuses.
 * Stories are sorted by status priority: blocked, in_progress, ready, completed.
 */
export const Populated: EpicDetailStory = {
  render: () => (
    <MemoryRouter>
      <div className="space-y-6">
        {/* Epic header */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-text">
            Dashboard Restructure and Testing
          </h1>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Progress</span>
              <span className="text-text-muted">1/4 stories completed</span>
            </div>
            <Progress value={25} />
          </div>
        </div>

        {/* Stories list */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Stories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sampleStories.map((story) => (
              <StoryCard
                key={story.slug}
                story={story}
                epicSlug="dashboard-restructure"
              />
            ))}
          </div>
        </div>
      </div>
    </MemoryRouter>
  ),
}

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
    ]

    return (
      <MemoryRouter>
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-text">
              Authentication Migration
            </h1>
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
                <StoryCard
                  key={story.slug}
                  story={story}
                  epicSlug="auth-migration"
                />
              ))}
            </div>
          </div>
        </div>
      </MemoryRouter>
    )
  },
}

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
    ]

    return (
      <MemoryRouter>
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
                <StoryCard
                  key={story.slug}
                  story={story}
                  epicSlug="api-integration"
                />
              ))}
            </div>
          </div>
        </div>
      </MemoryRouter>
    )
  },
}
