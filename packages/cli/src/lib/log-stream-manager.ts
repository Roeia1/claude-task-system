/**
 * LogStreamManager - WebSocket-based log streaming infrastructure
 *
 * Manages file watchers and client subscriptions for real-time log delivery.
 * Used by the dashboard to stream session output files to connected clients.
 *
 * Features:
 * - File watching with chokidar for immediate change detection
 * - Reference counting for efficient watcher sharing
 * - Incremental content delivery (only new bytes sent)
 * - Session completion notifications
 */

import type { WebSocket } from 'ws';
import type { FSWatcher } from 'chokidar';

/**
 * Callback type for sending log data to a specific client
 */
export type SendToClientFn = (ws: WebSocket, message: LogsDataMessage) => void;

/**
 * Message format for log data sent to clients
 */
export interface LogsDataMessage {
  type: 'logs:data';
  sessionName: string;
  data: string;
  isInitial: boolean;
  isComplete: boolean;
}

/**
 * Message format for log subscription errors
 */
export interface LogsErrorMessage {
  type: 'logs:error';
  sessionName: string;
  error: string;
}

/**
 * LogStreamManager class
 *
 * Manages all log streaming state including file watchers, file positions,
 * and client subscriptions. Uses dependency injection for the send function
 * to allow testing and decoupling from the WebSocket server.
 */
export class LogStreamManager {
  /**
   * Active file watchers indexed by session name
   */
  private watchers: Map<string, FSWatcher> = new Map();

  /**
   * Current file position (byte offset) per session for incremental reads
   */
  private filePositions: Map<string, number> = new Map();

  /**
   * Client subscriptions per session
   */
  private subscriptions: Map<string, Set<WebSocket>> = new Map();

  /**
   * Function to send messages to clients
   */
  private sendToClient: SendToClientFn;

  /**
   * Create a new LogStreamManager instance
   *
   * @param sendToClient - Function to send log data messages to clients
   */
  constructor(sendToClient: SendToClientFn) {
    this.sendToClient = sendToClient;
  }

  /**
   * Get the number of subscriptions for a session
   *
   * @param sessionName - The session to check
   * @returns Number of subscribed clients
   */
  getSubscriptionCount(sessionName: string): number {
    const subs = this.subscriptions.get(sessionName);
    return subs ? subs.size : 0;
  }

  /**
   * Check if a watcher exists for a session
   *
   * @param sessionName - The session to check
   * @returns True if a watcher exists
   */
  hasWatcher(sessionName: string): boolean {
    return this.watchers.has(sessionName);
  }

  /**
   * Get the current file position for a session
   *
   * @param sessionName - The session to check
   * @returns The current byte offset, or 0 if not tracked
   */
  getFilePosition(sessionName: string): number {
    return this.filePositions.get(sessionName) ?? 0;
  }

  /**
   * Clean up all watchers and subscriptions
   *
   * Call this when shutting down the server.
   */
  async dispose(): Promise<void> {
    // Close all watchers
    const closePromises: Promise<void>[] = [];
    for (const [, watcher] of this.watchers) {
      closePromises.push(watcher.close());
    }
    await Promise.all(closePromises);

    // Clear all state
    this.watchers.clear();
    this.filePositions.clear();
    this.subscriptions.clear();
  }
}
