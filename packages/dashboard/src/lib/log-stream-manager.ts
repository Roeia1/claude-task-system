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

import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { FSWatcher } from 'chokidar';
import chokidar from 'chokidar';
import type { WebSocket } from 'ws';
import { OUTPUT_DIR } from './sessions.ts';

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
  private readonly watchers: Map<string, FSWatcher> = new Map();

  /**
   * Current file position (byte offset) per session for incremental reads
   */
  private readonly filePositions: Map<string, number> = new Map();

  /**
   * Client subscriptions per session
   */
  private readonly subscriptions: Map<string, Set<WebSocket>> = new Map();

  /**
   * Function to send messages to clients
   */
  private readonly sendToClient: SendToClientFn;

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
   * Creates a file watcher if this is the first subscriber.
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

    // Create watcher if this is the first subscriber
    if (!this.watchers.has(sessionName)) {
      this.createWatcher(sessionName, outputFile);
    }
  }

  /**
   * Create a chokidar file watcher for a session's output file
   *
   * The watcher detects changes and triggers incremental content delivery
   * to all subscribed clients.
   *
   * @param sessionName - The session name
   * @param outputFile - Path to the session output file
   */
  private createWatcher(sessionName: string, outputFile: string): void {
    const watcher = chokidar.watch(outputFile, {
      persistent: true,
      awaitWriteFinish: false,
    });

    watcher.on('change', async () => {
      await this.sendIncrementalContent(sessionName, outputFile);
    });

    this.watchers.set(sessionName, watcher);
  }

  /**
   * Clean up a watcher and associated state for a session
   *
   * Closes the file watcher and removes all tracking state for the session.
   * Should be called when the last subscriber unsubscribes or disconnects.
   *
   * @param sessionName - The session to clean up
   */
  private cleanupWatcher(sessionName: string): void {
    const watcher = this.watchers.get(sessionName);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sessionName);
    }
    this.filePositions.delete(sessionName);
    this.subscriptions.delete(sessionName);
  }

  /**
   * Send incremental content to all subscribed clients for a session
   *
   * Reads from the last known position to the end of the file and sends
   * the new content to all subscribed clients.
   *
   * @param sessionName - The session name
   * @param outputFile - Path to the session output file
   */
  private async sendIncrementalContent(sessionName: string, outputFile: string): Promise<void> {
    const lastPosition = this.filePositions.get(sessionName) ?? 0;
    const fileStat = await stat(outputFile);
    const currentSize = fileStat.size;

    // No new content
    if (currentSize <= lastPosition) {
      return;
    }

    // Read new content from last position to end
    const newContent = await this.readFromPosition(outputFile, lastPosition, currentSize);

    // Update file position
    this.filePositions.set(sessionName, currentSize);

    // Send to all subscribed clients
    const subs = this.subscriptions.get(sessionName);
    if (subs) {
      const message: LogsDataMessage = {
        type: 'logs:data',
        sessionName,
        data: newContent,
        isInitial: false,
        isComplete: false,
      };
      for (const ws of subs) {
        this.sendToClient(ws, message);
      }
    }
  }

  /**
   * Read file content from a specific position
   *
   * @param filePath - Path to the file
   * @param start - Starting byte position
   * @param end - Ending byte position
   * @returns The content read from the file
   */
  private readFromPosition(filePath: string, start: number, end: number): Promise<string> {
    return new Promise((resolve, reject) => {
      let content = '';
      const stream = createReadStream(filePath, {
        start,
        end: end - 1, // createReadStream end is inclusive
        encoding: 'utf-8',
      });

      stream.on('data', (chunk) => {
        content += chunk;
      });

      stream.on('end', () => {
        resolve(content);
      });

      stream.on('error', reject);
    });
  }

  /**
   * Unsubscribe a client from a session's log stream
   *
   * Removes the client from the subscription set. If this was the last
   * subscriber, cleans up the watcher and associated state.
   *
   * @param sessionName - The session to unsubscribe from
   * @param ws - The WebSocket client to unsubscribe
   */
  unsubscribe(sessionName: string, ws: WebSocket): void {
    const subs = this.subscriptions.get(sessionName);
    if (subs) {
      subs.delete(ws);
      // If no more subscribers, clean up watcher
      if (subs.size === 0) {
        this.cleanupWatcher(sessionName);
      }
    }
  }

  /**
   * Handle client disconnect by removing from all subscriptions
   *
   * Should be called when a WebSocket connection closes to clean up
   * any subscriptions the client may have had. Also triggers watcher
   * cleanup for any sessions that no longer have subscribers.
   *
   * @param ws - The WebSocket client that disconnected
   */
  handleClientDisconnect(ws: WebSocket): void {
    // Remove client from all session subscriptions and clean up empty watchers
    for (const [sessionName, subs] of this.subscriptions) {
      subs.delete(ws);
      // If no more subscribers, clean up watcher
      if (subs.size === 0) {
        this.cleanupWatcher(sessionName);
      }
    }
  }

  /**
   * Notify that a session has completed
   *
   * Reads any remaining content from the file and sends it with isComplete=true
   * to all subscribed clients, then cleans up the watcher regardless of
   * subscription count. Called by session polling when it detects completion.
   *
   * @param sessionName - The session that has completed
   */
  async notifySessionCompleted(sessionName: string): Promise<void> {
    const subs = this.subscriptions.get(sessionName);

    // No subscribers - nothing to notify
    if (!subs || subs.size === 0) {
      return;
    }

    const outputFile = join(OUTPUT_DIR, `${sessionName}.out`);
    let finalContent = '';

    // Try to read any remaining content
    try {
      if (existsSync(outputFile)) {
        const lastPosition = this.filePositions.get(sessionName) ?? 0;
        const fileStat = await stat(outputFile);
        const currentSize = fileStat.size;

        if (currentSize > lastPosition) {
          finalContent = await this.readFromPosition(outputFile, lastPosition, currentSize);
        }
      }
    } catch {
      // File might have been deleted or is inaccessible - that's okay
      // We still need to send the completion message and clean up
    }

    // Send final message to all subscribed clients
    const message: LogsDataMessage = {
      type: 'logs:data',
      sessionName,
      data: finalContent,
      isInitial: false,
      isComplete: true,
    };

    for (const ws of subs) {
      this.sendToClient(ws, message);
    }

    // Clean up watcher and all associated state
    this.cleanupWatcher(sessionName);
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
