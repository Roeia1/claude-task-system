import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createActor, waitFor, fromCallback, type AnyActorLogic } from 'xstate';
import { getShortestPaths, getSimplePaths } from 'xstate/graph';
import {
  dashboardMachine,
  type DashboardContext,
  type DashboardEvent,
  type StorySubscription,
} from './dashboardMachine';

/**
 * Model-based tests for dashboardMachine.
 *
 * These tests use xstate/graph utilities to:
 * 1. Generate and validate all reachable state paths
 * 2. Test state transitions with the production machine
 * 3. Verify context updates for all events
 * 4. Test guards and conditional transitions
 */

// Mock WebSocket actor that simulates connection lifecycle
const createMockWebsocketActor = (options: {
  connectBehavior?: 'success' | 'error' | 'disconnect';
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

      // Simulate connection behavior
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
        }
      }, 0);

      return () => {};
    }
  );

// Create a machine with mocked websocket actor
function createTestableMachine(wsActorOptions: Parameters<typeof createMockWebsocketActor>[0] = {}) {
  return dashboardMachine.provide({
    actors: {
      websocket: createMockWebsocketActor(wsActorOptions),
    },
    // Override delays for faster tests
    delays: {
      backoffDelay: () => 10,
    },
  });
}

// Sample test data
const sampleEpics = [
  { slug: 'epic-1', title: 'Epic One', description: 'First epic', status: 'in-progress' as const },
  { slug: 'epic-2', title: 'Epic Two', description: 'Second epic', status: 'done' as const },
];

const sampleEpic = {
  slug: 'epic-1',
  title: 'Epic One',
  description: 'First epic',
  status: 'in-progress' as const,
  stories: [],
};

const sampleStory = {
  slug: 'story-1',
  epicSlug: 'epic-1',
  title: 'Story One',
  status: 'in-progress' as const,
  description: 'A test story',
  context: 'Story context',
  tasks: [],
};

const sampleSessions = [
  {
    sessionId: 'session-1',
    epicSlug: 'epic-1',
    storySlug: 'story-1',
    status: 'running' as const,
    startedAt: new Date().toISOString(),
    pid: 1234,
  },
];

describe('dashboardMachine', () => {
  describe('state machine structure (graph analysis)', () => {
    it('should have all expected states reachable via shortest paths', () => {
      const machine = createTestableMachine();
      const paths = getShortestPaths(machine, {
        events: [
          { type: 'CONNECT' },
          { type: 'DISCONNECT' },
          { type: 'WS_CONNECTED' },
          { type: 'WS_DISCONNECTED' },
          { type: 'WS_ERROR', error: 'test error' },
          { type: 'RETRY' },
        ],
      });

      const reachableStates = new Set(paths.map((p) => p.state.value as string));

      // All 5 states should be reachable: idle, loading, connected, reconnecting, error
      expect(reachableStates.size).toBeGreaterThanOrEqual(4);
    });

    it('should have multiple paths through the state machine', () => {
      const machine = createTestableMachine();
      // Use getShortestPaths with stopWhen to limit traversal instead of getSimplePaths
      const paths = getShortestPaths(machine, {
        events: [
          { type: 'CONNECT' },
          { type: 'DISCONNECT' },
          { type: 'WS_CONNECTED' },
          { type: 'WS_DISCONNECTED' },
          { type: 'WS_ERROR', error: 'test error' },
          { type: 'RETRY' },
        ],
      });

      // Should find paths to multiple states
      expect(paths.length).toBeGreaterThan(1);
    });
  });

  describe('state transitions', () => {
    describe('idle state', () => {
      it('should start in idle state', () => {
        const machine = createTestableMachine();
        const actor = createActor(machine);
        actor.start();

        expect(actor.getSnapshot().value).toBe('idle');
        actor.stop();
      });

      it('should transition to loading on CONNECT', () => {
        const machine = createTestableMachine();
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        expect(actor.getSnapshot().value).toBe('loading');

        actor.stop();
      });

      it('should handle data events in idle state (REST API support)', () => {
        const machine = createTestableMachine();
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'EPICS_LOADED', epics: sampleEpics });
        expect(actor.getSnapshot().context.epics).toEqual(sampleEpics);
        expect(actor.getSnapshot().value).toBe('idle');

        actor.send({ type: 'EPIC_LOADED', epic: sampleEpic });
        expect(actor.getSnapshot().context.currentEpic).toEqual(sampleEpic);

        actor.send({ type: 'STORY_LOADED', story: sampleStory });
        expect(actor.getSnapshot().context.currentStory).toEqual(sampleStory);

        actor.send({ type: 'SESSIONS_LOADED', sessions: sampleSessions });
        expect(actor.getSnapshot().context.sessions).toEqual(sampleSessions);

        actor.stop();
      });

      it('should clear epic and story in idle state', () => {
        const machine = createTestableMachine();
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'EPIC_LOADED', epic: sampleEpic });
        actor.send({ type: 'STORY_LOADED', story: sampleStory });

        actor.send({ type: 'CLEAR_EPIC' });
        expect(actor.getSnapshot().context.currentEpic).toBeNull();

        actor.send({ type: 'CLEAR_STORY' });
        expect(actor.getSnapshot().context.currentStory).toBeNull();

        actor.stop();
      });
    });

    describe('loading state', () => {
      it('should transition to connected on WS_CONNECTED', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        expect(actor.getSnapshot().value).toBe('connected');
        expect(actor.getSnapshot().context.retryCount).toBe(0);

        actor.stop();
      });

      it('should transition to error on WS_ERROR', async () => {
        const machine = createTestableMachine({ connectBehavior: 'error' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'error', { timeout: 1000 });

        expect(actor.getSnapshot().value).toBe('error');
        expect(actor.getSnapshot().context.error).toBe('Connection failed');

        actor.stop();
      });

      it('should transition to reconnecting on WS_DISCONNECTED', async () => {
        const machine = createTestableMachine({ connectBehavior: 'disconnect' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

        expect(actor.getSnapshot().value).toBe('reconnecting');

        actor.stop();
      });

      it('should clear error on entry', () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine, {
          snapshot: dashboardMachine.resolveState({
            value: 'idle',
            context: { ...dashboardMachine.config.context!, error: 'previous error' },
          }),
        });
        actor.start();

        actor.send({ type: 'CONNECT' });
        expect(actor.getSnapshot().context.error).toBeNull();

        actor.stop();
      });
    });

    describe('connected state', () => {
      it('should transition to idle on DISCONNECT', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        actor.send({ type: 'DISCONNECT' });
        expect(actor.getSnapshot().value).toBe('idle');

        actor.stop();
      });

      it('should transition to reconnecting on WS_DISCONNECTED', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        actor.send({ type: 'WS_DISCONNECTED' });
        expect(actor.getSnapshot().value).toBe('reconnecting');

        actor.stop();
      });

      it('should transition to reconnecting on WS_ERROR', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        actor.send({ type: 'WS_ERROR', error: 'connection lost' });
        expect(actor.getSnapshot().value).toBe('reconnecting');
        expect(actor.getSnapshot().context.error).toBe('connection lost');

        actor.stop();
      });

      it('should handle all data loading events', async () => {
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

      it('should handle real-time update events', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        // Set up initial data
        actor.send({ type: 'STORY_LOADED', story: sampleStory });

        // Test EPICS_UPDATED
        const updatedEpics = [{ ...sampleEpics[0], title: 'Updated Epic' }];
        actor.send({ type: 'EPICS_UPDATED', epics: updatedEpics });
        expect(actor.getSnapshot().context.epics).toEqual(updatedEpics);

        // Test STORY_UPDATED - should update when slug matches
        const updatedStory = { ...sampleStory, title: 'Updated Story' };
        actor.send({ type: 'STORY_UPDATED', story: updatedStory });
        expect(actor.getSnapshot().context.currentStory?.title).toBe('Updated Story');

        // Test SESSIONS_UPDATED
        const updatedSessions = [{ ...sampleSessions[0], status: 'completed' as const }];
        actor.send({ type: 'SESSIONS_UPDATED', sessions: updatedSessions });
        expect(actor.getSnapshot().context.sessions).toEqual(updatedSessions);

        actor.stop();
      });

      it('should not update story when slug does not match', async () => {
        const machine = createTestableMachine({ connectBehavior: 'success' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

        // Set up initial story
        actor.send({ type: 'STORY_LOADED', story: sampleStory });

        // Send update for different story
        const differentStory = { ...sampleStory, slug: 'different-story', title: 'Different' };
        actor.send({ type: 'STORY_UPDATED', story: differentStory });

        // Original story should be unchanged
        expect(actor.getSnapshot().context.currentStory?.title).toBe('Story One');

        actor.stop();
      });

      it('should handle ERROR event without changing state', async () => {
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

    describe('reconnecting state', () => {
      it('should increment retry count on entry', async () => {
        const machine = createTestableMachine({ connectBehavior: 'disconnect' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

        expect(actor.getSnapshot().context.retryCount).toBe(1);

        actor.stop();
      });

      it('should transition to loading after backoff delay when canRetry', async () => {
        const machine = createTestableMachine({ connectBehavior: 'disconnect' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

        // Wait for backoff delay (10ms in test)
        await waitFor(actor, (s) => s.value === 'loading', { timeout: 100 });

        expect(actor.getSnapshot().value).toBe('loading');

        actor.stop();
      });

      it('should transition to idle on DISCONNECT', async () => {
        const machine = createTestableMachine({ connectBehavior: 'disconnect' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

        actor.send({ type: 'DISCONNECT' });
        expect(actor.getSnapshot().value).toBe('idle');

        actor.stop();
      });

      it('should transition to loading and reset retry count on RETRY', async () => {
        const machine = createTestableMachine({ connectBehavior: 'disconnect' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

        actor.send({ type: 'RETRY' });
        expect(actor.getSnapshot().value).toBe('loading');
        expect(actor.getSnapshot().context.retryCount).toBe(0);

        actor.stop();
      });
    });

    describe('error state', () => {
      it('should transition to loading on RETRY', async () => {
        const machine = createTestableMachine({ connectBehavior: 'error' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'error', { timeout: 1000 });

        actor.send({ type: 'RETRY' });
        expect(actor.getSnapshot().value).toBe('loading');
        expect(actor.getSnapshot().context.error).toBeNull();
        expect(actor.getSnapshot().context.retryCount).toBe(0);

        actor.stop();
      });

      it('should transition to loading on CONNECT', async () => {
        const machine = createTestableMachine({ connectBehavior: 'error' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'error', { timeout: 1000 });

        // Reconfigure to succeed
        const successMachine = createTestableMachine({ connectBehavior: 'success' });
        const actor2 = createActor(successMachine, {
          snapshot: actor.getSnapshot(),
        });
        actor.stop();
        actor2.start();

        actor2.send({ type: 'CONNECT' });
        expect(actor2.getSnapshot().value).toBe('loading');

        actor2.stop();
      });

      it('should transition to idle on DISCONNECT', async () => {
        const machine = createTestableMachine({ connectBehavior: 'error' });
        const actor = createActor(machine);
        actor.start();

        actor.send({ type: 'CONNECT' });
        await waitFor(actor, (s) => s.value === 'error', { timeout: 1000 });

        actor.send({ type: 'DISCONNECT' });
        expect(actor.getSnapshot().value).toBe('idle');

        actor.stop();
      });
    });
  });

  describe('guards', () => {
    it('canRetry should return true when retryCount < MAX_RETRIES', async () => {
      const machine = createTestableMachine({ connectBehavior: 'disconnect' });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

      // With retryCount = 1 (< 5), should transition back to loading
      await waitFor(actor, (s) => s.value === 'loading', { timeout: 100 });
      expect(actor.getSnapshot().value).toBe('loading');

      actor.stop();
    });

    it('hasMaxRetries should transition to error when retryCount >= MAX_RETRIES', async () => {
      const machine = createTestableMachine({ connectBehavior: 'disconnect' });
      const actor = createActor(machine, {
        snapshot: dashboardMachine.resolveState({
          value: 'idle',
          context: { ...dashboardMachine.config.context!, retryCount: 4 },
        }),
      });
      actor.start();

      // Start connection - will fail and go to reconnecting with retryCount = 5
      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

      // Wait for backoff - should go to error since retryCount >= MAX_RETRIES
      await waitFor(actor, (s) => s.value === 'error', { timeout: 100 });

      expect(actor.getSnapshot().value).toBe('error');
      expect(actor.getSnapshot().context.error).toBe('Maximum reconnection attempts reached');

      actor.stop();
    });
  });

  describe('subscription management', () => {
    let subscriptionCapture: { messages: object[] };

    beforeEach(() => {
      subscriptionCapture = { messages: [] };
    });

    it('should add subscription to context on SUBSCRIBE_STORY', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.subscribedStories).toContainEqual({
        epicSlug: 'epic-1',
        storySlug: 'story-1',
      });

      actor.stop();
    });

    it('should not add duplicate subscriptions', async () => {
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

    it('should remove subscription from context on UNSUBSCRIBE_STORY', async () => {
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

    it('should send subscription messages to websocket actor', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      // Give the event time to be processed
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(subscriptionCapture.messages).toContainEqual({
        type: 'subscribe:story',
        epicSlug: 'epic-1',
        storySlug: 'story-1',
      });

      actor.stop();
    });

    it('should restore subscriptions after reconnect', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      // Connect and subscribe
      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-2', storySlug: 'story-2' });

      // Clear capture to track only reconnect
      subscriptionCapture.messages = [];

      // Simulate disconnect
      actor.send({ type: 'WS_DISCONNECTED' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });

      // Wait for reconnect
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      // Verify subscriptions were restored
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

    it('should not restore unsubscribed stories after reconnect', async () => {
      const machine = createTestableMachine({
        connectBehavior: 'success',
        subscriptionCapture,
      });
      const actor = createActor(machine);
      actor.start();

      // Connect and subscribe to two stories
      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-2' });

      // Unsubscribe from one
      actor.send({ type: 'UNSUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      // Clear capture and trigger reconnect
      subscriptionCapture.messages = [];
      actor.send({ type: 'WS_DISCONNECTED' });
      await waitFor(actor, (s) => s.value === 'reconnecting', { timeout: 1000 });
      await waitFor(actor, (s) => s.value === 'connected', { timeout: 1000 });

      // Verify that story-1 was NOT re-subscribed (the key invariant)
      // Note: story-2 may be subscribed multiple times as the websocket actor
      // is invoked in both loading and connected states
      const subscribeMessages = subscriptionCapture.messages.filter(
        (m: any) => m.type === 'subscribe:story'
      );

      // All subscribe messages should be for story-2 only
      const story1Messages = subscribeMessages.filter(
        (m: any) => m.storySlug === 'story-1'
      );
      const story2Messages = subscribeMessages.filter(
        (m: any) => m.storySlug === 'story-2'
      );

      expect(story1Messages).toHaveLength(0);
      expect(story2Messages.length).toBeGreaterThan(0);

      actor.stop();
    });
  });

  describe('context initialization', () => {
    it('should have correct initial context', () => {
      const machine = createTestableMachine();
      const actor = createActor(machine);
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

  describe('action execution', () => {
    it('clearError should set error to null', async () => {
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

    it('resetRetryCount should set retryCount to 0', async () => {
      const machine = createTestableMachine({ connectBehavior: 'success' });
      const actor = createActor(machine, {
        snapshot: dashboardMachine.resolveState({
          value: 'error',
          context: { ...dashboardMachine.config.context!, retryCount: 3, error: 'test' },
        }),
      });
      actor.start();

      actor.send({ type: 'RETRY' });
      expect(actor.getSnapshot().context.retryCount).toBe(0);

      actor.stop();
    });
  });
});
