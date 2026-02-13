import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateTaskListId, getTaskListDir, parseTaskListId } from './namespace.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMESTAMP_A = 1_700_000_000_000;
const TIMESTAMP_B = 1_234_567_890;
const TIMESTAMP_LARGE = 9_999_999_999_999;
const TIMESTAMP_SMALL = 9_999_999;

// ---------------------------------------------------------------------------
// generateTaskListId
// ---------------------------------------------------------------------------

describe('generateTaskListId', () => {
  it('generates the correct saga__ format', () => {
    const result = generateTaskListId('my-story', TIMESTAMP_A);

    expect(result).toBe('saga__my-story__1700000000000');
  });

  it('handles story IDs with multiple hyphens', () => {
    const result = generateTaskListId('my-multi-part-story', TIMESTAMP_B);

    expect(result).toBe('saga__my-multi-part-story__1234567890');
  });

  it('handles single-character story ID', () => {
    const result = generateTaskListId('a', 1);

    expect(result).toBe('saga__a__1');
  });
});

// ---------------------------------------------------------------------------
// parseTaskListId
// ---------------------------------------------------------------------------

describe('parse task list id', () => {
  it('parses a valid SAGA task list ID', () => {
    const result = parseTaskListId('saga__my-story__1700000000000');

    expect(result).toEqual({
      storyId: 'my-story',
      sessionTimestamp: TIMESTAMP_A,
    });
  });

  it('parses a story ID with multiple hyphens', () => {
    const result = parseTaskListId('saga__hydration-sync-layer__9999999');

    expect(result).toEqual({
      storyId: 'hydration-sync-layer',
      sessionTimestamp: TIMESTAMP_SMALL,
    });
  });

  it('returns null for non-SAGA task list IDs', () => {
    expect(parseTaskListId('user-tasks-123')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseTaskListId('')).toBeNull();
  });

  it('returns null for partial saga prefix', () => {
    expect(parseTaskListId('saga__my-story')).toBeNull();
  });

  it('returns null when timestamp is not numeric', () => {
    expect(parseTaskListId('saga__my-story__abc')).toBeNull();
  });

  it('returns null for old epic+story format', () => {
    // The old format saga__<epic>__<story>__<ts> has 4 segments
    expect(parseTaskListId('saga__epic__story__12345')).toBeNull();
  });

  it('returns null when story ID contains uppercase', () => {
    expect(parseTaskListId('saga__MyStory__12345')).toBeNull();
  });

  it('returns null when story ID contains underscores', () => {
    expect(parseTaskListId('saga__my_story__12345')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Round-trip consistency
// ---------------------------------------------------------------------------

describe('generateTaskListId / parseTaskListId round-trip', () => {
  it('round-trips simple story ID', () => {
    const storyId = 'hydration-sync-layer';
    const sessionTimestamp = TIMESTAMP_A;

    const taskListId = generateTaskListId(storyId, sessionTimestamp);
    const parsed = parseTaskListId(taskListId);

    expect(parsed).toEqual({ storyId, sessionTimestamp });
  });

  it('round-trips single-segment story ID', () => {
    const storyId = 'auth';
    const sessionTimestamp = 1;

    const taskListId = generateTaskListId(storyId, sessionTimestamp);
    const parsed = parseTaskListId(taskListId);

    expect(parsed).toEqual({ storyId, sessionTimestamp });
  });

  it('round-trips large timestamp', () => {
    const storyId = 'worker-pipeline';
    const sessionTimestamp = TIMESTAMP_LARGE;

    const taskListId = generateTaskListId(storyId, sessionTimestamp);
    const parsed = parseTaskListId(taskListId);

    expect(parsed).toEqual({ storyId, sessionTimestamp });
  });
});

// ---------------------------------------------------------------------------
// getTaskListDir
// ---------------------------------------------------------------------------

describe('get task list dir', () => {
  it('returns path under ~/.claude/tasks/ by default', () => {
    const result = getTaskListDir('saga__my-story__12345');

    expect(result).toBe(join(homedir(), '.claude', 'tasks', 'saga__my-story__12345'));
  });

  it('uses custom base directory when provided', () => {
    const result = getTaskListDir('saga__my-story__12345', '/tmp/test-tasks');

    expect(result).toBe(join('/tmp/test-tasks', 'saga__my-story__12345'));
  });

  it('works with non-SAGA task list IDs', () => {
    // getTaskListDir is a path helper, it doesn't validate the ID format
    const result = getTaskListDir('arbitrary-id');

    expect(result).toBe(join(homedir(), '.claude', 'tasks', 'arbitrary-id'));
  });
});
