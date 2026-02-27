/**
 * WebSocket Server Module
 *
 * Provides real-time updates to connected dashboard clients.
 * Attaches to the existing HTTP server to share the same port as Express.
 *
 * Server → Client events:
 * - epics:updated: Broadcasts full epic list when any epic changes
 * - stories:updated: Broadcasts all stories (with epicName) to all clients when any story changes
 * - story:updated: Broadcasts story detail to subscribed clients when a story changes
 *
 * Client → Server events:
 * - subscribe:story: Subscribe to updates for a specific story (by storyId)
 * - unsubscribe:story: Unsubscribe from story updates
 */

import type { Server as HttpServer } from 'node:http';
import { type RawData, WebSocket, WebSocketServer } from 'ws';

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
  getAllStoriesWithEpicNames,
  parseJournal,
  parseStory,
  resolveEpicName,
  type StoryDetail,
  scanSagaDirectory,
} from './parser.ts';
import { createSagaWatcher, type SagaWatcher, type WatcherEvent } from './watcher.ts';

// ============================================================================
// Constants
// ============================================================================

/** Heartbeat interval for checking client connections (30 seconds) */
const HEARTBEAT_INTERVAL_MS = 30_000;

// ============================================================================
// Types
// ============================================================================

/**
 * Client connection state
 */
interface ClientState {
  ws: WebSocket;
  subscribedStories: Set<string>;
  isAlive: boolean;
}

/**
 * WebSocket server instance
 */
interface WebSocketInstance {
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
    storyId?: string;
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert ParsedEpic to EpicSummary (remove stories)
 */
function toEpicSummary(epic: EpicSummary): EpicSummary {
  return {
    id: epic.id,
    title: epic.title,
    description: epic.description,
    status: epic.status,
    storyCounts: epic.storyCounts,
  };
}

/**
 * Send message to a single client
 */
function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send log messages to a specific client
 */
function sendLogMessage(ws: WebSocket, message: LogsDataMessage | LogsErrorMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: message.type, data: message }));
  }
}

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Handle story subscription message
 */
function handleStorySubscription(
  state: ClientState,
  data: ClientMessage['data'],
  subscribe: boolean,
): void {
  const { storyId } = data || {};
  if (storyId) {
    if (subscribe) {
      state.subscribedStories.add(storyId);
    } else {
      state.subscribedStories.delete(storyId);
    }
  }
}

/**
 * Handle logs subscription message
 */
function handleLogsSubscription(
  logStreamManager: LogStreamManager,
  ws: WebSocket,
  data: ClientMessage['data'],
  subscribe: boolean,
): void {
  const { sessionName } = data || {};
  if (sessionName) {
    if (subscribe) {
      logStreamManager.subscribe(sessionName, ws);
    } else {
      logStreamManager.unsubscribe(sessionName, ws);
    }
  }
}

/**
 * Process client message and dispatch to appropriate handler
 */
function processClientMessage(
  message: ClientMessage,
  state: ClientState,
  logStreamManager: LogStreamManager,
): void {
  switch (message.event) {
    case 'subscribe:story':
      handleStorySubscription(state, message.data, true);
      break;
    case 'unsubscribe:story':
      handleStorySubscription(state, message.data, false);
      break;
    case 'subscribe:logs':
      handleLogsSubscription(logStreamManager, state.ws, message.data, true);
      break;
    case 'unsubscribe:logs':
      handleLogsSubscription(logStreamManager, state.ws, message.data, false);
      break;
    default:
      // Unknown event, ignore
      break;
  }
}

// ============================================================================
// Story Change Handlers
// ============================================================================

/**
 * Check if any client is subscribed to a story
 */
function hasSubscribers(clients: Map<WebSocket, ClientState>, storyId: string): boolean {
  for (const [, state] of clients) {
    if (state.subscribedStories.has(storyId)) {
      return true;
    }
  }
  return false;
}

/**
 * Parse and enrich story data with journal and epicName
 */
async function parseAndEnrichStory(sagaRoot: string, storyId: string): Promise<StoryDetail | null> {
  const story = parseStory(sagaRoot, storyId);
  if (!story) {
    return null;
  }

  // Resolve epicName from epic title
  if (story.epic) {
    story.epicName = resolveEpicName(sagaRoot, story.epic);
  }

  // Parse journal if story has a journal path
  if (story.journalPath) {
    const journal = await parseJournal(story.journalPath);
    if (journal.length > 0) {
      story.journal = journal;
    }
  }

  return story;
}

/**
 * Handle story change event
 */
async function handleStoryChangeEvent(
  event: WatcherEvent,
  sagaRoot: string,
  clients: Map<WebSocket, ClientState>,
  broadcastToSubscribers: (storyId: string, message: ServerMessage) => void,
  handleEpicChange: () => void,
): Promise<void> {
  const { storyId } = event;
  if (!storyId) {
    return;
  }

  if (!hasSubscribers(clients, storyId)) {
    handleEpicChange();
    return;
  }

  try {
    const story = await parseAndEnrichStory(sagaRoot, storyId);

    if (story) {
      broadcastToSubscribers(storyId, { event: 'story:updated', data: story });
    }

    handleEpicChange();
  } catch {
    // Silently ignore story parsing errors
  }
}

// ============================================================================
// Connection Handlers
// ============================================================================

/**
 * Handle client message event
 */
function handleClientMessage(
  data: RawData,
  state: ClientState,
  logStreamManager: LogStreamManager,
): void {
  try {
    const message = JSON.parse(data.toString()) as ClientMessage & {
      type?: string;
    };
    // Handle ping/pong heartbeat (client sends { type: 'ping' })
    if (message.type === 'ping') {
      sendToClient(state.ws, { event: 'pong', data: null });
      return;
    }
    if (message.event) {
      processClientMessage(message, state, logStreamManager);
    }
  } catch {
    // Malformed JSON message from client - ignore silently
  }
}

/**
 * Set up event handlers for a client connection
 */
function setupClientHandlers(
  ws: WebSocket,
  state: ClientState,
  clients: Map<WebSocket, ClientState>,
  logStreamManager: LogStreamManager,
): void {
  ws.on('pong', () => {
    state.isAlive = true;
  });

  ws.on('message', (data: RawData) => {
    handleClientMessage(data, state, logStreamManager);
  });

  ws.on('close', () => {
    clients.delete(ws);
    logStreamManager.handleClientDisconnect(ws);
  });

  ws.on('error', () => {
    clients.delete(ws);
    logStreamManager.handleClientDisconnect(ws);
  });
}

/**
 * Handle new client connection
 */
function handleNewConnection(
  ws: WebSocket,
  clients: Map<WebSocket, ClientState>,
  logStreamManager: LogStreamManager,
): void {
  const state: ClientState = {
    ws,
    subscribedStories: new Set(),
    isAlive: true,
  };
  clients.set(ws, state);
  setupClientHandlers(ws, state, clients, logStreamManager);
}

// ============================================================================
// Watcher Setup
// ============================================================================

/**
 * Set up watcher event handlers
 */
function setupWatcherHandlers(
  watcher: SagaWatcher,
  sagaRoot: string,
  clients: Map<WebSocket, ClientState>,
  broadcast: (message: ServerMessage) => void,
  broadcastToSubscribers: (storyId: string, message: ServerMessage) => void,
): void {
  const handleEpicChange = () => {
    try {
      const result = scanSagaDirectory(sagaRoot);
      const summaries = result.epics.map(toEpicSummary);
      broadcast({ event: 'epics:updated', data: summaries });
    } catch {
      // Silently ignore epic scanning errors
    }
  };

  watcher.on('epic:added', handleEpicChange);
  watcher.on('epic:changed', handleEpicChange);
  watcher.on('epic:removed', handleEpicChange);

  const handleAllStoriesChange = () => {
    try {
      const allStories = getAllStoriesWithEpicNames(sagaRoot);
      broadcast({ event: 'stories:updated', data: allStories });
    } catch {
      // Silently ignore story scanning errors
    }
  };

  const handleStoryChange = (event: WatcherEvent) => {
    handleStoryChangeEvent(event, sagaRoot, clients, broadcastToSubscribers, handleEpicChange)
      .then(() => handleAllStoriesChange())
      .catch(() => {
        // Still broadcast all stories even if individual story enrichment fails
        handleAllStoriesChange();
      });
  };

  watcher.on('story:added', handleStoryChange);
  watcher.on('story:changed', handleStoryChange);
  watcher.on('story:removed', handleStoryChange);

  watcher.on('error', () => {
    // Silently ignore watcher errors - file watching is best-effort
  });
}

// ============================================================================
// Session Polling Setup
// ============================================================================

/**
 * Set up session polling with completion detection
 */
function setupSessionPolling(
  broadcast: (message: ServerMessage) => void,
  logStreamManager: LogStreamManager,
): void {
  let previousSessionStates = new Map<string, 'running' | 'completed'>();

  startSessionPolling((msg: SessionsUpdatedMessage) => {
    broadcast({ event: msg.type, data: msg.data });

    const currentStates = new Map<string, 'running' | 'completed'>();
    for (const session of msg.data) {
      currentStates.set(session.name, session.status);

      const previousStatus = previousSessionStates.get(session.name);
      if (previousStatus === 'running' && session.status === 'completed') {
        logStreamManager.notifySessionCompleted(session.name);
      }
    }
    previousSessionStates = currentStates;
  });
}

// ============================================================================
// Heartbeat Setup
// ============================================================================

/**
 * Set up heartbeat interval for checking client connections
 */
function setupHeartbeat(clients: Map<WebSocket, ClientState>): ReturnType<typeof setInterval> {
  return setInterval(() => {
    for (const [ws, state] of clients) {
      if (!state.isAlive) {
        clients.delete(ws);
        ws.terminate();
        continue;
      }
      state.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
}

// ============================================================================
// WebSocket Instance Factory
// ============================================================================

/**
 * Internal state for WebSocket server
 */
interface WebSocketServerState {
  wss: WebSocketServer;
  clients: Map<WebSocket, ClientState>;
  watcher: SagaWatcher | null;
  logStreamManager: LogStreamManager;
  heartbeatInterval: ReturnType<typeof setInterval>;
  broadcast: (message: ServerMessage) => void;
  broadcastToSubscribers: (storyId: string, message: ServerMessage) => void;
}

/**
 * Create WebSocket instance with broadcast and close methods
 */
function createWebSocketInstance(state: WebSocketServerState): WebSocketInstance {
  const {
    wss,
    clients,
    watcher,
    logStreamManager,
    heartbeatInterval,
    broadcast,
    broadcastToSubscribers,
  } = state;

  return {
    broadcastEpicsUpdated(epics: EpicSummary[]): void {
      broadcast({ event: 'epics:updated', data: epics });
    },

    broadcastStoryUpdated(story: StoryDetail): void {
      broadcastToSubscribers(story.id, { event: 'story:updated', data: story });
    },

    async close(): Promise<void> {
      clearInterval(heartbeatInterval);
      stopSessionPolling();
      await logStreamManager.dispose();

      for (const [ws] of clients) {
        ws.close();
      }
      clients.clear();

      if (watcher) {
        await watcher.close();
      }

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

// ============================================================================
// Main Factory Function
// ============================================================================

/**
 * Create and attach WebSocket server to HTTP server
 *
 * @param httpServer - The HTTP server to attach to
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @returns WebSocketInstance for broadcasting updates
 */
async function createWebSocketServer(
  httpServer: HttpServer,
  sagaRoot: string,
): Promise<WebSocketInstance> {
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map<WebSocket, ClientState>();

  let watcher: SagaWatcher | null = null;
  try {
    watcher = await createSagaWatcher(sagaRoot);
  } catch {
    // Continue without file watching
  }

  const logStreamManager = new LogStreamManager(sendLogMessage);

  const broadcast = (message: ServerMessage): void => {
    for (const [ws] of clients) {
      sendToClient(ws, message);
    }
  };

  const broadcastToSubscribers = (storyId: string, message: ServerMessage): void => {
    for (const [ws, state] of clients) {
      if (state.subscribedStories.has(storyId)) {
        sendToClient(ws, message);
      }
    }
  };

  const heartbeatInterval = setupHeartbeat(clients);
  setupSessionPolling(broadcast, logStreamManager);

  wss.on('connection', (ws: WebSocket) => {
    handleNewConnection(ws, clients, logStreamManager);
  });

  if (watcher) {
    setupWatcherHandlers(watcher, sagaRoot, clients, broadcast, broadcastToSubscribers);
  }

  return createWebSocketInstance({
    wss,
    clients,
    watcher,
    logStreamManager,
    heartbeatInterval,
    broadcast,
    broadcastToSubscribers,
  });
}

// ============================================================================
// Exports
// ============================================================================

export { createWebSocketServer };
export type { WebSocketInstance };
