/**
 * WebSocket Server Module
 *
 * Provides real-time updates to connected dashboard clients.
 * Attaches to the existing HTTP server to share the same port as Express.
 *
 * Server → Client events:
 * - epics:updated: Broadcasts full epic list when any epic changes
 * - story:updated: Broadcasts story detail to subscribed clients when a story changes
 *
 * Client → Server events:
 * - subscribe:story: Subscribe to updates for a specific story
 * - unsubscribe:story: Unsubscribe from story updates
 */

import type { Server as HttpServer } from 'node:http';
import { join, relative } from 'node:path';
import { type RawData, WebSocket, WebSocketServer } from 'ws';

// ============================================================================
// Constants
// ============================================================================

/** Heartbeat interval for checking client connections (30 seconds) */
const HEARTBEAT_INTERVAL_MS = 30_000;
import {
  LogStreamManager,
  type LogsDataMessage,
  type LogsErrorMessage,
} from '../lib/log-stream-manager.ts';
import {
  type SessionsUpdatedMessage,
  startSessionPolling,
  stopSessionPolling,
} from '../lib/session-polling.ts';
import {
  type EpicSummary,
  parseJournal,
  parseStory,
  type StoryDetail,
  scanSagaDirectory,
} from './parser.ts';
import { createSagaWatcher, type SagaWatcher, type WatcherEvent } from './watcher.ts';

/**
 * Subscription key for a story
 */
type StoryKey = `${string}:${string}`;

/**
 * Client connection state
 */
interface ClientState {
  ws: WebSocket;
  subscribedStories: Set<StoryKey>;
  isAlive: boolean;
}

/**
 * WebSocket server instance
 */
export interface WebSocketInstance {
  /** Broadcast epics:updated to all clients */
  broadcastEpicsUpdated(epics: EpicSummary[]): void;
  /** Broadcast story:updated to subscribed clients */
  broadcastStoryUpdated(story: StoryDetail): void;
  /** Close the WebSocket server */
  close(): Promise<void>;
}

/**
 * Message received from client
 */
interface ClientMessage {
  event: string;
  data?: {
    epicSlug?: string;
    storySlug?: string;
    sessionName?: string;
  };
}

/**
 * Message sent to client
 */
interface ServerMessage {
  event: string;
  data: unknown;
}

/**
 * Create a story key from epic and story slugs
 */
function makeStoryKey(epicSlug: string, storySlug: string): StoryKey {
  return `${epicSlug}:${storySlug}`;
}

/**
 * Convert Epic to EpicSummary (remove stories and content)
 */
function toEpicSummary(epic: {
  slug: string;
  title: string;
  storyCounts: EpicSummary['storyCounts'];
  path: string;
}): EpicSummary {
  return {
    slug: epic.slug,
    title: epic.title,
    storyCounts: epic.storyCounts,
    path: epic.path,
  };
}

/**
 * Create and attach WebSocket server to HTTP server
 *
 * @param httpServer - The HTTP server to attach to
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @returns WebSocketInstance for broadcasting updates
 */
export async function createWebSocketServer(
  httpServer: HttpServer,
  sagaRoot: string,
): Promise<WebSocketInstance> {
  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ server: httpServer });

  // Track connected clients
  const clients = new Map<WebSocket, ClientState>();

  // Create file watcher
  let watcher: SagaWatcher | null = null;

  try {
    watcher = await createSagaWatcher(sagaRoot);
  } catch (_err) {
    // Continue without file watching - watcher creation may fail if
    // the .saga directory doesn't exist or has permission issues
  }

  // Heartbeat interval (30 seconds)
  const heartbeatInterval = setInterval(() => {
    for (const [ws, state] of clients) {
      if (!state.isAlive) {
        // Connection didn't respond to last ping, terminate
        clients.delete(ws);
        ws.terminate();
        continue;
      }

      state.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Helper to send message to client
  function sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Helper to send log messages to a specific client
  function sendLogMessage(ws: WebSocket, message: LogsDataMessage | LogsErrorMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: message.type, data: message }));
    }
  }

  // Create LogStreamManager for real-time log streaming
  const logStreamManager = new LogStreamManager(sendLogMessage);

  // Helper to broadcast to all clients
  function broadcast(message: ServerMessage): void {
    for (const [ws] of clients) {
      sendToClient(ws, message);
    }
  }

  // Track previous session states to detect completions
  let previousSessionStates = new Map<string, 'running' | 'completed'>();

  // Start session polling and broadcast updates to all clients
  startSessionPolling((msg: SessionsUpdatedMessage) => {
    broadcast({ event: msg.type, data: msg.sessions });

    // Detect sessions that transitioned to completed and notify log stream manager
    const currentStates = new Map<string, 'running' | 'completed'>();
    for (const session of msg.sessions) {
      currentStates.set(session.name, session.status);

      // Check if this session just completed
      const previousStatus = previousSessionStates.get(session.name);
      if (previousStatus === 'running' && session.status === 'completed') {
        logStreamManager.notifySessionCompleted(session.name);
      }
    }
    previousSessionStates = currentStates;
  });

  // Helper to broadcast to clients subscribed to a story
  function broadcastToSubscribers(storyKey: StoryKey, message: ServerMessage): void {
    for (const [ws, state] of clients) {
      if (state.subscribedStories.has(storyKey)) {
        sendToClient(ws, message);
      }
    }
  }

  // Handle new connections
  wss.on('connection', (ws: WebSocket) => {
    // Initialize client state
    const state: ClientState = {
      ws,
      subscribedStories: new Set(),
      isAlive: true,
    };
    clients.set(ws, state);

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      state.isAlive = true;
    });

    // Handle messages from client
    ws.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;

        if (!message.event) {
          return; // Ignore messages without event
        }

        switch (message.event) {
          case 'subscribe:story': {
            const { epicSlug, storySlug } = message.data || {};
            if (epicSlug && storySlug) {
              const key = makeStoryKey(epicSlug, storySlug);
              state.subscribedStories.add(key);
            }
            break;
          }

          case 'unsubscribe:story': {
            const { epicSlug, storySlug } = message.data || {};
            if (epicSlug && storySlug) {
              const key = makeStoryKey(epicSlug, storySlug);
              state.subscribedStories.delete(key);
            }
            break;
          }

          case 'subscribe:logs': {
            const { sessionName } = message.data || {};
            if (sessionName) {
              logStreamManager.subscribe(sessionName, ws);
            }
            break;
          }

          case 'unsubscribe:logs': {
            const { sessionName } = message.data || {};
            if (sessionName) {
              logStreamManager.unsubscribe(sessionName, ws);
            }
            break;
          }

          default:
            // Unknown event, ignore
            break;
        }
      } catch (_err) {
        // Malformed JSON message from client - ignore silently
        // Clients may send invalid JSON during connection issues
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      clients.delete(ws);
      logStreamManager.handleClientDisconnect(ws);
    });

    // Handle errors
    ws.on('error', (_err) => {
      clients.delete(ws);
      logStreamManager.handleClientDisconnect(ws);
    });
  });

  // Handle watcher events
  if (watcher) {
    // Epic events - broadcast full epic list
    const handleEpicChange = async () => {
      try {
        const epics = await scanSagaDirectory(sagaRoot);
        const summaries = epics.map(toEpicSummary);
        broadcast({ event: 'epics:updated', data: summaries });
      } catch (_err) {
        // Silently ignore epic scanning errors - directory may be temporarily unavailable
      }
    };

    watcher.on('epic:added', handleEpicChange);
    watcher.on('epic:changed', handleEpicChange);
    watcher.on('epic:removed', handleEpicChange);

    // Story events - broadcast to subscribed clients
    const handleStoryChange = async (event: WatcherEvent) => {
      const { epicSlug, storySlug, archived } = event;
      if (!storySlug) {
        return;
      }

      const storyKey = makeStoryKey(epicSlug, storySlug);

      // Check if any client is subscribed to this story
      let hasSubscribers = false;
      for (const [, state] of clients) {
        if (state.subscribedStories.has(storyKey)) {
          hasSubscribers = true;
          break;
        }
      }

      if (!hasSubscribers) {
        // Also trigger epics:updated for story changes (counts may change)
        await handleEpicChange();
        return;
      }

      try {
        // Parse the updated story
        const storyPath = archived
          ? join(sagaRoot, '.saga', 'archive', epicSlug, storySlug, 'story.md')
          : join(sagaRoot, '.saga', 'epics', epicSlug, 'stories', storySlug, 'story.md');

        const story = await parseStory(storyPath, epicSlug);

        if (story) {
          // Make paths relative
          story.paths.storyMd = relative(sagaRoot, story.paths.storyMd);
          if (story.paths.journalMd) {
            story.paths.journalMd = relative(sagaRoot, story.paths.journalMd);
          }

          story.archived = archived;

          // Parse journal if it exists
          if (story.paths.journalMd) {
            const journalPath = join(sagaRoot, story.paths.journalMd);
            const journal = await parseJournal(journalPath);
            if (journal.length > 0) {
              story.journal = journal;
            }
          }

          // Broadcast to subscribed clients
          broadcastToSubscribers(storyKey, { event: 'story:updated', data: story });
        }

        // Also trigger epics:updated (story counts may have changed)
        await handleEpicChange();
      } catch (_err) {
        // Silently ignore story parsing errors - file may be temporarily unavailable
        // during writes or may have been deleted between detection and parsing
      }
    };

    watcher.on('story:added', handleStoryChange);
    watcher.on('story:changed', handleStoryChange);
    watcher.on('story:removed', handleStoryChange);

    watcher.on('error', (_err: Error) => {
      // Silently ignore watcher errors - file watching is best-effort
      // Errors may occur during file system operations or permission changes
    });
  }

  return {
    broadcastEpicsUpdated(epics: EpicSummary[]): void {
      broadcast({ event: 'epics:updated', data: epics });
    },

    broadcastStoryUpdated(story: StoryDetail): void {
      const key = makeStoryKey(story.epicSlug, story.slug);
      broadcastToSubscribers(key, { event: 'story:updated', data: story });
    },

    async close(): Promise<void> {
      clearInterval(heartbeatInterval);

      // Stop session polling
      stopSessionPolling();

      // Dispose log stream manager (closes all file watchers)
      await logStreamManager.dispose();

      // Close all client connections
      for (const [ws] of clients) {
        ws.close();
      }
      clients.clear();

      // Close watcher
      if (watcher) {
        await watcher.close();
      }

      // Close WebSocket server
      return new Promise((resolve, reject) => {
        wss.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
  };
}
