import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Badge } from '@/components/ui/badge';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';
import type { StoryStatus } from '@/types/dashboard';

// ============================================================================
// StatusBadge Component Definitions (Story-only versions)
// ============================================================================

/** Color variants for each status type */
const statusVariants: Record<StoryStatus, string> = {
  pending: 'bg-text-muted/20 text-text-muted',
  inProgress: 'bg-primary/20 text-primary',
  completed: 'bg-success/20 text-success',
};

/** Human-readable labels for each status type */
const statusLabels: Record<StoryStatus, string> = {
  pending: 'Pending',
  inProgress: 'In Progress',
  completed: 'Completed',
};

/** Available status presets for Playground */
const statusPresets = ['pending', 'inProgress', 'completed'] as const;
type StatusPreset = (typeof statusPresets)[number];

/**
 * Status badge with count - used in EpicList to show story counts per status.
 */
function StatusBadgeWithCount({ status, count }: { status: StoryStatus; count: number }) {
  return (
    <Badge className={statusVariants[status]}>
      {statusLabels[status]}: {count}
    </Badge>
  );
}

/**
 * Status badge without count - used in EpicDetail and StoryDetail to show
 * individual story/task status.
 */
function StatusBadge({ status }: { status: StoryStatus }) {
  return <Badge className={statusVariants[status]}>{statusLabels[status]}</Badge>;
}

// ============================================================================
// Story Meta
// ============================================================================

/**
 * Status badges showing story or task status.
 *
 * Two variants exist:
 * - **Without count**: Used in EpicDetail and StoryDetail for individual items
 * - **With count**: Used in EpicList to show aggregated story counts per status
 *
 * Color tokens:
 * - **Pending** (gray): `bg-text-muted/20 text-text-muted`
 * - **In Progress** (blue): `bg-primary/20 text-primary`
 * - **Completed** (green): `bg-success/20 text-success`
 */
const meta: Meta<{ preset: StatusPreset; count: number }> = {
  title: 'Atoms/StatusBadge',
  argTypes: {
    preset: {
      control: 'select',
      options: statusPresets,
      description: 'Status preset determining badge color and label',
    },
    count: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Count to display (for WithCount variant)',
    },
  },
  args: {
    preset: 'pending',
    count: 5,
  },
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Curated display of StatusBadge variants showing all status types
 * with and without counts.
 */
const Showcase: Story = {
  render: () => (
    <div className="space-y-8">
      {/* Without Count Section */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-3">
          Without Count (EpicDetail/StoryDetail)
        </h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="pending" />
          <StatusBadge status="inProgress" />
          <StatusBadge status="completed" />
        </div>
      </section>

      {/* With Count Section */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-3">With Count (EpicList)</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadgeWithCount status="pending" count={5} />
          <StatusBadgeWithCount status="inProgress" count={3} />
          <StatusBadgeWithCount status="completed" count={8} />
        </div>
      </section>

      {/* Edge Cases Section */}
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-3">Edge Cases</h3>
        <div className="space-y-2">
          <div>
            <span className="text-xs text-text-muted mr-2">Zero counts:</span>
            <StatusBadgeWithCount status="pending" count={0} />
            <span className="ml-2">
              <StatusBadgeWithCount status="completed" count={0} />
            </span>
          </div>
          <div>
            <span className="text-xs text-text-muted mr-2">Large counts:</span>
            <StatusBadgeWithCount status="pending" count={42} />
            <span className="ml-2">
              <StatusBadgeWithCount status="completed" count={100} />
            </span>
          </div>
        </div>
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify section headers
    await expect(canvas.getByText('Without Count (EpicDetail/StoryDetail)')).toBeInTheDocument();
    await expect(canvas.getByText('With Count (EpicList)')).toBeInTheDocument();
    await expect(canvas.getByText('Edge Cases')).toBeInTheDocument();

    // Verify badges without count
    await expect(canvas.getByText('Pending')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    await expect(canvas.getByText('Completed')).toBeInTheDocument();

    // Verify badges with count
    await expect(canvas.getByText('Pending: 5')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress: 3')).toBeInTheDocument();
    await expect(canvas.getByText('Completed: 8')).toBeInTheDocument();

    // Verify edge cases
    await expect(canvas.getByText('Pending: 0')).toBeInTheDocument();
    await expect(canvas.getByText('Completed: 0')).toBeInTheDocument();
    await expect(canvas.getByText('Pending: 42')).toBeInTheDocument();
    await expect(canvas.getByText('Completed: 100')).toBeInTheDocument();

    // Visual snapshot tests
    await matchDomSnapshot(canvasElement, 'status-badge-showcase');
    await matchPixelSnapshot(canvasElement, 'status-badge-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring StatusBadge variants.
 * Use the controls to change status preset and count.
 */
const Playground: Story = {
  render: (args) => (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-3">Without Count</h3>
        <StatusBadge status={args.preset} />
      </section>

      <section>
        <h3 className="text-sm font-medium text-text-muted mb-3">With Count</h3>
        <StatusBadgeWithCount status={args.preset} count={args.count} />
      </section>
    </div>
  ),
  args: {
    preset: 'pending',
    count: 5,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify the badge renders with the selected preset
    const expectedLabel = statusLabels[args.preset];
    await expect(canvas.getByText(expectedLabel)).toBeInTheDocument();
    await expect(canvas.getByText(`${expectedLabel}: ${args.count}`)).toBeInTheDocument();

    // Verify correct classes are applied using Promise.all
    const badges = canvas.getAllByText(new RegExp(expectedLabel));
    const expectedClass = statusVariants[args.preset].split(' ')[0];
    await Promise.all(badges.map((badge) => expect(badge).toHaveClass(expectedClass)));
  },
};

// ============================================================================
// Exports
// ============================================================================

export default meta;
export { Showcase, Playground };
