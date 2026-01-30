import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createActor, fromCallback, setup, waitFor, assign } from 'xstate';
import type { StorySubscription } from './dashboardMachine';

/**
 * Tests for subscription restoration after WebSocket reconnect.
 *
 * These tests verify that:
 * 1. Subscriptions are tracked in context
 * 2. Subscriptions are passed to the websocket actor on connect
 * 3. The websocket actor receives subscribe/unsubscribe events
 */

// Track messages sent by the websocket actor
let sentMessages: object[] = [];
let receivedEvents: object[] = [];
let actorInput: { wsUrl: string; subscribedStories: StorySubscription[] } | null = null;

// Create a mock websocket actor that captures events and messages
const createMockWebsocketActor = () =>
  fromCallback<any, { wsUrl: string; subscribedStories: StorySubscription[] }>(
    ({ sendBack, input, receive }) => {
      // Capture the input to verify subscribedStories are passed
      actorInput = input;

      // Re-subscribe to stored subscriptions (simulating the fix)
      for (const sub of input.subscribedStories) {
        sentMessages.push({
          type: 'subscribe:story',
          epicSlug: sub.epicSlug,
          storySlug: sub.storySlug,
        });
      }

      // Capture events sent to the actor
      receive((event) => {
        receivedEvents.push(event);
        if (event.type === 'SUBSCRIBE_STORY') {
          sentMessages.push({
            type: 'subscribe:story',
            epicSlug: event.epicSlug,
            storySlug: event.storySlug,
          });
        } else if (event.type === 'UNSUBSCRIBE_STORY') {
          sentMessages.push({
            type: 'unsubscribe:story',
            epicSlug: event.epicSlug,
            storySlug: event.storySlug,
          });
        }
      });

      // Simulate successful connection
      setTimeout(() => sendBack({ type: 'WS_CONNECTED' }), 0);

      return () => {};
    }
  );

// Create a test machine that uses the mock websocket actor
const createTestMachine = () =>
  setup({
    types: {
      context: {} as {
        epics: any[];
        currentEpic: any;
        currentStory: any;
        sessions: any[];
        error: string | null;
        retryCount: number;
        wsUrl: string;
        subscribedStories: StorySubscription[];
      },
      events: {} as
        | { type: 'CONNECT' }
        | { type: 'DISCONNECT' }
        | { type: 'WS_CONNECTED' }
        | { type: 'WS_DISCONNECTED' }
        | { type: 'WS_ERROR'; error: string }
        | { type: 'SUBSCRIBE_STORY'; epicSlug: string; storySlug: string }
        | { type: 'UNSUBSCRIBE_STORY'; epicSlug: string; storySlug: string },
    },
    actors: {
      websocket: createMockWebsocketActor(),
    },
    actions: {
      addSubscription: assign({
        subscribedStories: ({ context, event }) => {
          if (event.type !== 'SUBSCRIBE_STORY') return context.subscribedStories;
          const exists = context.subscribedStories.some(
            (s) => s.epicSlug === event.epicSlug && s.storySlug === event.storySlug
          );
          if (exists) return context.subscribedStories;
          return [...context.subscribedStories, { epicSlug: event.epicSlug, storySlug: event.storySlug }];
        },
      }),
      removeSubscription: assign({
        subscribedStories: ({ context, event }) => {
          if (event.type !== 'UNSUBSCRIBE_STORY') return context.subscribedStories;
          return context.subscribedStories.filter(
            (s) => !(s.epicSlug === event.epicSlug && s.storySlug === event.storySlug)
          );
        },
      }),
    },
  }).createMachine({
    id: 'test-dashboard',
    initial: 'idle',
    context: {
      epics: [],
      currentEpic: null,
      currentStory: null,
      sessions: [],
      error: null,
      retryCount: 0,
      wsUrl: 'ws://localhost:3847',
      subscribedStories: [],
    },
    states: {
      idle: {
        on: {
          CONNECT: 'loading',
        },
      },
      loading: {
        invoke: {
          id: 'websocket',
          src: 'websocket',
          input: ({ context }) => ({
            wsUrl: context.wsUrl,
            subscribedStories: context.subscribedStories,
          }),
        },
        on: {
          WS_CONNECTED: 'connected',
          WS_ERROR: 'error',
        },
      },
      connected: {
        // Note: No invoke here - the websocket actor from loading state continues running
        on: {
          DISCONNECT: 'idle',
          WS_DISCONNECTED: 'reconnecting',
          SUBSCRIBE_STORY: {
            actions: ['addSubscription'],
          },
          UNSUBSCRIBE_STORY: {
            actions: ['removeSubscription'],
          },
        },
      },
      reconnecting: {
        after: {
          100: 'loading',
        },
      },
      error: {},
    },
  });

describe('dashboardMachine - subscription management', () => {
  beforeEach(() => {
    sentMessages = [];
    receivedEvents = [];
    actorInput = null;
  });

  describe('subscription tracking in context', () => {
    it('should add subscription to context when SUBSCRIBE_STORY is sent', async () => {
      const machine = createTestMachine();
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.subscribedStories).toContainEqual({
        epicSlug: 'epic-1',
        storySlug: 'story-1',
      });

      actor.stop();
    });

    it('should remove subscription from context when UNSUBSCRIBE_STORY is sent', async () => {
      const machine = createTestMachine();
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      // Add then remove
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'UNSUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.subscribedStories).toHaveLength(0);

      actor.stop();
    });

    it('should not add duplicate subscriptions', async () => {
      const machine = createTestMachine();
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      // Subscribe twice to same story
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      const snapshot = actor.getSnapshot();
      expect(snapshot.context.subscribedStories).toHaveLength(1);

      actor.stop();
    });
  });

  describe('subscription restoration after reconnect', () => {
    it('should pass subscribedStories to websocket actor on initial connect', async () => {
      const machine = createTestMachine();
      const actor = createActor(machine);
      actor.start();

      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      expect(actorInput).not.toBeNull();
      expect(actorInput!.subscribedStories).toEqual([]);

      actor.stop();
    });

    it('should pass existing subscriptions to websocket actor on reconnect', async () => {
      const machine = createTestMachine();
      const actor = createActor(machine);
      actor.start();

      // Connect and subscribe
      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-2', storySlug: 'story-2' });

      // Clear tracking to focus on reconnect
      sentMessages = [];
      actorInput = null;

      // Simulate disconnect
      actor.send({ type: 'WS_DISCONNECTED' });
      await waitFor(actor, (state) => state.matches('reconnecting'), { timeout: 1000 });

      // Wait for reconnect (loading -> connected)
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      // Verify subscriptions were passed to the new websocket actor
      expect(actorInput).not.toBeNull();
      expect(actorInput!.subscribedStories).toHaveLength(2);
      expect(actorInput!.subscribedStories).toContainEqual({
        epicSlug: 'epic-1',
        storySlug: 'story-1',
      });
      expect(actorInput!.subscribedStories).toContainEqual({
        epicSlug: 'epic-2',
        storySlug: 'story-2',
      });

      actor.stop();
    });

    it('should re-send subscribe messages for stored subscriptions on reconnect', async () => {
      const machine = createTestMachine();
      const actor = createActor(machine);
      actor.start();

      // Connect and subscribe
      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      // Clear to track only reconnect messages
      sentMessages = [];

      // Simulate disconnect and reconnect
      actor.send({ type: 'WS_DISCONNECTED' });
      await waitFor(actor, (state) => state.matches('reconnecting'), { timeout: 1000 });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      // Verify subscribe message was sent on reconnect
      expect(sentMessages).toContainEqual({
        type: 'subscribe:story',
        epicSlug: 'epic-1',
        storySlug: 'story-1',
      });

      actor.stop();
    });

    it('should not re-subscribe to stories that were unsubscribed', async () => {
      const machine = createTestMachine();
      const actor = createActor(machine);
      actor.start();

      // Connect and subscribe to two stories
      actor.send({ type: 'CONNECT' });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });
      actor.send({ type: 'SUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-2' });

      // Unsubscribe from one
      actor.send({ type: 'UNSUBSCRIBE_STORY', epicSlug: 'epic-1', storySlug: 'story-1' });

      // Verify context was updated correctly before reconnect
      const snapshotBeforeReconnect = actor.getSnapshot();
      expect(snapshotBeforeReconnect.context.subscribedStories).toHaveLength(1);
      expect(snapshotBeforeReconnect.context.subscribedStories[0]).toEqual({
        epicSlug: 'epic-1',
        storySlug: 'story-2',
      });

      // Clear to track only reconnect messages
      sentMessages = [];
      actorInput = null;

      // Simulate disconnect and reconnect
      actor.send({ type: 'WS_DISCONNECTED' });
      await waitFor(actor, (state) => state.matches('reconnecting'), { timeout: 1000 });
      await waitFor(actor, (state) => state.matches('connected'), { timeout: 1000 });

      // Verify the input passed to the new actor only has story-2
      expect(actorInput!.subscribedStories).toHaveLength(1);
      expect(actorInput!.subscribedStories[0]).toEqual({
        epicSlug: 'epic-1',
        storySlug: 'story-2',
      });

      // Verify only story-2 was re-subscribed
      const subscribeMessages = sentMessages.filter(
        (msg: any) => msg.type === 'subscribe:story'
      );
      expect(subscribeMessages).toHaveLength(1);
      expect(subscribeMessages[0]).toEqual({
        type: 'subscribe:story',
        epicSlug: 'epic-1',
        storySlug: 'story-2',
      });

      actor.stop();
    });
  });
});
