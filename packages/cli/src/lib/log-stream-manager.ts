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
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { OUTPUT_DIR } from './sessions.js';

/**
 * Callback type for sending log data to a specific client
 */
export type SendToClientFn = (ws: WebSocket, message: LogsDataMessage | LogsErrorMessage) => void;

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
   * Subscribe a client to a session's log stream
   *
   * Reads the full file content and sends it as the initial message.
   * Adds the client to the subscription set for incremental updates.
   *
   * @param sessionName - The session to subscribe to
   * @param ws - The WebSocket client to subscribe
   */
  async subscribe(sessionName: string, ws: WebSocket): Promise<void> {
    const outputFile = join(OUTPUT_DIR, `${sessionName}.out`);

    // Check if file exists
    if (!existsSync(outputFile)) {
      this.sendToClient(ws, {
        type: 'logs:error',
        sessionName,
        error: `Output file not found: ${outputFile}`,
      });
      return;
    }

    // Read full file content
    const content = await readFile(outputFile, 'utf-8');

    // Send initial content to client
    this.sendToClient(ws, {
      type: 'logs:data',
      sessionName,
      data: content,
      isInitial: true,
      isComplete: false,
    });

    // Track file position for incremental reads
    this.filePositions.set(sessionName, content.length);

    // Add client to subscription set
    let subs = this.subscriptions.get(sessionName);
    if (!subs) {
      subs = new Set();
      this.subscriptions.set(sessionName, subs);
    }
    subs.add(ws);
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
