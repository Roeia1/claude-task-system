import { assign, fromCallback, setup } from 'xstate';
import type { Epic, EpicSummary, StoryDetail } from '@/types/dashboard';

/** Maximum number of reconnection attempts */
const MAX_RETRIES = 5;

/**
 * Get WebSocket URL based on current page location.
 * Uses the same host and port as the HTTP server.
 */
function getWebSocketUrl(): string {
  if (typeof window === 'undefined') {
    return 'ws://localhost:3847'; // Default for SSR/testing
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

/** Base delay for exponential backoff (ms) */
const BASE_DELAY = 1000;

/** Heartbeat interval in ms (30 seconds) */
const HEARTBEAT_INTERVAL = 30_000;

/** Maximum backoff delay in ms (30 seconds) */
const MAX_BACKOFF_DELAY = 30_000;

/** Calculate exponential backoff delay */
function getBackoffDelay(retryCount: number): number {
  return Math.min(BASE_DELAY * 2 ** retryCount, MAX_BACKOFF_DELAY);
}

/** Story subscription identifier */
interface StorySubscription {
  epicSlug: string;
  storySlug: string;
}

/** Dashboard machine context */
interface DashboardContext {
  epics: EpicSummary[];
  currentEpic: Epic | null;
  currentStory: StoryDetail | null;
  error: string | null;
  retryCount: number;
  wsUrl: string;
  subscribedStories: StorySubscription[];
}

/** Dashboard machine events */
type DashboardEvent =
  | { type: 'CONNECT' }
  | { type: 'DISCONNECT' }
  | { type: 'EPICS_LOADED'; epics: EpicSummary[] }
  | { type: 'EPIC_LOADED'; epic: Epic }
  | { type: 'STORY_LOADED'; story: StoryDetail }
  | { type: 'WS_CONNECTED' }
  | { type: 'WS_DISCONNECTED' }
  | { type: 'WS_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'EPICS_UPDATED'; epics: EpicSummary[] }
  | { type: 'STORY_UPDATED'; story: StoryDetail }
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
function getWebSocketSend(): WebSocketSendFn | null {
  return wsSendFn;
}

/** Helper to handle WebSocket messages */
function handleWebSocketMessage(
  wsEvent: MessageEvent,
  lastPongRef: { value: number },
  sendBack: (event: DashboardEvent) => void,
): void {
  try {
    const message = JSON.parse(wsEvent.data);
    // Server sends messages with 'event' property (e.g., { event: 'epics:updated', data: ... })
    const messageType = message.event || message.type;
    if (messageType === 'pong') {
      lastPongRef.value = Date.now();
      return;
    }
    if (messageType === 'epics:updated' && message.data) {
      sendBack({ type: 'EPICS_UPDATED', epics: message.data });
    } else if (messageType === 'story:updated' && message.data) {
      sendBack({ type: 'STORY_UPDATED', story: message.data });
    }
  } catch {
    // Ignore malformed messages
  }
}

/** Helper to handle incoming events from the machine */
function handleReceivedEvent(event: DashboardEvent, sendMessage: (msg: object) => void): void {
  if (event.type === 'SUBSCRIBE_STORY') {
    sendMessage({ type: 'subscribe:story', epicSlug: event.epicSlug, storySlug: event.storySlug });
  } else if (event.type === 'UNSUBSCRIBE_STORY') {
    sendMessage({
      type: 'unsubscribe:story',
      epicSlug: event.epicSlug,
      storySlug: event.storySlug,
    });
  }
}

/** WebSocket actor logic with heartbeat and subscription support */
const websocketActor = fromCallback<DashboardEvent, { wsUrl: string }>(
  ({ sendBack, input, receive }) => {
    let ws: WebSocket | null = null;
    const reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    const lastPongRef = { value: Date.now() };

    const sendMessage = (message: object) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    };
    wsSendFn = sendMessage;

    const startHeartbeat = () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      heartbeatInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          sendMessage({ type: 'ping' });
          if (Date.now() - lastPongRef.value > HEARTBEAT_INTERVAL * 2) {
            sendBack({ type: 'WS_ERROR', error: 'Heartbeat timeout' });
          }
        }
      }, HEARTBEAT_INTERVAL);
    };

    const connect = () => {
      try {
        ws = new WebSocket(input.wsUrl);
        ws.onopen = () => {
          lastPongRef.value = Date.now();
          sendBack({ type: 'WS_CONNECTED' });
          startHeartbeat();
        };
        ws.onclose = () => sendBack({ type: 'WS_DISCONNECTED' });
        ws.onerror = () => sendBack({ type: 'WS_ERROR', error: 'WebSocket connection error' });
        ws.onmessage = (event) => handleWebSocketMessage(event, lastPongRef, sendBack);
      } catch {
        sendBack({ type: 'WS_ERROR', error: 'Failed to create WebSocket' });
      }
    };

    receive((event) => handleReceivedEvent(event, sendMessage));
    connect();

    return () => {
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
  },
);

/** Dashboard state machine using XState v5 setup */
const dashboardMachine = setup({
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
      subscribedStories: ({ context }, params: { epicSlug: string; storySlug: string }) => {
        const exists = context.subscribedStories.some(
          (s) => s.epicSlug === params.epicSlug && s.storySlug === params.storySlug,
        );
        if (exists) {
          return context.subscribedStories;
        }
        return [...context.subscribedStories, params];
      },
    }),
    removeSubscription: assign({
      subscribedStories: ({ context }, params: { epicSlug: string; storySlug: string }) => {
        return context.subscribedStories.filter(
          (s) => !(s.epicSlug === params.epicSlug && s.storySlug === params.storySlug),
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
    error: null,
    retryCount: 0,
    wsUrl: getWebSocketUrl(),
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

type DashboardMachine = typeof dashboardMachine;

export { dashboardMachine, getWebSocketSend };
export type { StorySubscription, DashboardContext, DashboardEvent, DashboardMachine };
