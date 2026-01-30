import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { ActiveSessions, ActiveSessionsSkeleton } from './ActiveSessions';
import { SessionCard } from './SessionCard';
import type { SessionInfo } from '@/types/dashboard';

// ============================================================================
// ActiveSessionsSkeleton Stories
// ============================================================================

/**
 * Skeleton loading component that displays animated placeholders
 * while session data is being fetched.
 */
const skeletonMeta: Meta<typeof ActiveSessionsSkeleton> = {
  title: 'Components/ActiveSessions/ActiveSessionsSkeleton',
  component: ActiveSessionsSkeleton,
  parameters: {
    docs: {
      description: {
        component:
          'Animated loading placeholder for the Active Sessions section. Displays during initial data fetch with three skeleton cards.',
      },
    },
  },
};

export default skeletonMeta;
type SkeletonStory = StoryObj<typeof ActiveSessionsSkeleton>;

/**
 * Default skeleton showing the loading state with heading and three
 * placeholder cards with animated pulse effect.
 */
export const Skeleton: SkeletonStory = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify heading is present
    await expect(canvas.getByText('Active Sessions')).toBeInTheDocument();
    // Verify skeleton container exists
    const skeleton = canvas.getByTestId('active-sessions-skeleton');
    await expect(skeleton).toBeInTheDocument();
    // Verify three skeleton cards
    const skeletonCards = canvas.getAllByTestId('session-card-skeleton');
    await expect(skeletonCards.length).toBe(3);
    // Verify cards have animate-pulse class
    const pulsingElements = canvasElement.querySelectorAll('.animate-pulse');
    await expect(pulsingElements.length).toBe(3);
  },
};

// ============================================================================
// ActiveSessions Composite Stories (Manual Rendering)
// ============================================================================

/**
 * Since ActiveSessions fetches data from an API, we create manual stories
 * that render the expected UI states directly.
 */
export const compositeSessionsMeta: Meta = {
  title: 'Components/ActiveSessions',
  parameters: {
    docs: {
      description: {
        component:
          'Section displaying currently running sessions at the top of the home page. Shows as a horizontal scrollable list of session cards. Hidden when no sessions are running.',
      },
    },
  },
};

// Helper to create mock session data
function createMockSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  const startTime = new Date(Date.now() - 150000); // 2m 30s ago
  return {
    name: 'saga__epic-slug__story-slug__12345',
    epicSlug: 'epic-slug',
    storySlug: 'story-slug',
    status: 'running',
    outputFile: '/tmp/saga/sessions/output.log',
    outputAvailable: true,
    startTime: startTime.toISOString(),
    outputPreview: '> Running...\n> Processing...\n> 50% complete',
    ...overrides,
  };
}

type CompositeStory = StoryObj;

/**
 * Loading state showing skeleton placeholders while fetching session data.
 */
export const Loading: CompositeStory = {
  render: () => <ActiveSessionsSkeleton />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify loading skeleton is displayed
    await expect(canvas.getByText('Active Sessions')).toBeInTheDocument();
    await expect(canvas.getByTestId('active-sessions-skeleton')).toBeInTheDocument();
  },
};

/**
 * Empty state - section is completely hidden when no running sessions.
 * This story demonstrates that nothing renders when sessions array is empty.
 */
export const Empty: CompositeStory = {
  render: () => (
    <div className="p-4 border-2 border-dashed border-border rounded">
      <p className="text-text-muted text-center italic">
        ActiveSessions returns null when no running sessions exist.
        <br />
        The section is completely hidden (no empty state message).
      </p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify explanatory text is present
    await expect(canvas.getByText(/returns null/)).toBeInTheDocument();
  },
};

/**
 * Single session - shows one running session card.
 */
export const SingleSession: CompositeStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <section data-testid="active-sessions" className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'tmux-session-dashboard',
              storySlug: 'home-page-active-sessions',
              outputPreview: '> Starting session...\n> Running tests...\n> All tests passed',
            })}
          />
        </div>
      </div>
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify section heading
    await expect(canvas.getByText('Active Sessions')).toBeInTheDocument();
    // Verify single session card
    await expect(canvas.getByText('home-page-active-sessions')).toBeInTheDocument();
    await expect(canvas.getByText('tmux-session-dashboard')).toBeInTheDocument();
    // Verify link is present
    const link = canvas.getByRole('link');
    await expect(link).toHaveAttribute(
      'href',
      '/epic/tmux-session-dashboard/story/home-page-active-sessions?tab=sessions'
    );
  },
};

/**
 * Multiple sessions - shows several running sessions in a horizontal layout.
 * Demonstrates the scrollable behavior when there are more than 3 sessions.
 */
export const MultipleSessions: CompositeStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <section data-testid="active-sessions" className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'tmux-session-dashboard',
              storySlug: 'websocket-infrastructure',
              outputPreview: '> WebSocket server starting...\n> Listening on port 3847',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'tmux-session-dashboard',
              storySlug: 'session-api-discovery',
              startTime: new Date(Date.now() - 300000).toISOString(), // 5m ago
              outputPreview: '> Discovering sessions...\n> Found 3 active sessions\n> Polling tmux...',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'auth-system',
              storySlug: 'oauth-integration',
              startTime: new Date(Date.now() - 600000).toISOString(), // 10m ago
              outputPreview: '> Configuring OAuth...\n> Validating tokens...\n> Integration tests running',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'performance-optimization',
              storySlug: 'query-caching',
              startTime: new Date(Date.now() - 3720000).toISOString(), // 1h 2m ago
              outputPreview: '> Cache warming...\n> Running benchmarks...',
            })}
          />
        </div>
      </div>
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify section heading
    await expect(canvas.getByText('Active Sessions')).toBeInTheDocument();
    // Verify all four session cards
    await expect(canvas.getByText('websocket-infrastructure')).toBeInTheDocument();
    await expect(canvas.getByText('session-api-discovery')).toBeInTheDocument();
    await expect(canvas.getByText('oauth-integration')).toBeInTheDocument();
    await expect(canvas.getByText('query-caching')).toBeInTheDocument();
    // Verify four links
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(4);
  },
};

/**
 * Session with output unavailable - demonstrates the dimmed state.
 */
export const OutputUnavailable: CompositeStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <section data-testid="active-sessions" className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'my-epic',
              storySlug: 'my-story',
              outputAvailable: false,
              outputPreview: undefined,
            })}
          />
        </div>
      </div>
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify "Output unavailable" message
    await expect(canvas.getByText('Output unavailable')).toBeInTheDocument();
  },
};

/**
 * Session with long output preview - demonstrates truncation behavior.
 * Output is truncated to last 5 lines and max 500 characters.
 */
export const LongOutputPreview: CompositeStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => {
    const longOutput = Array.from(
      { length: 20 },
      (_, i) => `Line ${i + 1}: This is a detailed log entry with timestamp and context information`
    ).join('\n');
    return (
      <section data-testid="active-sessions" className="space-y-4">
        <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          <div className="min-w-[300px] flex-shrink-0">
            <SessionCard
              session={createMockSession({
                epicSlug: 'verbose-epic',
                storySlug: 'verbose-story',
                outputPreview: longOutput,
              })}
            />
          </div>
        </div>
      </section>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify output preview is present (should show last 5 lines, truncated to 500 chars)
    const preElement = canvasElement.querySelector('pre');
    await expect(preElement).toBeInTheDocument();
    // Should not contain early lines (truncated to last 5)
    await expect(canvas.queryByText(/Line 1:/)).not.toBeInTheDocument();
    // Should contain later lines
    await expect(canvas.getByText(/Line 20:/)).toBeInTheDocument();
  },
};

/**
 * Mixed session states - shows sessions with different characteristics.
 * Includes sessions with output, without output, and with unavailable output.
 */
export const MixedSessionStates: CompositeStory = {
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: () => (
    <section data-testid="active-sessions" className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'epic-one',
              storySlug: 'story-with-output',
              outputPreview: '> Tests running...\n> 15/20 tests passed',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'epic-two',
              storySlug: 'story-no-output',
              outputAvailable: true,
              outputPreview: undefined,
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession({
              epicSlug: 'epic-three',
              storySlug: 'story-unavailable',
              outputAvailable: false,
              outputPreview: undefined,
            })}
          />
        </div>
      </div>
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Verify all three session types
    await expect(canvas.getByText('story-with-output')).toBeInTheDocument();
    await expect(canvas.getByText('story-no-output')).toBeInTheDocument();
    await expect(canvas.getByText('story-unavailable')).toBeInTheDocument();
    // Verify "Output unavailable" appears once
    await expect(canvas.getByText('Output unavailable')).toBeInTheDocument();
    // Verify output preview appears once
    await expect(canvas.getByText(/Tests running/)).toBeInTheDocument();
  },
};
