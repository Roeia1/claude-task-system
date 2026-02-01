import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import { expect, within } from 'storybook/test';
import type { SessionPreset } from '@/test-utils/mock-factories';
import { createMockSession } from '@/test-utils/mock-factories';
import { ActiveSessionsSkeleton } from './active-sessions.tsx';
import { SessionCard } from './session-card.tsx';

// ============================================================================
// Constants
// ============================================================================

// Magic numbers extracted per biome rules
const SKELETON_CARD_COUNT = 3;
const MULTIPLE_SESSION_COUNT = 4;
const MIXED_STATES_SESSION_COUNT = 3;
const SHOWCASE_MIN_STATES = 4;

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Wrapper component that provides MemoryRouter context for SessionCard.
 */
function SessionCardWithRouter({
  preset,
  epicSlug,
  storySlug,
  outputPreview,
}: {
  preset: SessionPreset;
  epicSlug?: string;
  storySlug?: string;
  outputPreview?: string;
}) {
  const session = createMockSession(preset, {
    epicSlug,
    storySlug,
    outputPreview,
  });

  return (
    <MemoryRouter>
      <div className="min-w-[300px] flex-shrink-0">
        <SessionCard session={session} />
      </div>
    </MemoryRouter>
  );
}

/**
 * Container that mimics the ActiveSessions section layout.
 */
function ActiveSessionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <section data-testid="active-sessions" className="space-y-4">
      <h2 className="text-xl font-semibold text-text">Active Sessions</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}

/**
 * Helper to convert preset name to display label.
 */
function presetToLabel(preset: SessionPreset): string {
  switch (preset) {
    case 'just-started':
      return 'Just Started';
    case 'running':
      return 'Running';
    case 'long-running':
      return 'Long Running';
    case 'no-output':
      return 'No Output';
    case 'output-unavailable':
      return 'Output Unavailable';
    default: {
      const _exhaustiveCheck: never = preset;
      return _exhaustiveCheck satisfies never;
    }
  }
}

// ============================================================================
// Showcase Sections
// ============================================================================

function LoadingStateSection() {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-text">Loading State</h3>
      <p className="text-sm text-text-muted">
        Skeleton loading component displayed while session data is being fetched.
      </p>
      <ActiveSessionsSkeleton />
    </div>
  );
}

function EmptyStateSection() {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-text">Empty State</h3>
      <p className="text-sm text-text-muted">
        ActiveSessions returns null when no running sessions exist. The section is completely
        hidden.
      </p>
      <div className="p-4 border-2 border-dashed border-border rounded">
        <p className="text-text-muted text-center italic">
          Section hidden (no empty state message displayed)
        </p>
      </div>
    </div>
  );
}

function SessionStatesSection() {
  const presets: SessionPreset[] = [
    'just-started',
    'running',
    'long-running',
    'no-output',
    'output-unavailable',
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-text">Session States</h3>
      <p className="text-sm text-text-muted">All 5 session preset states displayed side by side.</p>
      <div className="flex gap-4 flex-wrap">
        {presets.map((preset) => (
          <div key={preset} className="space-y-1">
            <p className="text-xs text-text-muted">{presetToLabel(preset)}</p>
            <SessionCardWithRouter preset={preset} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MultipleSessionsSection() {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-text">Multiple Sessions (Horizontal Scroll)</h3>
      <p className="text-sm text-text-muted">
        Demonstrates the scrollable layout when there are multiple running sessions.
      </p>
      <MemoryRouter>
        <ActiveSessionsLayout>
          <div className="min-w-[300px] flex-shrink-0">
            <SessionCard
              session={createMockSession('running', {
                epicSlug: 'websocket-infra',
                storySlug: 'ws-server',
                outputPreview: '> WebSocket server starting...\n> Listening on port 3847',
              })}
            />
          </div>
          <div className="min-w-[300px] flex-shrink-0">
            <SessionCard
              session={createMockSession('running', {
                epicSlug: 'auth-system',
                storySlug: 'oauth-integration',
                outputPreview: '> Configuring OAuth...\n> Validating tokens...',
              })}
            />
          </div>
          <div className="min-w-[300px] flex-shrink-0">
            <SessionCard
              session={createMockSession('long-running', {
                epicSlug: 'performance',
                storySlug: 'query-caching',
                outputPreview: '> Cache warming...\n> Running benchmarks...',
              })}
            />
          </div>
          <div className="min-w-[300px] flex-shrink-0">
            <SessionCard
              session={createMockSession('just-started', {
                epicSlug: 'testing',
                storySlug: 'integration-tests',
                outputPreview: '> Starting test suite...',
              })}
            />
          </div>
        </ActiveSessionsLayout>
      </MemoryRouter>
    </div>
  );
}

function MixedStatesSection() {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-text">Mixed Session States</h3>
      <p className="text-sm text-text-muted">
        Sessions with different output states: with output, no output, output unavailable.
      </p>
      <MemoryRouter>
        <ActiveSessionsLayout>
          <div className="min-w-[300px] flex-shrink-0">
            <SessionCard
              session={createMockSession('running', {
                epicSlug: 'epic-one',
                storySlug: 'story-with-output',
                outputPreview: '> Tests running...\n> 15/20 tests passed',
              })}
            />
          </div>
          <div className="min-w-[300px] flex-shrink-0">
            <SessionCard
              session={createMockSession('no-output', {
                epicSlug: 'epic-two',
                storySlug: 'story-no-output',
              })}
            />
          </div>
          <div className="min-w-[300px] flex-shrink-0">
            <SessionCard
              session={createMockSession('output-unavailable', {
                epicSlug: 'epic-three',
                storySlug: 'story-unavailable',
              })}
            />
          </div>
        </ActiveSessionsLayout>
      </MemoryRouter>
    </div>
  );
}

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<{ preset: SessionPreset; epicSlug: string; storySlug: string }> = {
  title: 'Components/ActiveSessions',
  parameters: {
    docs: {
      description: {
        component:
          'Section displaying currently running sessions at the top of the home page. Shows as a horizontal scrollable list of session cards. Hidden when no sessions are running.',
      },
    },
  },
  argTypes: {
    preset: {
      control: 'select',
      options: ['just-started', 'running', 'long-running', 'no-output', 'output-unavailable'],
      description: 'Session preset determining duration and output state',
    },
    epicSlug: {
      control: 'text',
      description: 'Epic slug override',
    },
    storySlug: {
      control: 'text',
      description: 'Story slug override',
    },
  },
  args: {
    preset: 'running',
    epicSlug: 'my-epic',
    storySlug: 'my-story',
  },
};

type Story = StoryObj<typeof meta>;

// ============================================================================
// Stories
// ============================================================================

/**
 * Showcase displaying all ActiveSessions states and variations.
 * Demonstrates loading state, empty state, session states, and layout behavior.
 */
const Showcase: Story = {
  render: () => (
    <div className="space-y-8">
      <LoadingStateSection />
      <EmptyStateSection />
      <SessionStatesSection />
      <MultipleSessionsSection />
      <MixedStatesSection />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify loading state section
    await expect(canvas.getAllByText('Active Sessions').length).toBeGreaterThanOrEqual(1);
    const skeleton = canvas.getByTestId('active-sessions-skeleton');
    await expect(skeleton).toBeInTheDocument();
    const skeletonCards = canvas.getAllByTestId('session-card-skeleton');
    await expect(skeletonCards.length).toBe(SKELETON_CARD_COUNT);

    // Verify session states section (5 states)
    await expect(canvas.getByText('Just Started')).toBeInTheDocument();
    await expect(canvas.getByText('Running')).toBeInTheDocument();
    await expect(canvas.getByText('Long Running')).toBeInTheDocument();
    await expect(canvas.getByText('No Output')).toBeInTheDocument();
    await expect(canvas.getByText('Output Unavailable')).toBeInTheDocument();

    // Verify multiple sessions section
    await expect(canvas.getByText('ws-server')).toBeInTheDocument();
    await expect(canvas.getByText('oauth-integration')).toBeInTheDocument();

    // Verify mixed states section
    await expect(canvas.getByText('story-with-output')).toBeInTheDocument();
    await expect(canvas.getByText('story-no-output')).toBeInTheDocument();
    await expect(canvas.getByText('story-unavailable')).toBeInTheDocument();

    // Verify links exist
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBeGreaterThanOrEqual(SHOWCASE_MIN_STATES);
  },
};

/**
 * Interactive playground for exploring ActiveSessions states.
 * Use controls to switch between session presets and customize slugs.
 */
const Playground: Story = {
  render: (args) => {
    const session = createMockSession(args.preset, {
      epicSlug: args.epicSlug,
      storySlug: args.storySlug,
    });

    return (
      <div className="space-y-4">
        <div className="p-3 bg-bg-secondary rounded">
          <p className="text-sm text-text-muted">
            <strong>Preset:</strong> {presetToLabel(args.preset)}
          </p>
        </div>
        <MemoryRouter>
          <ActiveSessionsLayout>
            <div className="min-w-[300px] flex-shrink-0">
              <SessionCard session={session} />
            </div>
          </ActiveSessionsLayout>
        </MemoryRouter>
      </div>
    );
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Verify preset info displayed
    await expect(canvas.getByText(presetToLabel(args.preset))).toBeInTheDocument();

    // Verify session card rendered
    await expect(canvas.getByText(args.storySlug)).toBeInTheDocument();
    await expect(canvas.getByText(args.epicSlug)).toBeInTheDocument();

    // Verify link is present
    const link = canvas.getByRole('link');
    await expect(link).toHaveAttribute(
      'href',
      `/epic/${args.epicSlug}/story/${args.storySlug}?tab=sessions`,
    );

    // Check for output unavailable message when applicable
    if (args.preset === 'output-unavailable') {
      await expect(canvas.getByText('Output unavailable')).toBeInTheDocument();
    }
  },
};

// ============================================================================
// Additional Stories for Visual Regression
// ============================================================================

/**
 * Loading skeleton state for visual regression testing.
 */
const Loading: Story = {
  render: () => <ActiveSessionsSkeleton />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Active Sessions')).toBeInTheDocument();
    await expect(canvas.getByTestId('active-sessions-skeleton')).toBeInTheDocument();
    const skeletonCards = canvas.getAllByTestId('session-card-skeleton');
    await expect(skeletonCards.length).toBe(SKELETON_CARD_COUNT);
  },
};

/**
 * Single session card for visual regression testing.
 */
const SingleSession: Story = {
  render: () => (
    <MemoryRouter>
      <ActiveSessionsLayout>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession('running', {
              epicSlug: 'my-epic',
              storySlug: 'my-story',
              outputPreview: '> Starting session...\n> Running tests...\n> All tests passed',
            })}
          />
        </div>
      </ActiveSessionsLayout>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Active Sessions')).toBeInTheDocument();
    await expect(canvas.getByText('my-story')).toBeInTheDocument();
    const link = canvas.getByRole('link');
    await expect(link).toHaveAttribute('href', '/epic/my-epic/story/my-story?tab=sessions');
  },
};

/**
 * Multiple sessions in horizontal layout for visual regression testing.
 */
const MultipleSessions: Story = {
  render: () => (
    <MemoryRouter>
      <ActiveSessionsLayout>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession('running', {
              epicSlug: 'epic-1',
              storySlug: 'story-1',
              outputPreview: '> WebSocket server starting...',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession('running', {
              epicSlug: 'epic-2',
              storySlug: 'story-2',
              outputPreview: '> Discovering sessions...',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession('long-running', {
              epicSlug: 'epic-3',
              storySlug: 'story-3',
              outputPreview: '> Configuring OAuth...',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession('just-started', {
              epicSlug: 'epic-4',
              storySlug: 'story-4',
              outputPreview: '> Cache warming...',
            })}
          />
        </div>
      </ActiveSessionsLayout>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Active Sessions')).toBeInTheDocument();
    await expect(canvas.getByText('story-1')).toBeInTheDocument();
    await expect(canvas.getByText('story-2')).toBeInTheDocument();
    await expect(canvas.getByText('story-3')).toBeInTheDocument();
    await expect(canvas.getByText('story-4')).toBeInTheDocument();
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(MULTIPLE_SESSION_COUNT);
  },
};

/**
 * Mixed session states for visual regression testing.
 */
const MixedSessionStates: Story = {
  render: () => (
    <MemoryRouter>
      <ActiveSessionsLayout>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession('running', {
              epicSlug: 'epic-one',
              storySlug: 'with-output',
              outputPreview: '> Tests running...\n> 15/20 tests passed',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession('no-output', {
              epicSlug: 'epic-two',
              storySlug: 'no-output',
            })}
          />
        </div>
        <div className="min-w-[300px] flex-shrink-0">
          <SessionCard
            session={createMockSession('output-unavailable', {
              epicSlug: 'epic-three',
              storySlug: 'unavailable',
            })}
          />
        </div>
      </ActiveSessionsLayout>
    </MemoryRouter>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('with-output')).toBeInTheDocument();
    await expect(canvas.getByText('no-output')).toBeInTheDocument();
    await expect(canvas.getByText('unavailable')).toBeInTheDocument();
    await expect(canvas.getByText('Output unavailable')).toBeInTheDocument();
    const links = canvas.getAllByRole('link');
    await expect(links.length).toBe(MIXED_STATES_SESSION_COUNT);
  },
};

// ============================================================================
// Exports - All exports at the end
// ============================================================================

export default meta;
export { Showcase, Playground, Loading, SingleSession, MultipleSessions, MixedSessionStates };
