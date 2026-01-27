import { setup, assign, fromCallback } from 'xstate';
import type { EpicSummary, Epic, StoryDetail } from '@/types/dashboard';

/** Maximum number of reconnection attempts */
const MAX_RETRIES = 5;

/** Base delay for exponential backoff (ms) */
const BASE_DELAY = 1000;

/** Calculate exponential backoff delay */
function getBackoffDelay(retryCount: number): number {
  return Math.min(BASE_DELAY * Math.pow(2, retryCount), 30000);
}

/** Dashboard machine context */
export interface DashboardContext {
  epics: EpicSummary[];
  currentEpic: Epic | null;
  currentStory: StoryDetail | null;
  error: string | null;
  retryCount: number;
  wsUrl: string;
}

/** Dashboard machine events */
export type DashboardEvent =
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
  | { type: 'ERROR'; error: string };

/** WebSocket actor logic */
const websocketActor = fromCallback<DashboardEvent, { wsUrl: string }>(
  ({ sendBack, input }) => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(input.wsUrl);

        ws.onopen = () => {
          sendBack({ type: 'WS_CONNECTED' });
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
            if (message.type === 'epics:updated' && message.data) {
              sendBack({ type: 'EPICS_UPDATED', epics: message.data });
            } else if (message.type === 'story:updated' && message.data) {
              sendBack({ type: 'STORY_UPDATED', story: message.data });
            }
          } catch {
            // Ignore malformed messages
          }
        };
      } catch {
        sendBack({ type: 'WS_ERROR', error: 'Failed to create WebSocket' });
      }
    };

    connect();

    return () => {
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
    wsUrl: `ws://localhost:3847`,
  },
  states: {
    idle: {
      on: {
        CONNECT: {
          target: 'loading',
          actions: ['clearError', 'resetRetryCount'],
        },
      },
    },
    loading: {
      entry: ['clearError'],
      invoke: {
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
