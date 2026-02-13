/**
 * JSONL message writer for the worker pipeline.
 *
 * Writes messages as newline-delimited JSON to a file, one JSON object per line.
 * Uses appendFileSync for atomic small writes that are safe for incremental reading.
 */

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { SagaWorkerMessage } from '../../schemas/index.ts';

export type WorkerMessage = SagaWorkerMessage | SDKMessage;

export interface MessageWriter {
  write(message: WorkerMessage): void;
}

/**
 * Create a file-backed message writer that appends JSONL to the given path.
 * Lazily creates parent directories on first write.
 */
export function createFileMessageWriter(filePath: string): MessageWriter {
  let dirCreated = false;

  return {
    write(message: WorkerMessage): void {
      if (!dirCreated) {
        mkdirSync(dirname(filePath), { recursive: true });
        dirCreated = true;
      }
      appendFileSync(filePath, `${JSON.stringify(message)}\n`);
    },
  };
}

/**
 * Create a no-op message writer that discards all messages.
 * Used when no --messages-file flag is provided.
 */
export function createNoopMessageWriter(): MessageWriter {
  return {
    write() {
      // intentionally empty - discard all messages
    },
  };
}
