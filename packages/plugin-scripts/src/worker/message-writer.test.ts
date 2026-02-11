/**
 * Tests for worker/message-writer.ts - JSONL message writer
 *
 * Tests the MessageWriter implementations:
 *   - File writer serializes messages as JSONL (one valid JSON per line)
 *   - File writer creates parent directories on first write
 *   - Multiple messages produce multiple lines
 *   - Noop writer doesn't throw or create files
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SagaWorkerMessage } from '@saga-ai/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createFileMessageWriter, createNoopMessageWriter } from './message-writer.ts';

const THREE_MESSAGES = 3;

describe('createFileMessageWriter', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `saga-msg-writer-test-${Date.now()}`);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should serialize a message as a single JSON line', () => {
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'output.jsonl');
    const writer = createFileMessageWriter(filePath);

    writer.write({
      type: 'saga_worker',
      subtype: 'pipeline_start',
      timestamp: '2026-01-01T00:00:00Z',
      storyId: 'test',
    });

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trimEnd().split('\n');
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toEqual({
      type: 'saga_worker',
      subtype: 'pipeline_start',
      timestamp: '2026-01-01T00:00:00Z',
      storyId: 'test',
    });
  });

  it('should create parent directories on first write', () => {
    const nestedPath = join(testDir, 'nested', 'deep', 'output.jsonl');
    const writer = createFileMessageWriter(nestedPath);

    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'pipeline_start',
      timestamp: '2026-01-01T00:00:00Z',
      storyId: 'test',
    };
    writer.write(msg);

    expect(existsSync(nestedPath)).toBe(true);
    const content = readFileSync(nestedPath, 'utf-8');
    expect(JSON.parse(content.trimEnd())).toEqual(msg);
  });

  it('should produce multiple lines for multiple messages', () => {
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'output.jsonl');
    const writer = createFileMessageWriter(filePath);

    const msgs: SagaWorkerMessage[] = [
      {
        type: 'saga_worker',
        subtype: 'pipeline_start',
        timestamp: '2026-01-01T00:00:00Z',
        storyId: 'test',
      },
      {
        type: 'saga_worker',
        subtype: 'cycle_start',
        timestamp: '2026-01-01T00:01:00Z',
        cycle: 1,
        maxCycles: 10,
      },
      {
        type: 'saga_worker',
        subtype: 'cycle_end',
        timestamp: '2026-01-01T00:02:00Z',
        cycle: 1,
        exitCode: 0,
      },
    ];
    for (const msg of msgs) {
      writer.write(msg);
    }

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trimEnd().split('\n');
    expect(lines).toHaveLength(THREE_MESSAGES);
    expect(JSON.parse(lines[0])).toEqual(msgs[0]);
    expect(JSON.parse(lines[1])).toEqual(msgs[1]);
    expect(JSON.parse(lines[2])).toEqual(msgs[2]);
  });

  it('should each line be valid JSON individually', () => {
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'output.jsonl');
    const writer = createFileMessageWriter(filePath);

    writer.write({
      type: 'saga_worker',
      subtype: 'pipeline_end',
      timestamp: '2026-01-01T00:00:00Z',
      storyId: 'test',
      status: 'completed',
      exitCode: 0,
      cycles: 3,
      elapsedMinutes: 12.5,
    });
    writer.write({
      type: 'saga_worker',
      subtype: 'pipeline_step',
      timestamp: '2026-01-01T00:00:01Z',
      step: 1,
      message: 'Setup worktree',
    });

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trimEnd().split('\n');
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});

describe('createNoopMessageWriter', () => {
  it('should not throw when write is called', () => {
    const writer = createNoopMessageWriter();
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'pipeline_start',
      timestamp: '2026-01-01T00:00:00Z',
      storyId: 'test',
    };
    expect(() => writer.write(msg)).not.toThrow();
  });

  it('should not create any files', () => {
    const writer = createNoopMessageWriter();
    const msg: SagaWorkerMessage = {
      type: 'saga_worker',
      subtype: 'cycle_start',
      timestamp: '2026-01-01T00:00:00Z',
      cycle: 1,
      maxCycles: 10,
    };
    writer.write(msg);
    // No assertion needed - just verifying no side effects / no throw
  });
});
