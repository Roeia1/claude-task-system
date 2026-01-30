import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { SessionCard, formatDuration } from './SessionCard';
import type { SessionInfo } from '@/types/dashboard';

/**
 * SessionCard displays a single running session with live duration updates,
 * output preview, and navigation to the story detail page.
 */
const meta: Meta<typeof SessionCard> = {
  title: 'Components/SessionCard',
  component: SessionCard,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="w-[350px]">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'Card component for displaying a running session with story/epic titles, live duration counter, and output preview. Clicking navigates to the story detail Sessions tab.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SessionCard>;

// Create a session with a start time that's a certain number of seconds in the past
function createSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  const startTime = new Date(Date.now() - 150000); // 2m 30s ago
  return {
    name: 'saga__tmux-session-dashboard__home-page-active-sessions__12345',
    epicSlug: 'tmux-session-dashboard',
    storySlug: 'home-page-active-sessions',
    status: 'running',
    outputFile: '/tmp/saga/sessions/output.log',
    outputAvailable: true,
    startTime: startTime.toISOString(),
    outputPreview: '> Starting session...\n> Running tests...\n> Tests passed\n> Building...\n> Build complete',
    ...overrides,
  };
}

/**
 * Default session card showing all elements: story title, epic title,
 * duration counter, and output preview.
 */
export const Default: Story = {
  render: () => <SessionCard session={createSession()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story title
    await expect(canvas.getByText('home-page-active-sessions')).toBeInTheDocument();
    // Verify epic title
    await expect(canvas.getByText('tmux-session-dashboard')).toBeInTheDocument();
    // Verify duration is displayed (format varies based on elapsed time)
    const durationElement = canvas.getByText(/\d+[smhd]/);
    await expect(durationElement).toBeInTheDocument();
    // Verify output preview
    await expect(canvas.getByText(/Starting session/)).toBeInTheDocument();
    // Verify link points to correct URL
    const link = canvas.getByRole('link');
    await expect(link).toHaveAttribute(
      'href',
      '/epic/tmux-session-dashboard/story/home-page-active-sessions?tab=sessions'
    );
  },
};

/**
 * Session with no output preview (outputPreview is undefined/empty).
 * The output section should not render.
 */
export const NoOutputPreview: Story = {
  render: () => <SessionCard session={createSession({ outputPreview: undefined })} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify story and epic titles are present
    await expect(canvas.getByText('home-page-active-sessions')).toBeInTheDocument();
    await expect(canvas.getByText('tmux-session-dashboard')).toBeInTheDocument();
    // Verify no pre element for output
    const preElement = canvasElement.querySelector('pre');
    await expect(preElement).not.toBeInTheDocument();
    // Verify "Output unavailable" is NOT shown (because outputAvailable is true)
    await expect(canvas.queryByText('Output unavailable')).not.toBeInTheDocument();
  },
};

/**
 * Session with output unavailable (outputAvailable: false).
 * Shows a dimmed "Output unavailable" message.
 */
export const OutputUnavailable: Story = {
  render: () => (
    <SessionCard
      session={createSession({
        outputAvailable: false,
        outputPreview: undefined,
      })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify "Output unavailable" message
    await expect(canvas.getByText('Output unavailable')).toBeInTheDocument();
    // Verify no pre element for output
    const preElement = canvasElement.querySelector('pre');
    await expect(preElement).not.toBeInTheDocument();
  },
};

/**
 * Session with a very long output preview to demonstrate truncation.
 * Output is truncated to last 5 lines and max 500 characters.
 */
export const LongOutputPreview: Story = {
  render: () => {
    const longOutput = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}: This is a log line with some content that demonstrates truncation behavior`)
      .join('\n');
    return <SessionCard session={createSession({ outputPreview: longOutput })} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify output preview is present
    const preElement = canvasElement.querySelector('pre');
    await expect(preElement).toBeInTheDocument();
    // The content should be truncated (won't have Line 1)
    await expect(canvas.queryByText(/Line 1:/)).not.toBeInTheDocument();
    // But should have later lines (last 5 lines)
    await expect(canvas.getByText(/Line 20:/)).toBeInTheDocument();
  },
};

/**
 * Session that just started (a few seconds ago).
 * Duration shows in seconds format.
 */
export const JustStarted: Story = {
  render: () => {
    const recentStart = new Date(Date.now() - 15000); // 15 seconds ago
    return (
      <SessionCard
        session={createSession({
          startTime: recentStart.toISOString(),
          outputPreview: '> Initializing...',
        })}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Duration should show seconds format (approximately 15s)
    const durationElement = canvas.getByText(/\d+s/);
    await expect(durationElement).toBeInTheDocument();
  },
};

/**
 * Session running for over an hour.
 * Duration shows in hours/minutes format.
 */
export const LongRunning: Story = {
  render: () => {
    const hourAgo = new Date(Date.now() - 3720000); // 1h 2m ago
    return (
      <SessionCard
        session={createSession({
          storySlug: 'complex-implementation',
          startTime: hourAgo.toISOString(),
          outputPreview: '> Long running task...\n> Still processing...\n> 50% complete...\n> 75% complete...\n> Almost done...',
        })}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Duration should show hours format
    const durationElement = canvas.getByText(/\d+h \d+m/);
    await expect(durationElement).toBeInTheDocument();
  },
};

/**
 * Multiple session cards displayed together.
 * Demonstrates how cards look in a horizontal layout.
 * Note: Uses the meta decorator's MemoryRouter, only customizes the layout wrapper.
 */
export const MultipleCards: Story = {
  decorators: [
    (Story) => (
      <div className="flex gap-4 overflow-x-auto w-[900px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <>
      <div className="min-w-[300px]">
        <SessionCard
          session={createSession({
            epicSlug: 'epic-one',
            storySlug: 'story-one',
            outputPreview: '> First session output',
          })}
        />
      </div>
      <div className="min-w-[300px]">
        <SessionCard
          session={createSession({
            epicSlug: 'epic-two',
            storySlug: 'story-two',
            outputPreview: '> Second session output',
          })}
        />
      </div>
      <div className="min-w-[300px]">
        <SessionCard
          session={createSession({
            epicSlug: 'epic-three',
            storySlug: 'story-three',
            outputAvailable: false,
          })}
        />
      </div>
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify all three cards are present
    await expect(canvas.getByText('story-one')).toBeInTheDocument();
    await expect(canvas.getByText('story-two')).toBeInTheDocument();
    await expect(canvas.getByText('story-three')).toBeInTheDocument();
    // Verify all three links are present
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(3);
  },
};

// ============================================================================
// formatDuration utility stories
// ============================================================================

/**
 * Stories demonstrating the formatDuration utility function.
 */
export const FormatDurationExamples: Story = {
  render: () => (
    <div className="space-y-2 p-4 bg-bg-dark rounded">
      <h3 className="text-lg font-semibold text-text mb-4">formatDuration Examples</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="text-text-muted">0 seconds:</div>
        <div className="text-text font-mono">{formatDuration(0)}</div>
        <div className="text-text-muted">30 seconds:</div>
        <div className="text-text font-mono">{formatDuration(30)}</div>
        <div className="text-text-muted">59 seconds:</div>
        <div className="text-text font-mono">{formatDuration(59)}</div>
        <div className="text-text-muted">1 minute:</div>
        <div className="text-text font-mono">{formatDuration(60)}</div>
        <div className="text-text-muted">2m 34s:</div>
        <div className="text-text font-mono">{formatDuration(154)}</div>
        <div className="text-text-muted">1 hour:</div>
        <div className="text-text font-mono">{formatDuration(3600)}</div>
        <div className="text-text-muted">1h 15m:</div>
        <div className="text-text font-mono">{formatDuration(4500)}</div>
        <div className="text-text-muted">1 day:</div>
        <div className="text-text font-mono">{formatDuration(86400)}</div>
        <div className="text-text-muted">2d 3h:</div>
        <div className="text-text font-mono">{formatDuration(183600)}</div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify formatDuration examples are displayed
    await expect(canvas.getByText('0s')).toBeInTheDocument();
    await expect(canvas.getByText('30s')).toBeInTheDocument();
    await expect(canvas.getByText('59s')).toBeInTheDocument();
    await expect(canvas.getByText('1m 0s')).toBeInTheDocument();
    await expect(canvas.getByText('2m 34s')).toBeInTheDocument();
    await expect(canvas.getByText('1h 0m')).toBeInTheDocument();
    await expect(canvas.getByText('1h 15m')).toBeInTheDocument();
    await expect(canvas.getByText('1d 0h')).toBeInTheDocument();
    await expect(canvas.getByText('2d 3h')).toBeInTheDocument();
  },
};
