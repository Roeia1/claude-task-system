import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { createActor } from 'xstate'
import { DashboardProvider } from '@/context/DashboardContext'
import { dashboardMachine } from '@/machines'
import { EpicList, EpicCardSkeleton, StatusBadge, EpicCard } from './EpicList'
import type { EpicSummary } from '@/types/dashboard'

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
}

export default skeletonMeta
type SkeletonStory = StoryObj<typeof EpicCardSkeleton>

/**
 * Default skeleton showing the animated loading state with
 * placeholder areas for title, progress bar, and status badges.
 */
export const Skeleton: SkeletonStory = {}

/**
 * Multiple skeletons arranged in a grid, simulating the loading
 * state of the EpicList page.
 */
export const SkeletonGrid: SkeletonStory = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <EpicCardSkeleton />
      <EpicCardSkeleton />
      <EpicCardSkeleton />
    </div>
  ),
}

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
}

type StatusBadgeStory = StoryObj<typeof StatusBadge>

/**
 * Ready status - gray color indicating stories that haven't started.
 */
export const StatusReady: StatusBadgeStory = {
  render: () => <StatusBadge status="ready" count={5} />,
}

/**
 * In Progress status - primary blue color for active work.
 */
export const StatusInProgress: StatusBadgeStory = {
  render: () => <StatusBadge status="in_progress" count={3} />,
}

/**
 * Blocked status - danger red color indicating impediments.
 */
export const StatusBlocked: StatusBadgeStory = {
  render: () => <StatusBadge status="blocked" count={1} />,
}

/**
 * Completed status - success green color for finished stories.
 */
export const StatusCompleted: StatusBadgeStory = {
  render: () => <StatusBadge status="completed" count={8} />,
}

/**
 * All status badges displayed together to show color contrast.
 */
export const AllStatuses: StatusBadgeStory = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="ready" count={5} />
      <StatusBadge status="in_progress" count={3} />
      <StatusBadge status="blocked" count={1} />
      <StatusBadge status="completed" count={8} />
    </div>
  ),
}

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
  },
}

type EpicCardStory = StoryObj<typeof EpicCard>

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
}

/**
 * Default epic card with a mix of story statuses.
 */
export const Card: EpicCardStory = {
  render: () => <EpicCard epic={sampleEpic} />,
}

/**
 * Epic card for a fully completed epic.
 */
export const CardCompleted: EpicCardStory = {
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
}

/**
 * Epic card with all stories ready to start.
 */
export const CardAllReady: EpicCardStory = {
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
}

/**
 * Epic card with blocked work requiring attention.
 */
export const CardWithBlockers: EpicCardStory = {
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
}

/**
 * Epic card with a long title demonstrating text handling.
 */
export const CardLongTitle: EpicCardStory = {
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
}

/**
 * Multiple epic cards in a grid layout.
 */
export const CardGrid: EpicCardStory = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
}

// ============================================================================
// EpicList Composite Stories
// ============================================================================

/** Helper to create a mock dashboard provider with specific epics */
function MockDashboardProvider({
  children,
  epics,
  isLoading = false,
}: {
  children: React.ReactNode
  epics: EpicSummary[]
  isLoading?: boolean
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
  })

  actor.start()

  return <DashboardProvider logic={dashboardMachine}>{children}</DashboardProvider>
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
}

type EpicListStory = StoryObj<typeof EpicList>

/**
 * Loading state showing three skeleton cards.
 * Note: This uses a direct render to show the skeleton state.
 */
export const Loading: EpicListStory = {
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
}

/**
 * Empty state when no epics exist.
 */
export const Empty: EpicListStory = {
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
}

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
]

/**
 * Populated state with multiple epics showing various progress states.
 */
export const Populated: EpicListStory = {
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
}

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
]

/**
 * State with archived epics, showing the "Show archived" toggle.
 * Archived epics are hidden by default but can be revealed.
 */
export const WithArchivedEpics: EpicListStory = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Epics</h1>
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" className="rounded border-border" />
          Show archived
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sampleEpics.map((epic) => (
          <EpicCard key={epic.slug} epic={epic} />
        ))}
      </div>
    </div>
  ),
}

/**
 * State showing all epics including archived ones (toggle enabled).
 */
export const WithArchivedVisible: EpicListStory = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Epics</h1>
        <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked readOnly className="rounded border-border" />
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
}
