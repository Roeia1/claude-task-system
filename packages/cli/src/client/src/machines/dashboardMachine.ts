import { setup, assign, fromCallback } from 'xstate';
import type { EpicSummary, Epic, StoryDetail, SessionInfo } from '@/types/dashboard';

/** Maximum number of reconnection attempts */
const MAX_RETRIES = 5;

/** Base delay for exponential backoff (ms) */
const BASE_DELAY = 1000;

/** Heartbeat interval in ms (30 seconds) */
const HEARTBEAT_INTERVAL = 30000;

/** Calculate exponential backoff delay */
function getBackoffDelay(retryCount: number): number {
  return Math.min(BASE_DELAY * Math.pow(2, retryCount), 30000);
}

/** Story subscription identifier */
export interface StorySubscription {
  epicSlug: string;
  storySlug: string;
}

/** Dashboard machine context */
export interface DashboardContext {
  epics: EpicSummary[];
  currentEpic: Epic | null;
  currentStory: StoryDetail | null;
  sessions: SessionInfo[];
  error: string | null;
  retryCount: number;
  wsUrl: string;
  subscribedStories: StorySubscription[];
}

/** Dashboard machine events */
export type DashboardEvent =
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'EPICS_LOADED'; epics: EpicSummary[] }
  | { type: 'EPIC_LOADED'; epic: Epic }
  | { type: 'STORY_LOADED'; story: StoryDetail }
  | { type: 'SESSIONS_LOADED'; sessions: SessionInfo[] }
  | { type: 'WS_CONNECTED' }
  | { type: 'WS_DISCONNECTED' }
  | { type: 'WS_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'EPICS_UPDATED'; epics: EpicSummary[] }
  | { type: 'STORY_UPDATED'; story: StoryDetail }
  | { type: 'SESSIONS_UPDATED'; sessions: SessionInfo[] }
  | { type: 'LOAD_EPICS' }
  | { type: 'LOAD_EPIC'; slug: string }
  | { type: 'LOAD_STORY'; epicSlug: string; storySlug: string }
  | { type: 'CLEAR_EPIC' }
  | { type: 'CLEAR_STORY' }
  | { type: 'ERROR'; error: string }
  | { type: 'SUBSCRIBE_STORY'; epicSlug: string; storySlug: string }
  | { type: 'UNSUBSCRIBE_STORY'; epicSlug: string; storySlug: string };

/** WebSocket send function type for external access */
type WebSocketSendFn = (message: object) => void;

/** Global reference to WebSocket send function (set by actor) */
let wsSendFn: WebSocketSendFn | null = null;

/** Get the current WebSocket send function */
export function getWebSocketSend(): WebSocketSendFn | null {
  return wsSendFn;
}

/** WebSocket actor logic with heartbeat and subscription support */
const websocketActor = fromCallback<DashboardEvent, { wsUrl: string }>(
  ({ sendBack, input, receive }) => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    let lastPong = Date.now();

    const sendMessage = (message: object) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };

    // Expose send function globally
    wsSendFn = sendMessage;

    const startHeartbeat = () => {
      // Clear any existing heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      heartbeatInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          // Send ping message
          sendMessage({ type: 'ping' });

          // Check if we've received a pong recently (within 2 heartbeat intervals)
          const now = Date.now();
          if (now - lastPong > HEARTBEAT_INTERVAL * 2) {
            // Connection is stale, trigger reconnection
            sendBack({ type: 'WS_ERROR', error: 'Heartbeat timeout' });
          }
        }
      }, HEARTBEAT_INTERVAL);
    };

    const connect = () => {
      try {
        ws = new WebSocket(input.wsUrl);

        ws.onopen = () => {
          lastPong = Date.now();
          sendBack({ type: 'WS_CONNECTED' });
          startHeartbeat();
        };

        ws.onclose = () => {
          sendBack({ type: 'WS_DISCONNECTED' });
        };

        ws.onerror = () => {
          sendBack({ type: 'WS_ERROR', error: 'WebSocket connection error' });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Handle pong response for heartbeat
            if (message.type === 'pong') {
              lastPong = Date.now();
              return;
            }

            if (message.type === 'epics:updated' && message.data) {
              sendBack({ type: 'EPICS_UPDATED', epics: message.data });
            } else if (message.type === 'story:updated' && message.data) {
              sendBack({ type: 'STORY_UPDATED', story: message.data });
            } else if (message.type === 'sessions:updated' && message.sessions) {
              sendBack({ type: 'SESSIONS_UPDATED', sessions: message.sessions });
            }
          } catch {
            // Ignore malformed messages
          }
        };
      } catch {
        sendBack({ type: 'WS_ERROR', error: 'Failed to create WebSocket' });
      }
    };

    // Handle incoming events from the machine
    receive((event) => {
      if (event.type === 'SUBSCRIBE_STORY') {
        sendMessage({
          type: 'subscribe:story',
          epicSlug: event.epicSlug,
          storySlug: event.storySlug,
        });
      } else if (event.type === 'UNSUBSCRIBE_STORY') {
        sendMessage({
          type: 'unsubscribe:story',
          epicSlug: event.epicSlug,
          storySlug: event.storySlug,
        });
      }
    });

    connect();

    return () => {
      // Cleanup global reference
      wsSendFn = null;

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }
);

/** Dashboard state machine using XState v5 setup */
export const dashboardMachine = setup({
  types: {
    context: {} as DashboardContext,
    events: {} as DashboardEvent,
  },
  actors: {
    websocket: websocketActor,
  },
  actions: {
    setEpics: assign({
      epics: (_, params: { epics: EpicSummary[] }) => params.epics,
    }),
    setCurrentEpic: assign({
      currentEpic: (_, params: { epic: Epic }) => params.epic,
    }),
    setCurrentStory: assign({
      currentStory: (_, params: { story: StoryDetail }) => params.story,
    }),
    setSessions: assign({
      sessions: (_, params: { sessions: SessionInfo[] }) => params.sessions,
    }),
    updateSessions: assign({
      sessions: (_, params: { sessions: SessionInfo[] }) => params.sessions,
    }),
    clearCurrentEpic: assign({
      currentEpic: () => null,
    }),
    clearCurrentStory: assign({
      currentStory: () => null,
    }),
    setError: assign({
      error: (_, params: { error: string }) => params.error,
    }),
    clearError: assign({
      error: () => null,
    }),
    incrementRetryCount: assign({
      retryCount: ({ context }) => context.retryCount + 1,
    }),
    resetRetryCount: assign({
      retryCount: () => 0,
    }),
    updateEpics: assign({
      epics: (_, params: { epics: EpicSummary[] }) => params.epics,
    }),
    updateStory: assign({
      currentStory: ({ context }, params: { story: StoryDetail }) => {
        if (
          context.currentStory &&
          context.currentStory.slug === params.story.slug &&
          context.currentStory.epicSlug === params.story.epicSlug
        ) {
          return params.story;
        }
        return context.currentStory;
      },
    }),
    addSubscription: assign({
      subscribedStories: (
        { context },
        params: { epicSlug: string; storySlug: string }
      ) => {
        const exists = context.subscribedStories.some(
          (s) => s.epicSlug === params.epicSlug && s.storySlug === params.storySlug
        );
        if (exists) return context.subscribedStories;
        return [...context.subscribedStories, params];
      },
    }),
    removeSubscription: assign({
      subscribedStories: (
        { context },
        params: { epicSlug: string; storySlug: string }
      ) => {
        return context.subscribedStories.filter(
          (s) => !(s.epicSlug === params.epicSlug && s.storySlug === params.storySlug)
        );
      },
    }),
  },
  guards: {
    canRetry: ({ context }) => context.retryCount < MAX_RETRIES,
    hasMaxRetries: ({ context }) => context.retryCount >= MAX_RETRIES,
  },
  delays: {
    backoffDelay: ({ context }) => getBackoffDelay(context.retryCount),
  },
}).createMachine({
  id: 'dashboard',
  initial: 'idle',
  context: {
    epics: [],
    currentEpic: null,
    currentStory: null,
    sessions: [],
    error: null,
    retryCount: 0,
    wsUrl: `ws://localhost:3847`,
    subscribedStories: [],
  },
  states: {
    idle: {
      on: {
        CONNECT: {
          target: 'loading',
          actions: ['clearError', 'resetRetryCount'],
        },
        // Allow data events in idle state so REST API fetching works
        // without requiring WebSocket connection
        EPICS_LOADED: {
          actions: [
            {
              type: 'setEpics',
              params: ({ event }) => ({ epics: event.epics }),
            },
          ],
        },
        EPIC_LOADED: {
          actions: [
            {
              type: 'setCurrentEpic',
              params: ({ event }) => ({ epic: event.epic }),
            },
          ],
        },
        STORY_LOADED: {
          actions: [
            {
              type: 'setCurrentStory',
              params: ({ event }) => ({ story: event.story }),
            },
          ],
        },
        SESSIONS_LOADED: {
          actions: [
            {
              type: 'setSessions',
              params: ({ event }) => ({ sessions: event.sessions }),
            },
          ],
        },
        SESSIONS_UPDATED: {
          actions: [
            {
              type: 'updateSessions',
              params: ({ event }) => ({ sessions: event.sessions }),
            },
          ],
        },
        CLEAR_EPIC: {
          actions: ['clearCurrentEpic'],
        },
        CLEAR_STORY: {
          actions: ['clearCurrentStory'],
        },
      },
    },
    loading: {
      entry: ['clearError'],
      invoke: {
        id: 'websocket',
        src: 'websocket',
        input: ({ context }) => ({ wsUrl: context.wsUrl }),
      },
      on: {
        WS_CONNECTED: {
          target: 'connected',
          actions: ['resetRetryCount'],
        },
        WS_ERROR: {
          target: 'error',
          actions: [
            {
              type: 'setError',
              params: ({ event }) => ({ error: event.error }),
            },
          ],
        },
        WS_DISCONNECTED: {
          target: 'reconnecting',
        },
      },
    },
    connected: {
      invoke: {
        id: 'websocket',
        src: 'websocket',
        input: ({ context }) => ({ wsUrl: context.wsUrl }),
      },
      on: {
        DISCONNECT: {
          target: 'idle',
        },
        EPICS_LOADED: {
          actions: [
            {
              type: 'setEpics',
              params: ({ event }) => ({ epics: event.epics }),
            },
          ],
        },
        EPIC_LOADED: {
          actions: [
            {
              type: 'setCurrentEpic',
              params: ({ event }) => ({ epic: event.epic }),
            },
          ],
        },
        STORY_LOADED: {
          actions: [
            {
              type: 'setCurrentStory',
              params: ({ event }) => ({ story: event.story }),
            },
          ],
        },
        CLEAR_EPIC: {
          actions: ['clearCurrentEpic'],
        },
        CLEAR_STORY: {
          actions: ['clearCurrentStory'],
        },
        EPICS_UPDATED: {
          actions: [
            {
              type: 'updateEpics',
              params: ({ event }) => ({ epics: event.epics }),
            },
          ],
        },
        STORY_UPDATED: {
          actions: [
            {
              type: 'updateStory',
              params: ({ event }) => ({ story: event.story }),
            },
          ],
        },
        SESSIONS_LOADED: {
          actions: [
            {
              type: 'setSessions',
              params: ({ event }) => ({ sessions: event.sessions }),
            },
          ],
        },
        SESSIONS_UPDATED: {
          actions: [
            {
              type: 'updateSessions',
              params: ({ event }) => ({ sessions: event.sessions }),
            },
          ],
        },
        WS_DISCONNECTED: {
          target: 'reconnecting',
        },
        WS_ERROR: {
          target: 'reconnecting',
          actions: [
            {
              type: 'setError',
              params: ({ event }) => ({ error: event.error }),
            },
          ],
        },
        ERROR: {
          actions: [
            {
              type: 'setError',
              params: ({ event }) => ({ error: event.error }),
            },
          ],
        },
        SUBSCRIBE_STORY: {
          actions: [
            {
              type: 'addSubscription',
              params: ({ event }) => ({
                epicSlug: event.epicSlug,
                storySlug: event.storySlug,
              }),
            },
          ],
        },
        UNSUBSCRIBE_STORY: {
          actions: [
            {
              type: 'removeSubscription',
              params: ({ event }) => ({
                epicSlug: event.epicSlug,
                storySlug: event.storySlug,
              }),
            },
          ],
        },
      },
    },
    reconnecting: {
      entry: ['incrementRetryCount'],
      after: {
        backoffDelay: [
          {
            target: 'loading',
            guard: 'canRetry',
          },
          {
            target: 'error',
            guard: 'hasMaxRetries',
            actions: [
              {
                type: 'setError',
                params: () => ({
                  error: 'Maximum reconnection attempts reached',
                }),
              },
            ],
          },
        ],
      },
      on: {
        RETRY: {
          target: 'loading',
          actions: ['resetRetryCount'],
        },
        DISCONNECT: {
          target: 'idle',
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: 'loading',
          actions: ['clearError', 'resetRetryCount'],
        },
        DISCONNECT: {
          target: 'idle',
        },
        CONNECT: {
          target: 'loading',
          actions: ['clearError', 'resetRetryCount'],
        },
      },
    },
  },
});

export type DashboardMachine = typeof dashboardMachine;
