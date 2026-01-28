import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@/components/ui/badge'
import type { StoryStatus } from '@/types/dashboard'

// ============================================================================
// StatusBadge Component Definitions (Story-only versions)
// ============================================================================

/** Color variants for each status type */
const statusVariants: Record<StoryStatus, string> = {
  ready: 'bg-text-muted/20 text-text-muted',
  in_progress: 'bg-primary/20 text-primary',
  blocked: 'bg-danger/20 text-danger',
  completed: 'bg-success/20 text-success',
}

/** Human-readable labels for each status type */
const statusLabels: Record<StoryStatus, string> = {
  ready: 'Ready',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  completed: 'Completed',
}

/**
 * Status badge with count - used in EpicList to show story counts per status.
 */
function StatusBadgeWithCount({
  status,
  count,
}: {
  status: StoryStatus
  count: number
}) {
  return (
    <Badge className={statusVariants[status]}>
      {statusLabels[status]}: {count}
    </Badge>
  )
}

/**
 * Status badge without count - used in EpicDetail and StoryDetail to show
 * individual story/task status.
 */
function StatusBadge({ status }: { status: StoryStatus }) {
  return <Badge className={statusVariants[status]}>{statusLabels[status]}</Badge>
}

// ============================================================================
// StatusBadge Stories (Without Count)
// ============================================================================

/**
 * Status badge showing story or task status without a count.
 * Used in EpicDetail and StoryDetail pages.
 */
const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
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
        component: `
Status badges are used throughout the dashboard to indicate the current state
of stories and tasks. There are two variants:

1. **Without count** (this component) - Used in EpicDetail and StoryDetail
   to show individual item status
2. **With count** - Used in EpicList to show aggregated story counts per status

Color tokens:
- **Ready** (gray): \`bg-text-muted/20 text-text-muted\`
- **In Progress** (blue): \`bg-primary/20 text-primary\`
- **Blocked** (red): \`bg-danger/20 text-danger\`
- **Completed** (green): \`bg-success/20 text-success\`
        `,
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof StatusBadge>

/**
 * Ready status - gray color indicating items that haven't started.
 * Used for stories/tasks that are defined but not yet in progress.
 */
export const Ready: Story = {
  render: () => <StatusBadge status="ready" />,
}

/**
 * In Progress status - primary blue color for active work.
 * Used for stories/tasks currently being worked on.
 */
export const InProgress: Story = {
  render: () => <StatusBadge status="in_progress" />,
}

/**
 * Blocked status - danger red color indicating impediments.
 * Used for stories/tasks that cannot proceed due to blockers.
 */
export const Blocked: Story = {
  render: () => <StatusBadge status="blocked" />,
}

/**
 * Completed status - success green color for finished items.
 * Used for stories/tasks that have been completed successfully.
 */
export const Completed: Story = {
  render: () => <StatusBadge status="completed" />,
}

/**
 * All status variants displayed together to demonstrate color contrast
 * and visual hierarchy.
 */
export const AllVariants: Story = {
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
// StatusBadge With Count Stories
// ============================================================================

/**
 * Status badge with count - used in EpicList to show aggregated story counts.
 */
export const statusBadgeWithCountMeta: Meta<typeof StatusBadgeWithCount> = {
  title: 'Components/StatusBadge/WithCount',
  component: StatusBadgeWithCount,
  argTypes: {
    status: {
      control: 'select',
      options: ['ready', 'in_progress', 'blocked', 'completed'],
      description: 'The status type determining badge color',
    },
    count: {
      control: 'number',
      description: 'Number of items in this status',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status badge variant with count label, used in EpicList to show how many stories are in each status.',
      },
    },
  },
}

type WithCountStory = StoryObj<typeof StatusBadgeWithCount>

/**
 * Ready status with count - shows number of stories ready to start.
 */
export const ReadyWithCount: WithCountStory = {
  render: () => <StatusBadgeWithCount status="ready" count={5} />,
}

/**
 * In Progress status with count - shows number of active stories.
 */
export const InProgressWithCount: WithCountStory = {
  render: () => <StatusBadgeWithCount status="in_progress" count={3} />,
}

/**
 * Blocked status with count - shows number of blocked stories.
 */
export const BlockedWithCount: WithCountStory = {
  render: () => <StatusBadgeWithCount status="blocked" count={1} />,
}

/**
 * Completed status with count - shows number of completed stories.
 */
export const CompletedWithCount: WithCountStory = {
  render: () => <StatusBadgeWithCount status="completed" count={8} />,
}

/**
 * All status variants with counts displayed together.
 */
export const AllVariantsWithCount: WithCountStory = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadgeWithCount status="ready" count={5} />
      <StatusBadgeWithCount status="in_progress" count={3} />
      <StatusBadgeWithCount status="blocked" count={1} />
      <StatusBadgeWithCount status="completed" count={8} />
    </div>
  ),
}

// ============================================================================
// Comparison Stories
// ============================================================================

/**
 * Side-by-side comparison of both badge variants to show the difference
 * between EpicList (with count) and EpicDetail/StoryDetail (without count) usage.
 */
export const BadgeComparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">
          Without Count (EpicDetail/StoryDetail)
        </h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="ready" />
          <StatusBadge status="in_progress" />
          <StatusBadge status="blocked" />
          <StatusBadge status="completed" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">
          With Count (EpicList)
        </h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadgeWithCount status="ready" count={5} />
          <StatusBadgeWithCount status="in_progress" count={3} />
          <StatusBadgeWithCount status="blocked" count={1} />
          <StatusBadgeWithCount status="completed" count={8} />
        </div>
      </div>
    </div>
  ),
}

/**
 * Edge cases: badges with various count values including zero and large numbers.
 */
export const EdgeCases: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">Zero Counts</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadgeWithCount status="ready" count={0} />
          <StatusBadgeWithCount status="blocked" count={0} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">Large Counts</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadgeWithCount status="ready" count={42} />
          <StatusBadgeWithCount status="completed" count={100} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-text-muted mb-2">
          Single Story Count
        </h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadgeWithCount status="blocked" count={1} />
          <StatusBadgeWithCount status="in_progress" count={1} />
        </div>
      </div>
    </div>
  ),
}
