import { describe, expect, it } from 'vitest';
import { ClaudeCodeTaskSchema } from './claude-code-task.ts';

describe('ClaudeCodeTaskSchema', () => {
  it('should accept a valid task with all required fields', () => {
    const result = ClaudeCodeTaskSchema.parse({
      id: 't1',
      subject: 'Write tests',
      description: 'Write unit tests for the module',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    });
    expect(result).toEqual({
      id: 't1',
      subject: 'Write tests',
      description: 'Write unit tests for the module',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    });
  });

  it('should accept a task with all fields including optionals', () => {
    const result = ClaudeCodeTaskSchema.parse({
      id: 't2',
      subject: 'Implement feature',
      description: 'Implement the feature end to end',
      activeForm: 'Implementing feature',
      status: 'in_progress',
      owner: 'worker-1',
      blocks: ['t3', 't4'],
      blockedBy: ['t1'],
      metadata: { guidance: 'Follow TDD', doneWhen: 'All tests pass' },
    });
    expect(result).toEqual({
      id: 't2',
      subject: 'Implement feature',
      description: 'Implement the feature end to end',
      activeForm: 'Implementing feature',
      status: 'in_progress',
      owner: 'worker-1',
      blocks: ['t3', 't4'],
      blockedBy: ['t1'],
      metadata: { guidance: 'Follow TDD', doneWhen: 'All tests pass' },
    });
  });

  it('should accept a task without optional fields', () => {
    const result = ClaudeCodeTaskSchema.parse({
      id: 't3',
      subject: 'Review code',
      description: 'Review the PR',
      status: 'completed',
      blocks: [],
      blockedBy: [],
    });
    expect(result.activeForm).toBeUndefined();
    expect(result.owner).toBeUndefined();
    expect(result.metadata).toBeUndefined();
  });

  it('should reject a task missing id', () => {
    expect(() =>
      ClaudeCodeTaskSchema.parse({
        subject: 'Test',
        description: 'Desc',
        status: 'pending',
        blocks: [],
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('should reject a task missing subject', () => {
    expect(() =>
      ClaudeCodeTaskSchema.parse({
        id: 't1',
        description: 'Desc',
        status: 'pending',
        blocks: [],
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('should reject a task missing description', () => {
    expect(() =>
      ClaudeCodeTaskSchema.parse({
        id: 't1',
        subject: 'Test',
        status: 'pending',
        blocks: [],
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('should reject a task missing blocks', () => {
    expect(() =>
      ClaudeCodeTaskSchema.parse({
        id: 't1',
        subject: 'Test',
        description: 'Desc',
        status: 'pending',
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('should reject a task missing blockedBy', () => {
    expect(() =>
      ClaudeCodeTaskSchema.parse({
        id: 't1',
        subject: 'Test',
        description: 'Desc',
        status: 'pending',
        blocks: [],
      }),
    ).toThrow();
  });

  it('should reject invalid status values', () => {
    expect(() =>
      ClaudeCodeTaskSchema.parse({
        id: 't1',
        subject: 'Test',
        description: 'Desc',
        status: 'done',
        blocks: [],
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('should accept metadata with arbitrary key-value pairs', () => {
    const result = ClaudeCodeTaskSchema.parse({
      id: 't1',
      subject: 'Test',
      description: 'Desc',
      status: 'pending',
      blocks: [],
      blockedBy: [],
      metadata: { key1: 'value1', key2: 42, nested: { a: true } },
    });
    expect(result.metadata).toEqual({
      key1: 'value1',
      key2: 42,
      nested: { a: true },
    });
  });
});
