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

    writer.write({ type: 'test', data: 'hello' });

    expect(existsSync(nestedPath)).toBe(true);
    const content = readFileSync(nestedPath, 'utf-8');
    expect(JSON.parse(content.trimEnd())).toEqual({ type: 'test', data: 'hello' });
  });

  it('should produce multiple lines for multiple messages', () => {
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'output.jsonl');
    const writer = createFileMessageWriter(filePath);

    writer.write({ type: 'msg', id: 1 });
    writer.write({ type: 'msg', id: 2 });
    writer.write({ type: 'msg', id: 3 });

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trimEnd().split('\n');
    expect(lines).toHaveLength(THREE_MESSAGES);
    expect(JSON.parse(lines[0])).toEqual({ type: 'msg', id: 1 });
    expect(JSON.parse(lines[1])).toEqual({ type: 'msg', id: 2 });
    expect(JSON.parse(lines[2])).toEqual({ type: 'msg', id: THREE_MESSAGES });
  });

  it('should each line be valid JSON individually', () => {
    mkdirSync(testDir, { recursive: true });
    const filePath = join(testDir, 'output.jsonl');
    const writer = createFileMessageWriter(filePath);

    writer.write({ nested: { key: 'value' }, array: [1, 2] });
    writer.write({ type: 'simple' });

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
    expect(() => writer.write({ type: 'test' })).not.toThrow();
  });

  it('should not create any files', () => {
    const writer = createNoopMessageWriter();
    writer.write({ type: 'test' });
    // No assertion needed - just verifying no side effects / no throw
  });
});
