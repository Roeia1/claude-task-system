import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StatusBadge } from '@/components/StatusBadge';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';
import type { StoryStatus } from '@/types/dashboard';

/** Color variants for each status type (mirrored for test assertions) */
const statusVariants: Record<StoryStatus, string> = {
  pending: 'bg-text-muted/20 text-text-muted',
  inProgress: 'bg-primary/20 text-primary',
  completed: 'bg-success/20 text-success',
};

/** Human-readable labels for each status type (mirrored for test assertions) */
const statusLabels: Record<StoryStatus, string> = {
  pending: 'Pending',
  inProgress: 'In Progress',
  completed: 'Completed',
};

/** Available status presets for Playground */
const statusPresets = ['pending', 'inProgress', 'completed'] as const;
type StatusPreset = (typeof statusPresets)[number];

// ============================================================================
// Story Meta
// ============================================================================

/**
 * Status badges showing story or task status.
 *
 * Used in EpicDetail and StoryDetail for individual items.
 *
 * Color tokens:
 * - **Pending** (gray): `bg-text-muted/20 text-text-muted`
 * - **In Progress** (blue): `bg-primary/20 text-primary`
 * - **Completed** (green): `bg-success/20 text-success`
 */
const meta: Meta<{ preset: StatusPreset }> = {
  title: 'Atoms/StatusBadge',
  argTypes: {
    preset: {
      control: 'select',
      options: statusPresets,
      description: 'Status preset determining badge color and label',
    },
  },
  args: {
    preset: 'pending',
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
      <section>
        <h3 className="text-sm font-medium text-text-muted mb-3">Status Badges</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="pending" />
          <StatusBadge status="inProgress" />
          <StatusBadge status="completed" />
        </div>
      </section>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify all badges render
    await expect(canvas.getByText('Pending')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress')).toBeInTheDocument();
    await expect(canvas.getByText('Completed')).toBeInTheDocument();

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
        <h3 className="text-sm font-medium text-text-muted mb-3">Badge Preview</h3>
        <StatusBadge status={args.preset} />
      </section>
    </div>
  ),
  args: {
    preset: 'pending',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify the badge renders with the selected preset
    const expectedLabel = statusLabels[args.preset];
    await expect(canvas.getByText(expectedLabel)).toBeInTheDocument();

    // Verify correct classes are applied
    const badge = canvas.getByText(expectedLabel);
    const expectedClass = statusVariants[args.preset].split(' ')[0];
    await expect(badge).toHaveClass(expectedClass);
  },
};

// ============================================================================
// Exports
// ============================================================================

export default meta;
export { Showcase, Playground };
