import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, within } from 'storybook/test';
import { StoryCard } from '@/pages/EpicDetail';
import { createMockStory, resetMockCounters, type StoryPreset } from '@/test-utils/mock-factories';
import { matchDomSnapshot, matchPixelSnapshot } from '@/test-utils/visual-snapshot';

// ============================================================================
// Types and Constants
// ============================================================================

/** Available story presets for the Playground */
const STORY_PRESETS: StoryPreset[] = ['pending', 'in-progress', 'almost-done', 'completed'];

/** Number of cards in the Showcase grid */
const SHOWCASE_CARD_COUNT = 4;

/** Regex pattern for matching preset label in Playground */
const PRESET_LABEL_PATTERN = /Preset:/;

/** Labels for story presets */
const presetLabels: Record<StoryPreset, string> = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  'almost-done': 'Almost Done',
  completed: 'Completed',
};

// ============================================================================
// Helper Component
// ============================================================================

/** StoryCard with MemoryRouter wrapper for proper Link rendering */
function StoryCardWithRouter({ preset, title }: { preset: StoryPreset; title?: string }) {
  resetMockCounters();
  const story = createMockStory(preset, title ? { title } : {});

  return (
    <MemoryRouter>
      <StoryCard story={story} />
    </MemoryRouter>
  );
}

// ============================================================================
// Meta
// ============================================================================

const meta: Meta<{ preset: StoryPreset; title: string }> = {
  title: 'Components/StoryCard',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Card component for displaying a single story with title, status badge, and task progress. Clickable to navigate to story detail page.',
      },
    },
    a11y: {
      test: 'error',
    },
  },
  argTypes: {
    preset: {
      control: 'select',
      options: STORY_PRESETS,
      description: 'Story state preset',
      table: {
        type: { summary: 'StoryPreset' },
        defaultValue: { summary: 'pending' },
      },
    },
    title: {
      control: 'text',
      description: 'Custom title override',
      table: {
        type: { summary: 'string' },
      },
    },
  },
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Showcase Story
// ============================================================================

/**
 * Showcase displaying all story card states.
 *
 * Demonstrates the different visual states a story card can be in:
 * - Pending: Story not started, all tasks pending
 * - In Progress: Story actively being worked on
 * - Almost Done: Most tasks completed, nearly finished
 * - Completed: All tasks done
 *
 * Also shows edge cases like long titles.
 */
export const Showcase: Story = {
  render: () => {
    resetMockCounters();
    return (
      <div className="space-y-8">
        {/* Status States */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-text">Story States</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ maxWidth: '900px' }}>
            {STORY_PRESETS.map((preset) => (
              <div key={preset} className="space-y-2">
                <span className="text-xs text-text-muted">{presetLabels[preset]}</span>
                <MemoryRouter>
                  <StoryCard
                    story={createMockStory(preset, {
                      title: `${presetLabels[preset]} Story`,
                    })}
                  />
                </MemoryRouter>
              </div>
            ))}
          </div>
        </section>

        {/* Edge Cases */}
        <section>
          <h3 className="text-lg font-semibold mb-4 text-text">Edge Cases</h3>
          <div className="grid gap-4 md:grid-cols-2" style={{ maxWidth: '600px' }}>
            {/* Long title */}
            <div className="space-y-2">
              <span className="text-xs text-text-muted">Long Title</span>
              <MemoryRouter>
                <StoryCard
                  story={createMockStory('in-progress', {
                    title:
                      'This Is a Very Long Story Title That Demonstrates How Text Wrapping Works in the Card Component',
                  })}
                />
              </MemoryRouter>
            </div>

            {/* No tasks */}
            <div className="space-y-2">
              <span className="text-xs text-text-muted">No Tasks</span>
              <MemoryRouter>
                <StoryCard
                  story={createMockStory('pending', {
                    title: 'Story With No Tasks',
                    tasks: [],
                  })}
                />
              </MemoryRouter>
            </div>
          </div>
        </section>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify all story states are displayed
    await expect(canvas.getByText('Pending Story')).toBeInTheDocument();
    await expect(canvas.getByText('In Progress Story')).toBeInTheDocument();
    await expect(canvas.getByText('Almost Done Story')).toBeInTheDocument();
    await expect(canvas.getByText('Completed Story')).toBeInTheDocument();

    // Verify status badges are present (using getAllByText since labels may appear multiple times)
    const pendingElements = canvas.getAllByText('Pending');
    await expect(pendingElements.length).toBeGreaterThanOrEqual(1);
    const inProgressBadges = canvas.getAllByText('In Progress');
    await expect(inProgressBadges.length).toBeGreaterThanOrEqual(2); // Almost Done also shows In Progress status
    const completedElements = canvas.getAllByText('Completed');
    await expect(completedElements.length).toBeGreaterThanOrEqual(1);

    // Verify edge cases
    await expect(
      canvas.getByText(
        'This Is a Very Long Story Title That Demonstrates How Text Wrapping Works in the Card Component',
      ),
    ).toBeInTheDocument();
    await expect(canvas.getByText('Story With No Tasks')).toBeInTheDocument();

    // Verify task progress is shown
    await expect(canvas.getByText('0/3 tasks completed')).toBeInTheDocument(); // Pending story

    // Verify links have accessible names
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBeGreaterThanOrEqual(SHOWCASE_CARD_COUNT);
    await Promise.all(links.map((link) => expect(link).toHaveAccessibleName()));

    // Visual snapshots
    await matchDomSnapshot(canvasElement, 'story-card-showcase');
    await matchPixelSnapshot(canvasElement, 'story-card-showcase');
  },
};

// ============================================================================
// Playground Story
// ============================================================================

/**
 * Interactive playground for exploring story card configurations.
 *
 * Use the controls to:
 * - Select different story presets (pending, in-progress, almost-done, completed)
 * - Override the story title
 */
export const Playground: Story = {
  args: {
    preset: 'pending',
    title: '',
  },
  render: (args) => {
    const displayTitle = args.title || undefined;
    return (
      <div className="space-y-4">
        {/* Current preset info */}
        <div className="text-sm text-text-muted">
          <span className="font-medium">Preset:</span> {presetLabels[args.preset]}
        </div>

        {/* Story card */}
        <div style={{ maxWidth: '350px' }}>
          <StoryCardWithRouter preset={args.preset} title={displayTitle} />
        </div>
      </div>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify preset info is displayed
    await expect(canvas.getByText(PRESET_LABEL_PATTERN)).toBeInTheDocument();

    // Verify card is rendered with link
    const link = canvas.getByRole('link');
    await expect(link).toBeInTheDocument();
    await expect(link).toHaveAccessibleName();

    // Verify status badge is present based on preset (using getAllByText since label may appear twice)
    switch (args.preset) {
      case 'pending': {
        const pendingElements = canvas.getAllByText('Pending');
        await expect(pendingElements.length).toBeGreaterThanOrEqual(1);
        break;
      }
      case 'in-progress':
      case 'almost-done': {
        const inProgressElements = canvas.getAllByText('In Progress');
        await expect(inProgressElements.length).toBeGreaterThanOrEqual(1);
        break;
      }
      case 'completed': {
        const completedElements = canvas.getAllByText('Completed');
        await expect(completedElements.length).toBeGreaterThanOrEqual(1);
        break;
      }
      default:
        // Exhaustive check - TypeScript ensures all cases are handled
        args.preset satisfies never;
    }
  },
};

export default meta;
