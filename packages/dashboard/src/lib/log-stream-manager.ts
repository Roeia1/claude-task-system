/**
 * LogStreamManager - WebSocket-based log streaming infrastructure
 *
 * Manages file watchers and client subscriptions for real-time log delivery.
 * Used by the dashboard to stream session JSONL output files to connected clients.
 *
 * Features:
 * - File watching with chokidar for immediate change detection
 * - Reference counting for efficient watcher sharing
 * - Line-based JSONL parsing with incremental delivery (only new lines sent)
 * - Session completion notifications
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FSWatcher } from 'chokidar';
import chokidar from 'chokidar';
import type { WebSocket } from 'ws';
import { OUTPUT_DIR } from './sessions.ts';

/**
 * A parsed JSONL message (either SagaWorkerMessage or SDKMessage)
 */
type WorkerMessage = Record<string, unknown>;

/**
 * Callback type for sending log data to a specific client
 */
type SendToClientFn = (ws: WebSocket, message: LogsDataMessage | LogsErrorMessage) => void;

/**
 * Message format for log data sent to clients
 */
interface LogsDataMessage {
  type: 'logs:data';
  sessionName: string;
  messages: WorkerMessage[];
  isInitial: boolean;
  isComplete: boolean;
}

/**
 * Message format for log subscription errors
 */
interface LogsErrorMessage {
  type: 'logs:error';
  sessionName: string;
  error: string;
}

/**
 * Parse JSONL content into an array of typed message objects.
 * Skips empty lines and lines that are not valid JSON.
 */
function parseJsonlLines(content: string): WorkerMessage[] {
  const messages: WorkerMessage[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      messages.push(JSON.parse(trimmed));
    } catch {
      // Skip invalid JSON lines
    }
  }
  return messages;
}

/**
 * Count non-empty lines in content (for tracking line position)
 */
function countLines(content: string): number {
  if (!content) {
    return 0;
  }
  const lines = content.split('\n');
  let count = 0;
  for (const line of lines) {
    if (line.trim()) {
      count++;
    }
  }
  return count;
}

/**
 * LogStreamManager class
 *
 * Manages all log streaming state including file watchers, line positions,
 * and client subscriptions. Uses dependency injection for the send function
 * to allow testing and decoupling from the WebSocket server.
 */
class LogStreamManager {
  /**
   * Active file watchers indexed by session name
   */
  private readonly watchers: Map<string, FSWatcher> = new Map();

  /**
   * Current line count per session for incremental reads
   */
  private readonly lineCounts: Map<string, number> = new Map();

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
   */
  getSubscriptionCount(sessionName: string): number {
    const subs = this.subscriptions.get(sessionName);
    return subs ? subs.size : 0;
  }

  /**
   * Check if a watcher exists for a session
   */
  hasWatcher(sessionName: string): boolean {
    return this.watchers.has(sessionName);
  }

  /**
   * Get the current line count for a session
   */
  getLineCount(sessionName: string): number {
    return this.lineCounts.get(sessionName) ?? 0;
  }

  /**
   * Subscribe a client to a session's log stream
   *
   * Reads the full file, parses all JSONL lines, and sends them as the initial message.
   * Adds the client to the subscription set for incremental updates.
   * Creates a file watcher if this is the first subscriber.
   */
  async subscribe(sessionName: string, ws: WebSocket): Promise<void> {
    const outputFile = join(OUTPUT_DIR, `${sessionName}.jsonl`);

    if (!existsSync(outputFile)) {
      this.sendToClient(ws, {
        type: 'logs:error',
        sessionName,
        error: `Output file not found: ${outputFile}`,
      });
      return;
    }

    const content = await readFile(outputFile, 'utf-8');
    const messages = parseJsonlLines(content);

    this.sendToClient(ws, {
      type: 'logs:data',
      sessionName,
      messages,
      isInitial: true,
      isComplete: false,
    });

    // Track line count for incremental reads
    this.lineCounts.set(sessionName, countLines(content));

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
   */
  private cleanupWatcher(sessionName: string): void {
    const watcher = this.watchers.get(sessionName);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sessionName);
    }
    this.lineCounts.delete(sessionName);
    this.subscriptions.delete(sessionName);
  }

  /**
   * Send incremental content to all subscribed clients for a session.
   * Reads the full file, extracts lines beyond the last known count,
   * parses them as JSONL, and sends to all subscribers.
   */
  private async sendIncrementalContent(sessionName: string, outputFile: string): Promise<void> {
    const lastLineCount = this.lineCounts.get(sessionName) ?? 0;

    let content: string;
    try {
      content = await readFile(outputFile, 'utf-8');
    } catch {
      return;
    }

    const allLines = content.split('\n');
    const nonEmptyLines = allLines.filter((l) => l.trim());
    const currentLineCount = nonEmptyLines.length;

    if (currentLineCount <= lastLineCount) {
      return;
    }

    // Get only the new lines
    const newLines = nonEmptyLines.slice(lastLineCount);
    const newMessages: WorkerMessage[] = [];
    for (const line of newLines) {
      try {
        newMessages.push(JSON.parse(line));
      } catch {
        // Skip invalid JSON lines
      }
    }

    // Update line count
    this.lineCounts.set(sessionName, currentLineCount);

    // Send to all subscribed clients
    const subs = this.subscriptions.get(sessionName);
    if (subs) {
      const message: LogsDataMessage = {
        type: 'logs:data',
        sessionName,
        messages: newMessages,
        isInitial: false,
        isComplete: false,
      };
      for (const ws of subs) {
        this.sendToClient(ws, message);
      }
    }
  }

  /**
   * Unsubscribe a client from a session's log stream
   */
  unsubscribe(sessionName: string, ws: WebSocket): void {
    const subs = this.subscriptions.get(sessionName);
    if (subs) {
      subs.delete(ws);
      if (subs.size === 0) {
        this.cleanupWatcher(sessionName);
      }
    }
  }

  /**
   * Handle client disconnect by removing from all subscriptions
   */
  handleClientDisconnect(ws: WebSocket): void {
    for (const [sessionName, subs] of this.subscriptions) {
      subs.delete(ws);
      if (subs.size === 0) {
        this.cleanupWatcher(sessionName);
      }
    }
  }

  /**
   * Notify that a session has completed
   *
   * Reads any remaining lines from the file and sends them with isComplete=true
   * to all subscribed clients, then cleans up the watcher.
   */
  async notifySessionCompleted(sessionName: string): Promise<void> {
    const subs = this.subscriptions.get(sessionName);

    if (!subs || subs.size === 0) {
      return;
    }

    const outputFile = join(OUTPUT_DIR, `${sessionName}.jsonl`);
    const finalMessages: WorkerMessage[] = [];

    try {
      if (existsSync(outputFile)) {
        const content = await readFile(outputFile, 'utf-8');
        const lastLineCount = this.lineCounts.get(sessionName) ?? 0;
        const nonEmptyLines = content.split('\n').filter((l) => l.trim());
        const currentLineCount = nonEmptyLines.length;

        if (currentLineCount > lastLineCount) {
          const newLines = nonEmptyLines.slice(lastLineCount);
          for (const line of newLines) {
            try {
              finalMessages.push(JSON.parse(line));
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch {
      // File might have been deleted or is inaccessible
    }

    const message: LogsDataMessage = {
      type: 'logs:data',
      sessionName,
      messages: finalMessages,
      isInitial: false,
      isComplete: true,
    };

    for (const ws of subs) {
      this.sendToClient(ws, message);
    }

    this.cleanupWatcher(sessionName);
  }

  /**
   * Clean up all watchers and subscriptions
   */
  async dispose(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    for (const [, watcher] of this.watchers) {
      closePromises.push(watcher.close());
    }
    await Promise.all(closePromises);

    this.watchers.clear();
    this.lineCounts.clear();
    this.subscriptions.clear();
  }
}

export { LogStreamManager };
export type { LogsDataMessage, LogsErrorMessage, SendToClientFn, WorkerMessage };
