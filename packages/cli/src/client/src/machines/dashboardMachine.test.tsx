import { beforeEach, describe, expect, it } from 'vitest';
import { createActor, fromCallback, waitFor } from 'xstate';
import { getShortestPaths, getSimplePaths } from 'xstate/graph';
import type { Epic, EpicSummary, SessionInfo, StoryDetail } from '@/types/dashboard';
import {
  type DashboardContext,
  type DashboardEvent,
  dashboardMachine,
  type StorySubscription,
} from './dashboardMachine.ts';

// Test constants
const EXPECTED_REACHABLE_STATES_COUNT = 5;

// Message type for subscription capture
interface SubscriptionMessage {
  type: string;
  epicSlug: string;
  storySlug: string;
}

// Default context for machine initialization
const defaultMachineContext: DashboardContext = {
  epics: [],
  currentEpic: null,
  currentStory: null,
  sessions: [],
  error: null,
  retryCount: 0,
  wsUrl: '',
  subscribedStories: [],
};

/**
 * Model-based tests for dashboardMachine.
 *
 * Uses xstate/graph utilities to:
 * 1. Auto-generate tests for all reachable states via path traversal
 * 2. Verify state invariants across all paths
 * 3. Test specific behavioral scenarios (subscriptions, guards, etc.)
 */

// =============================================================================
// Test Fixtures
// =============================================================================

const sampleStoryCounts = {
  ready: 1,
  inProgress: 2,
  blocked: 0,
  completed: 3,
  total: 6,
};

const sampleEpics: EpicSummary[] = [
  { slug: 'epic-1', title: 'Epic One', storyCounts: sampleStoryCounts },
  {
    slug: 'epic-2',
    title: 'Epic Two',
    storyCounts: { ...sampleStoryCounts, total: 4 },
    isArchived: true,
  },
];

const sampleEpic: Epic = {
  slug: 'epic-1',
  title: 'Epic One',
  content: 'Epic description content',
  stories: [],
  storyCounts: sampleStoryCounts,
};

const sampleStory: StoryDetail = {
  slug: 'story-1',
  epicSlug: 'epic-1',
  title: 'Story One',
  status: 'in_progress',
  tasks: [{ id: 'task-1', title: 'Task One', status: 'pending' }],
  journal: [{ type: 'session', title: 'Started work', content: 'Initial session' }],
  content: 'Story content',
};

const sampleSessions: SessionInfo[] = [
  {
    name: 'saga__epic-1__story-1__1234',
    epicSlug: 'epic-1',
    storySlug: 'story-1',
    status: 'running',
    outputFile: '/tmp/saga/session-1.log',
    outputAvailable: true,
    startTime: new Date().toISOString(),
  },
];

// =============================================================================
// Mock WebSocket Actor
// =============================================================================

type ConnectBehavior = 'success' | 'error' | 'disconnect' | 'none';

const createMockWebsocketActor = (options: {
  connectBehavior?: ConnectBehavior;
  subscriptionCapture?: { messages: object[] };
}) =>
  fromCallback<DashboardEvent, { wsUrl: string; subscribedStories: StorySubscription[] }>(
    ({ sendBack, input, receive }) => {
      const { connectBehavior = 'success', subscriptionCapture } = options;

      // Re-subscribe to stored subscriptions on connect
      if (subscriptionCapture) {
        for (const sub of input.subscribedStories) {
          subscriptionCapture.messages.push({
            type: 'subscribe:story',
            epicSlug: sub.epicSlug,
            storySlug: sub.storySlug,
          });
        }
      }

      // Handle events from the machine
      receive((event) => {
        if (subscriptionCapture) {
          if (event.type === 'SUBSCRIBE_STORY') {
            subscriptionCapture.messages.push({
              type: 'subscribe:story',
              epicSlug: event.epicSlug,
              storySlug: event.storySlug,
            });
          } else if (event.type === 'UNSUBSCRIBE_STORY') {
            subscriptionCapture.messages.push({
              type: 'unsubscribe:story',
              epicSlug: event.epicSlug,
              storySlug: event.storySlug,
            });
          }
        }
      });

      // Simulate connection behavior (skip for 'none' - used in graph analysis)
      if (connectBehavior !== 'none') {
        setTimeout(() => {
          switch (connectBehavior) {
            case 'success':
              sendBack({ type: 'WS_CONNECTED' });
              break;
            case 'error':
              sendBack({ type: 'WS_ERROR', error: 'Connection failed' });
              break;
            case 'disconnect':
              sendBack({ type: 'WS_DISCONNECTED' });
              break;
            default:
              // No action needed for other behaviors
              break;
          }
        }, 0);
      }

      return () => {
        // Cleanup function - nothing to clean up in mock
      };
    },
  );

function createTestableMachine(
  wsActorOptions: Parameters<typeof createMockWebsocketActor>[0] = {},
) {
  return dashboardMachine.provide({
    actors: {
      websocket: createMockWebsocketActor(wsActorOptions),
    },
    delays: {
      backoffDelay: () => 10, // Fast delays for testing
    },
  });
}

// =============================================================================
// Graph Analysis - State Reachability
// =============================================================================

describe('dashboardMachine', () => {
  describe('graph analysis', () => {
    // Machine for graph traversal (no auto-connecting websocket)
    const graphMachine = createTestableMachine({ connectBehavior: 'none' });

    // Events that drive state transitions
    const transitionEvents: DashboardEvent[] = [
      { type: 'CONNECT' },
      { type: 'DISCONNECT' },
      { type: 'WS_CONNECTED' },
      { type: 'WS_DISCONNECTED' },
      { type: 'WS_ERROR', error: 'test error' },
      { type: 'RETRY' },
    ];

    it('should have all 5 states reachable', () => {
      const paths = getShortestPaths(graphMachine, { events: transitionEvents });
      const reachableStates = new Set(paths.map((p) => p.state.value));

      expect(reachableStates).toContain('idle');
      expect(reachableStates).toContain('loading');
      expect(reachableStates).toContain('connected');
      expect(reachableStates).toContain('reconnecting');
      expect(reachableStates).toContain('error');
      expect(reachableStates.size).toBe(EXPECTED_REACHABLE_STATES_COUNT);
    });

    it('should find shortest paths to each state', () => {
      const paths = getShortestPaths(graphMachine, { events: transitionEvents });

      // Map state to its minimum path length (excluding xstate.init)
      // getShortestPaths may return multiple paths to same state value (different contexts)
      const pathLengths = new Map<string, number>();
      for (const path of paths) {
        const stateValue = path.state.value as string;
        // Filter out xstate.init from step count since it's the automatic initialization
        const userEventSteps = path.steps.filter((s) => s.event.type !== 'xstate.init');
        const currentMin = pathLengths.get(stateValue);
        if (currentMin === undefined || userEventSteps.length < currentMin) {
          pathLengths.set(stateValue, userEventSteps.length);
        }
      }

      // Verify expected minimum paths (counting only user-triggered events)
      expect(pathLengths.get('idle')).toBe(0); // Initial state
      expect(pathLengths.get('loading')).toBe(1); // idle -> CONNECT -> loading
      expect(pathLengths.get('connected')).toBe(2); // idle -> CONNECT -> loading -> WS_CONNECTED -> connected
      expect(pathLengths.get('reconnecting')).toBe(2); // idle -> CONNECT -> loading -> WS_DISCONNECTED -> reconnecting
      expect(pathLengths.get('error')).toBe(2); // idle -> CONNECT -> loading -> WS_ERROR -> error
    });

    it('should have multiple valid paths through the machine', () => {
      const paths = getSimplePaths(graphMachine, {
        events: transitionEvents,
        // Limit to prevent combinatorial explosion
        toState: (state) => state.value === 'connected',
      });

      // Should find at least the direct path to connected
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =============================================================================
  // Model-Based Path Testing
  // =============================================================================

  describe('path-based state transitions', () => {
    const graphMachine = createTestableMachine({ connectBehavior: 'none' });

    const transitionEvents: DashboardEvent[] = [
      { type: 'CONNECT' },
      { type: 'DISCONNECT' },
      { type: 'WS_CONNECTED' },
      { type: 'WS_DISCONNECTED' },
      { type: 'WS_ERROR', error: 'test error' },
      { type: 'RETRY' },
    ];

    const paths = getShortestPaths(graphMachine, { events: transitionEvents });

    // Generate a test for each reachable state
    it.each(
      paths.map((path) => ({
        targetState: path.state.value as string,
        steps: path.steps,
        pathDescription: path.steps.map((s) => s.event.type).join(' -> ') || '(initial)',
      })),
    )('should reach "$targetState" via: $pathDescription', ({ targetState, steps }) => {
      const machine = createTestableMachine({ connectBehavior: 'none' });
      const actor = createActor(machine);
      actor.start();

      // Replay the path
      for (const step of steps) {
        actor.send(step.event);
      }

      expect(actor.getSnapshot().value).toBe(targetState);
      actor.stop();
    });
  });

  // =============================================================================
  // State Invariants (verified across all paths)
  // =============================================================================

  describe('state invariants', () => {
    const graphMachine = createTestableMachine({ connectBehavior: 'none' });

    const transitionEvents: DashboardEvent[] = [
      { type: 'CONNECT' },
      { type: 'DISCONNECT' },
      { type: 'WS_CONNECTED' },
      { type: 'WS_DISCONNECTED' },
      { type: 'WS_ERROR', error: 'test error' },
      { type: 'RETRY' },
    ];

    const paths = getShortestPaths(graphMachine, { events: transitionEvents });

    it.each(
      paths.map((path) => ({
        targetState: path.state.value as string,
        steps: path.steps,
      })),
    )('invariant: retryCount >= 0 in "$targetState"', ({ steps }) => {
      const machine = createTestableMachine({ connectBehavior: 'none' });
      const actor = createActor(machine);
      actor.start();

      // Check invariant at each step
      for (const step of steps) {
        actor.send(step.event);
        expect(actor.getSnapshot().context.retryCount).toBeGreaterThanOrEqual(0);
      }

      actor.stop();
    });

    it.each(
      paths.map((path) => ({
        targetState: path.state.value as string,
        steps: path.steps,
      })),
    )('invariant: arrays never null in "$targetState"', ({ steps }) => {
      const machine = createTestableMachine({ connectBehavior: 'none' });
      const actor = createActor(machine);
      actor.start();

      for (const step of steps) {
        actor.send(step.event);
        const ctx = actor.getSnapshot().context;
        expect(Array.isArray(ctx.epics)).toBe(true);
        expect(Array.isArray(ctx.sessions)).toBe(true);
        expect(Array.isArray(ctx.subscribedStories)).toBe(true);
      }

      actor.stop();
    });
  });

  // =============================================================================
  // Async Behavior Tests (require actual actor execution)
  // =============================================================================

  describe('async transitions', () => {
    it('loading -> connected on successful WebSocket connect', async () => {
      const machine = createTestableMachine({ connectBehavior: 'success' });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      expect(actor.getSnapshot().value).toBe('loading');

      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });
      expect(actor.getSnapshot().value).toBe('connected');
      expect(actor.getSnapshot().context.retryCount).toBe(0);

      actor.stop();
    });

    it('loading -> error on WebSocket error', async () => {
      const machine = createTestableMachine({ connectBehavior: 'error' });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'error', { timeout: 1000 });

      expect(actor.getSnapshot().value).toBe('error');
      expect(actor.getSnapshot().context.error).toBe('Connection failed');

      actor.stop();
    });

    it('loading -> reconnecting on WebSocket disconnect', async () => {
      const machine = createTestableMachine({ connectBehavior: 'disconnect' });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

      expect(actor.getSnapshot().value).toBe('reconnecting');
      expect(actor.getSnapshot().context.retryCount).toBe(1);

      actor.stop();
    });

    it('reconnecting -> loading after backoff delay (when canRetry)', async () => {
      const machine = createTestableMachine({ connectBehavior: 'disconnect' });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });
      await waitFor(actor, (s) => s.value === 'loading', { timeout: 100 });

      expect(actor.getSnapshot().value).toBe('loading');

      actor.stop();
    });

    it('reconnecting -> error when max retries exceeded', async () => {
      const machine = createTestableMachine({ connectBehavior: 'disconnect' });
      const actor = createActor(machine, {
        snapshot: dashboardMachine.resolveState({
          value: 'idle',
          context: { ...defaultMachineContext, retryCount: 4 },
        }),
      });
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });
      await waitFor(actor, (s) => s.value === 'error', { timeout: 100 });

      expect(actor.getSnapshot().value).toBe('error');
      expect(actor.getSnapshot().context.error).toBe('Maximum reconnection attempts reached');

      actor.stop();
    });
  });

  // =============================================================================
  // Data Events (context mutations without state change)
  // =============================================================================

  describe('data events', () => {
    describe('in idle state', () => {
      it('EPICS_LOADED sets epics', () => {
        const actor = createActor(createTestableMachine());
        actor.start();

        actor.send({ type: 'EPICS_LOADED', epics: sampleEpics });

        expect(actor.getSnapshot().context.epics).toEqual(sampleEpics);
        expect(actor.getSnapshot().value).toBe('idle');

        actor.stop();
      });

      it('EPIC_LOADED sets currentEpic', () => {
        const actor = createActor(createTestableMachine());
        actor.start();

        actor.send({ type: 'EPIC_LOADED', epic: sampleEpic });

        expect(actor.getSnapshot().context.currentEpic).toEqual(sampleEpic);

        actor.stop();
      });

      it('STORY_LOADED sets currentStory', () => {
        const actor = createActor(createTestableMachine());
        actor.start();

        actor.send({ type: 'STORY_LOADED', story: sampleStory });

        expect(actor.getSnapshot().context.currentStory).toEqual(sampleStory);

        actor.stop();
      });

      it('SESSIONS_LOADED sets sessions', () => {
        const actor = createActor(createTestableMachine());
        actor.start();

        actor.send({ type: 'SESSIONS_LOADED', sessions: sampleSessions });

        expect(actor.getSnapshot().context.sessions).toEqual(sampleSessions);

        actor.stop();
      });

      it('CLEAR_EPIC clears currentEpic', () => {
        const actor = createActor(createTestableMachine());
        actor.start();

        actor.send({ type: 'EPIC_LOADED', epic: sampleEpic });
        actor.send({ type: 'CLEAR_EPIC' });

        expect(actor.getSnapshot().context.currentEpic).toBeNull();

        actor.stop();
      });

      it('CLEAR_STORY clears currentStory', () => {
        const actor = createActor(createTestableMachine());
        actor.start();

        actor.send({ type: 'STORY_LOADED', story: sampleStory });
        actor.send({ type: 'CLEAR_STORY' });

        expect(actor.getSnapshot().context.currentStory).toBeNull();

        actor.stop();
      });
    });

    describe('in connected state', () => {
      it('handles all data loading events', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        actor.send({ type: 'EPICS_LOADED', epics: sampleEpics });
        expect(actor.getSnapshot().context.epics).toEqual(sampleEpics);

        actor.send({ type: 'EPIC_LOADED', epic: sampleEpic });
        expect(actor.getSnapshot().context.currentEpic).toEqual(sampleEpic);

        actor.send({ type: 'STORY_LOADED', story: sampleStory });
        expect(actor.getSnapshot().context.currentStory).toEqual(sampleStory);

        actor.send({ type: 'SESSIONS_LOADED', sessions: sampleSessions });
        expect(actor.getSnapshot().context.sessions).toEqual(sampleSessions);

        actor.stop();
      });

      it('EPICS_UPDATED updates epics', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        const updatedEpics = [{ ...sampleEpics[0], title: 'Updated Epic' }];
        actor.send({ type: 'EPICS_UPDATED', epics: updatedEpics });

        expect(actor.getSnapshot().context.epics).toEqual(updatedEpics);

        actor.stop();
      });

      it('STORY_UPDATED updates currentStory when slug matches', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        actor.send({ type: 'STORY_LOADED', story: sampleStory });

        const updatedStory = { ...sampleStory, title: 'Updated Story' };
        actor.send({ type: 'STORY_UPDATED', story: updatedStory });

        expect(actor.getSnapshot().context.currentStory?.title).toBe('Updated Story');

        actor.stop();
      });

      it('STORY_UPDATED ignores update when slug does not match', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        actor.send({ type: 'STORY_LOADED', story: sampleStory });

        const differentStory = { ...sampleStory, slug: 'different-story', title: 'Different' };
        actor.send({ type: 'STORY_UPDATED', story: differentStory });

        expect(actor.getSnapshot().context.currentStory?.title).toBe('Story One');

        actor.stop();
      });

      it('SESSIONS_UPDATED updates sessions', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        const updatedSessions = [{ ...sampleSessions[0], status: 'completed' as const }];
        actor.send({ type: 'SESSIONS_UPDATED', sessions: updatedSessions });

        expect(actor.getSnapshot().context.sessions).toEqual(updatedSessions);

        actor.stop();
      });

      it('ERROR sets error without changing state', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        actor.send({ type: 'ERROR', error: 'API error' });

        expect(actor.getSnapshot().value).toBe('connected');
        expect(actor.getSnapshot().context.error).toBe('API error');

        actor.stop();
      });
    });
  });

  // =============================================================================
  // Subscription Management
  // =============================================================================

  describe('subscription management', () => {
    let subscriptionCapture: { messages: object[] };

    beforeEach(() => {
      subscriptionCapture = { messages: [] };
    });

    it('SUBSCRIBE_STORY adds subscription to context', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      expect(actor.getSnapshot().context.subscribedStories).toContainEqual({
        epicSlug: 'epic-1',
        storySlug: 'story-1',
      });

      actor.stop();
    });

    it('SUBSCRIBE_STORY prevents duplicates', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      expect(actor.getSnapshot().context.subscribedStories).toHaveLength(1);

      actor.stop();
    });

    it('UNSUBSCRIBE_STORY removes subscription from context', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'UNSUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      expect(actor.getSnapshot().context.subscribedStories).toHaveLength(0);

      actor.stop();
    });

    it('sends subscription messages to websocket actor', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(subscriptionCapture.messages).toContainEqual({
        type: 'subscribe:story',
        epicSlug: 'epic-1',
        storySlug: 'story-1',
      });

      actor.stop();
    });

    it('restores subscriptions after reconnect', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-2', storySlug: 'story-2' });

      subscriptionCapture.messages = [];

      actor.send({ type: 'WS_DISCONNECTED' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      expect(subscriptionCapture.messages).toContainEqual({
        type: 'subscribe:story',
        epicSlug: 'epic-1',
        storySlug: 'story-1',
      });
      expect(subscriptionCapture.messages).toContainEqual({
        type: 'subscribe:story',
        epicSlug: 'epic-2',
        storySlug: 'story-2',
      });

      actor.stop();
    });

    it('does not restore unsubscribed stories after reconnect', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-2' });
      actor.send({ type: 'UNSUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      subscriptionCapture.messages = [];

      actor.send({ type: 'WS_DISCONNECTED' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      const story1Messages = (subscriptionCapture.messages as SubscriptionMessage[]).filter(
        (m) => m.type === 'subscribe:story' && m.storySlug === 'story-1',
      );
      const story2Messages = (subscriptionCapture.messages as SubscriptionMessage[]).filter(
        (m) => m.type === 'subscribe:story' && m.storySlug === 'story-2',
      );

      expect(story1Messages).toHaveLength(0);
      expect(story2Messages.length).toBeGreaterThan(0);

      actor.stop();
    });
  });

  // =============================================================================
  // Action Verification
  // =============================================================================

  describe('actions', () => {
    it('clearError sets error to null on RETRY from error state', async () => {
      const machine = createTestableMachine({ connectBehavior: 'error' });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'error', { timeout: 1000 });

      expect(actor.getSnapshot().context.error).not.toBeNull();

      actor.send({ type: 'RETRY' });

      expect(actor.getSnapshot().context.error).toBeNull();

      actor.stop();
    });

    it('resetRetryCount sets retryCount to 0 on RETRY', () => {
      const machine = createTestableMachine({ connectBehavior: 'success' });
      const actor = createActor(machine, {
        snapshot: dashboardMachine.resolveState({
          value: 'error',
          context: { ...defaultMachineContext, retryCount: 3, error: 'test' },
        }),
      });
      actor.start();

      actor.send({ type: 'RETRY' });

      expect(actor.getSnapshot().context.retryCount).toBe(0);

      actor.stop();
    });

    it('clearError on entry to loading state', () => {
      const machine = createTestableMachine({ connectBehavior: 'success' });
      const actor = createActor(machine, {
        snapshot: dashboardMachine.resolveState({
          value: 'idle',
          context: { ...defaultMachineContext, error: 'previous error' },
        }),
      });
      actor.start();

      actor.send({ type: 'CONNECT' });

      expect(actor.getSnapshot().context.error).toBeNull();

      actor.stop();
    });
  });

  // =============================================================================
  // Initial Context
  // =============================================================================

  describe('initial context', () => {
    it('has correct initial values', () => {
      const actor = createActor(createTestableMachine());
      actor.start();

      const context = actor.getSnapshot().context;

      expect(context.epics).toEqual([]);
      expect(context.currentEpic).toBeNull();
      expect(context.currentStory).toBeNull();
      expect(context.sessions).toEqual([]);
      expect(context.error).toBeNull();
      expect(context.retryCount).toBe(0);
      expect(context.wsUrl).toBe('ws://localhost:3847');
      expect(context.subscribedStories).toEqual([]);

      actor.stop();
    });
  });
});
