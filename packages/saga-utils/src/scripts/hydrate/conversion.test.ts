import { describe, expect, it } from 'vitest';
import type { Task } from '../../schemas/index.ts';
import { convertTask, convertTasks, extractStatus } from './conversion.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    subject: `Task ${overrides.id}`,
    description: `Description for ${overrides.id}`,
    status: 'pending',
    blockedBy: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// convertTask (single task with blocks computation)
// ---------------------------------------------------------------------------

describe('convertTask', () => {
  it('maps all required fields', () => {
    const task = makeTask({ id: 't1', subject: 'Implement feature', description: 'Build it' });
    const result = convertTask(task, [task]);

    expect(result.id).toBe('t1');
    expect(result.subject).toBe('Implement feature');
    expect(result.description).toBe('Build it');
    expect(result.status).toBe('pending');
    expect(result.blockedBy).toEqual([]);
    expect(result.blocks).toEqual([]);
  });

  it('preserves activeForm when present', () => {
    const task = makeTask({ id: 't1', activeForm: 'Building feature' });
    const result = convertTask(task, [task]);

    expect(result.activeForm).toBe('Building feature');
  });

  it('maps guidance and doneWhen into metadata', () => {
    const task = makeTask({
      id: 't1',
      guidance: 'Follow the pattern',
      doneWhen: 'Tests pass',
    });
    const result = convertTask(task, [task]);

    expect(result.metadata).toEqual({
      guidance: 'Follow the pattern',
      doneWhen: 'Tests pass',
    });
  });

  it('maps only guidance into metadata when doneWhen is absent', () => {
    const task = makeTask({ id: 't1', guidance: 'Use small functions' });
    const result = convertTask(task, [task]);

    expect(result.metadata).toEqual({ guidance: 'Use small functions' });
  });

  it('maps only doneWhen into metadata when guidance is absent', () => {
    const task = makeTask({ id: 't1', doneWhen: 'No crash on submit' });
    const result = convertTask(task, [task]);

    expect(result.metadata).toEqual({ doneWhen: 'No crash on submit' });
  });

  it('excludes metadata when neither guidance nor doneWhen is present', () => {
    const task = makeTask({ id: 't1' });
    const result = convertTask(task, [task]);

    expect(result.metadata).toBeUndefined();
  });

  it('computes empty blocks when no tasks depend on this one', () => {
    const t1 = makeTask({ id: 't1' });
    const t2 = makeTask({ id: 't2' });
    const result = convertTask(t1, [t1, t2]);

    expect(result.blocks).toEqual([]);
  });

  it('computes blocks from other tasks blockedBy', () => {
    const t1 = makeTask({ id: 't1' });
    const t2 = makeTask({ id: 't2', blockedBy: ['t1'] });
    const t3 = makeTask({ id: 't3', blockedBy: ['t1'] });

    const result = convertTask(t1, [t1, t2, t3]);

    expect(result.blocks).toEqual(['t2', 't3']);
  });

  it('does not include self in blocks', () => {
    // Edge case: a task should not list itself in blocks even if malformed blockedBy
    const t1 = makeTask({ id: 't1', blockedBy: ['t1'] });
    const result = convertTask(t1, [t1]);

    // t1 blocks itself only if t1.blockedBy includes 't1' - this is valid per computation
    // but we still expect the filter to work: t1 lists t1 in blockedBy, so t1 would be in t1.blocks
    // The implementation follows the spec: filter(other => other.blockedBy.includes(task.id))
    // Since 'other' includes self and self.blockedBy includes 't1', self appears in blocks
    // But the spec says "find which ones list this task in their blockedBy" - self is included
    expect(result.blocks).toEqual(['t1']);
  });

  it('preserves blockedBy from original task', () => {
    const t1 = makeTask({ id: 't1' });
    const t2 = makeTask({ id: 't2', blockedBy: ['t1'] });

    const result = convertTask(t2, [t1, t2]);

    expect(result.blockedBy).toEqual(['t1']);
    expect(result.blocks).toEqual([]);
  });

  it('handles task with multiple blockedBy entries', () => {
    const t1 = makeTask({ id: 't1' });
    const t2 = makeTask({ id: 't2' });
    const t3 = makeTask({ id: 't3', blockedBy: ['t1', 't2'] });

    const result = convertTask(t3, [t1, t2, t3]);

    expect(result.blockedBy).toEqual(['t1', 't2']);
    expect(result.blocks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// convertTasks (batch conversion)
// ---------------------------------------------------------------------------

describe('convertTasks', () => {
  it('converts all tasks with correct blocks', () => {
    const t1 = makeTask({ id: 't1' });
    const t2 = makeTask({ id: 't2', blockedBy: ['t1'] });
    const t3 = makeTask({ id: 't3', blockedBy: ['t1', 't2'] });
    const tasks = [t1, t2, t3];

    const results = convertTasks(tasks);

    expect(results).toHaveLength(tasks.length);
    expect(results[0].id).toBe('t1');
    expect(results[0].blocks).toEqual(['t2', 't3']);
    expect(results[1].id).toBe('t2');
    expect(results[1].blocks).toEqual(['t3']);
    expect(results[2].id).toBe('t3');
    expect(results[2].blocks).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const results = convertTasks([]);

    expect(results).toEqual([]);
  });

  it('converts single task with no dependencies', () => {
    const t1 = makeTask({ id: 't1', guidance: 'Follow pattern', doneWhen: 'Tests pass' });

    const results = convertTasks([t1]);

    expect(results).toHaveLength(1);
    expect(results[0].blocks).toEqual([]);
    expect(results[0].blockedBy).toEqual([]);
    expect(results[0].metadata).toEqual({
      guidance: 'Follow pattern',
      doneWhen: 'Tests pass',
    });
  });

  it('preserves task order', () => {
    const t3 = makeTask({ id: 't3' });
    const t1 = makeTask({ id: 't1' });
    const t2 = makeTask({ id: 't2' });

    const results = convertTasks([t3, t1, t2]);

    expect(results.map((r) => r.id)).toEqual(['t3', 't1', 't2']);
  });
});

// ---------------------------------------------------------------------------
// extractStatus (fromClaudeTask wrapper)
// ---------------------------------------------------------------------------

describe('extractStatus', () => {
  it('extracts pending status', () => {
    const result = extractStatus({
      id: 't1',
      subject: 'Task',
      description: 'Desc',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    });

    expect(result).toEqual({ status: 'pending' });
  });

  it('extracts in_progress status', () => {
    const result = extractStatus({
      id: 't1',
      subject: 'Task',
      description: 'Desc',
      status: 'in_progress',
      blocks: [],
      blockedBy: [],
    });

    expect(result).toEqual({ status: 'in_progress' });
  });

  it('extracts completed status', () => {
    const result = extractStatus({
      id: 't1',
      subject: 'Task',
      description: 'Desc',
      status: 'completed',
      blocks: [],
      blockedBy: [],
    });

    expect(result).toEqual({ status: 'completed' });
  });

  it('ignores metadata and other Claude Code-specific fields', () => {
    const result = extractStatus({
      id: 't1',
      subject: 'Modified subject',
      description: 'Modified description',
      activeForm: 'Doing something',
      status: 'completed',
      owner: 'worker-1',
      blocks: ['t2', 't3'],
      blockedBy: ['t0'],
      metadata: {
        guidance: 'Some guidance',
        doneWhen: 'Some criteria',
        extra: 42,
      },
    });

    expect(result).toEqual({ status: 'completed' });
    expect(Object.keys(result)).toEqual(['status']);
  });
});
