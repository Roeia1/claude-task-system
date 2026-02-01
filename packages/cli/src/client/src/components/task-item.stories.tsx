import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { TaskItem, TaskStatusIcon } from '@/pages/StoryDetail';
import { createMockTask, resetMockCounters, type TaskPreset } from '@/test-utils/mock-factories';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';

// Test IDs for icon verification
const ICON_CIRCLE_PENDING = 'icon-circle-pending';
const ICON_CIRCLE_IN_PROGRESS = 'icon-circle-in-progress';
const ICON_CHECK_CIRCLE = 'icon-check-circle';

// Regex patterns for text matching (must be top-level for performance)
const REGEX_PRESET_LABEL = /Preset:/;

/**
 * TaskItem displays a single task with its status icon and badge.
 *
 * Atoms/TaskItem provides:
 * - **Showcase**: All 3 task states (pending, in-progress, completed) with edge cases
 * - **Playground**: Interactive preset selector with title override
 */
const meta: Meta<typeof TaskItem> = {
  title: 'Atoms/TaskItem',
  component: TaskItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Task row component displaying task title with status icon and badge. Shows strikethrough text for completed tasks.',
      },
    },
  },
};

type Story = StoryObj<typeof meta>;

// Preset labels for display
const presetLabels: Record<TaskPreset, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

/**
 * Helper to convert preset to display label
 */
function presetToLabel(preset: TaskPreset): string {
  return presetLabels[preset];
}

/**
 * Showcase displays all task states and edge cases.
 *
 * Sections:
 * - **Task States**: Pending, In Progress, Completed
 * - **Edge Cases**: Long title, special characters
 * - **Status Icons**: All 3 icon variants for reference
 */
const Showcase: Story = {
  render: () => {
    resetMockCounters();
    return (
      <div className="space-y-8">
        {/* Task States */}
        <section>
          <h3 className="text-lg font-semibold text-text mb-4">Task States</h3>
          <div className="divide-y divide-border-muted rounded-lg border border-border-muted">
            <div className="p-2">
              <div className="text-xs text-text-muted mb-1">Pending</div>
              <TaskItem
                task={createMockTask('pending', { title: 'Write unit tests for API endpoints' })}
              />
            </div>
            <div className="p-2">
              <div className="text-xs text-text-muted mb-1">In Progress</div>
              <TaskItem
                task={createMockTask('in-progress', { title: 'Implement authentication flow' })}
              />
            </div>
            <div className="p-2">
              <div className="text-xs text-text-muted mb-1">Completed</div>
              <TaskItem task={createMockTask('completed', { title: 'Setup project structure' })} />
            </div>
          </div>
        </section>

        {/* Edge Cases */}
        <section>
          <h3 className="text-lg font-semibold text-text mb-4">Edge Cases</h3>
          <div className="divide-y divide-border-muted rounded-lg border border-border-muted">
            <div className="p-2">
              <div className="text-xs text-text-muted mb-1">Long Title</div>
              <TaskItem
                task={createMockTask('in-progress', {
                  title:
                    'This is a very long task title that demonstrates how text wrapping works in the task item component when the content exceeds normal length',
                })}
              />
            </div>
            <div className="p-2">
              <div className="text-xs text-text-muted mb-1">Special Characters</div>
              <TaskItem
                task={createMockTask('pending', {
                  title: 'Handle <script> tags & "quoted" strings in task names',
                })}
              />
            </div>
          </div>
        </section>

        {/* Status Icons Reference */}
        <section>
          <h3 className="text-lg font-semibold text-text mb-4">Status Icons Reference</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <TaskStatusIcon status="pending" />
              <span className="text-text-muted">Pending - muted circle</span>
            </div>
            <div className="flex items-center gap-3">
              <TaskStatusIcon status="inProgress" />
              <span className="text-primary">In Progress - primary filled circle</span>
            </div>
            <div className="flex items-center gap-3">
              <TaskStatusIcon status="completed" />
              <span className="text-success">Completed - success checkmark</span>
            </div>
          </div>
        </section>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify section headers
    await expect(canvas.getByText('Task States')).toBeInTheDocument();
    await expect(canvas.getByText('Edge Cases')).toBeInTheDocument();
    await expect(canvas.getByText('Status Icons Reference')).toBeInTheDocument();

    // Verify task titles
    await expect(canvas.getByText('Write unit tests for API endpoints')).toBeInTheDocument();
    await expect(canvas.getByText('Implement authentication flow')).toBeInTheDocument();
    await expect(canvas.getByText('Setup project structure')).toBeInTheDocument();

    // Verify status badges (use getAllByText since some appear multiple times)
    const pendingBadges = canvas.getAllByText('pending');
    await expect(pendingBadges.length).toBeGreaterThanOrEqual(1);
    const inProgressBadges = canvas.getAllByText('in progress');
    await expect(inProgressBadges.length).toBeGreaterThanOrEqual(1);
    await expect(canvas.getByText('completed')).toBeInTheDocument();

    // Verify icons are present
    const pendingIcons = canvas.getAllByTestId(ICON_CIRCLE_PENDING);
    await expect(pendingIcons.length).toBeGreaterThanOrEqual(1);
    const inProgressIcons = canvas.getAllByTestId(ICON_CIRCLE_IN_PROGRESS);
    await expect(inProgressIcons.length).toBeGreaterThanOrEqual(1);
    const checkIcons = canvas.getAllByTestId(ICON_CHECK_CIRCLE);
    await expect(checkIcons.length).toBeGreaterThanOrEqual(1);

    // Verify completed task has strikethrough styling
    const completedTitle = canvas.getByText('Setup project structure');
    await expect(completedTitle).toHaveClass('line-through');
    await expect(completedTitle).toHaveClass('text-text-muted');

    // Verify long title is displayed
    await expect(
      canvas.getByText(
        'This is a very long task title that demonstrates how text wrapping works in the task item component when the content exceeds normal length',
      ),
    ).toBeInTheDocument();

    // Visual snapshots
    await matchDomSnapshot(canvasElement, 'task-item-showcase');
    await matchPixelSnapshot(canvasElement, 'task-item-showcase');
  },
};

/**
 * Playground allows interactive exploration of TaskItem with different presets.
 *
 * Controls:
 * - **preset**: Select task state (pending, in-progress, completed)
 * - **title**: Override the task title
 */
const Playground: Story = {
  args: {
    task: createMockTask('pending', { title: 'Example task' }),
  },
  argTypes: {
    task: { table: { disable: true } },
  },
  render: (_, { args }) => {
    // Extract preset and title from globals or use defaults
    const preset = (args as unknown as { preset?: TaskPreset }).preset ?? 'pending';
    const title = (args as unknown as { title?: string }).title ?? undefined;

    resetMockCounters();
    const task = createMockTask(preset, title ? { title } : {});

    return (
      <div className="space-y-4">
        <div className="text-sm text-text-muted">
          Preset: <span className="font-medium text-text">{presetToLabel(preset)}</span>
        </div>
        <div className="rounded-lg border border-border-muted p-2">
          <TaskItem task={task} />
        </div>
      </div>
    );
  },
  parameters: {
    controls: { include: ['preset', 'title'] },
  },
};

// Override meta to add Playground-specific argTypes
Playground.argTypes = {
  ...Playground.argTypes,
  preset: {
    control: 'select',
    options: ['pending', 'in-progress', 'completed'] as TaskPreset[],
    description: 'Task state preset',
    table: { category: 'Preset' },
  },
  title: {
    control: 'text',
    description: 'Override task title',
    table: { category: 'Overrides' },
  },
};

Playground.args = {
  ...Playground.args,
  preset: 'pending' as TaskPreset,
  title: '',
} as unknown as Story['args'];

Playground.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // Verify preset label is displayed
  await expect(canvas.getByText(REGEX_PRESET_LABEL)).toBeInTheDocument();

  // Verify a task is rendered
  const taskContainer = canvasElement.querySelector('.divide-y, .rounded-lg');
  await expect(taskContainer).toBeInTheDocument();
};

export default meta;
export { Showcase, Playground };
