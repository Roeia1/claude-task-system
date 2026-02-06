import { describe, expect, it } from 'vitest';
import type { ClaudeCodeTask } from './claude-code-task.ts';
import { fromClaudeTask, toClaudeTask } from './conversion.ts';
import type { Task } from './task.ts';

describe('toClaudeTask', () => {
  it('maps all required fields from SAGA task to Claude Code task', () => {
    const sagaTask: Task = {
      id: 'task-1',
      subject: 'Implement feature',
      description: 'Build the new feature',
      status: 'pending',
      blockedBy: [],
    };

    const result = toClaudeTask(sagaTask);

    expect(result).toEqual({
      id: 'task-1',
      subject: 'Implement feature',
      description: 'Build the new feature',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    });
  });

  it('maps activeForm when present', () => {
    const sagaTask: Task = {
      id: 'task-2',
      subject: 'Run tests',
      description: 'Execute all tests',
      activeForm: 'Running tests',
      status: 'in_progress',
      blockedBy: ['task-1'],
    };

    const result = toClaudeTask(sagaTask);

    expect(result.activeForm).toBe('Running tests');
    expect(result.blockedBy).toEqual(['task-1']);
  });

  it('maps guidance and doneWhen into metadata', () => {
    const sagaTask: Task = {
      id: 'task-3',
      subject: 'Write docs',
      description: 'Document the API',
      status: 'pending',
      blockedBy: [],
      guidance: 'Follow the existing doc format',
      doneWhen: 'All endpoints are documented',
    };

    const result = toClaudeTask(sagaTask);

    expect(result.metadata).toEqual({
      guidance: 'Follow the existing doc format',
      doneWhen: 'All endpoints are documented',
    });
  });

  it('maps only guidance into metadata when doneWhen is absent', () => {
    const sagaTask: Task = {
      id: 'task-4',
      subject: 'Refactor module',
      description: 'Clean up the code',
      status: 'completed',
      blockedBy: [],
      guidance: 'Use small functions',
    };

    const result = toClaudeTask(sagaTask);

    expect(result.metadata).toEqual({
      guidance: 'Use small functions',
    });
  });

  it('maps only doneWhen into metadata when guidance is absent', () => {
    const sagaTask: Task = {
      id: 'task-5',
      subject: 'Fix bug',
      description: 'Resolve the crash',
      status: 'pending',
      blockedBy: [],
      doneWhen: 'No crash on submit',
    };

    const result = toClaudeTask(sagaTask);

    expect(result.metadata).toEqual({
      doneWhen: 'No crash on submit',
    });
  });

  it('does not include metadata when neither guidance nor doneWhen is present', () => {
    const sagaTask: Task = {
      id: 'task-6',
      subject: 'Simple task',
      description: 'A task with no extras',
      status: 'pending',
      blockedBy: [],
    };

    const result = toClaudeTask(sagaTask);

    expect(result.metadata).toBeUndefined();
  });

  it('always sets blocks to empty array', () => {
    const sagaTask: Task = {
      id: 'task-7',
      subject: 'Some task',
      description: 'A description',
      status: 'pending',
      blockedBy: ['other-task'],
    };

    const result = toClaudeTask(sagaTask);

    expect(result.blocks).toEqual([]);
  });
});

describe('fromClaudeTask', () => {
  it('extracts only status from Claude Code task', () => {
    const claudeTask: ClaudeCodeTask = {
      id: 'task-1',
      subject: 'Modified subject',
      description: 'Modified description',
      status: 'completed',
      blocks: ['task-2'],
      blockedBy: [],
    };

    const result = fromClaudeTask(claudeTask);

    expect(result).toEqual({ status: 'completed' });
  });

  it('returns pending status', () => {
    const claudeTask: ClaudeCodeTask = {
      id: 'task-2',
      subject: 'A task',
      description: 'Description',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    };

    const result = fromClaudeTask(claudeTask);

    expect(result).toEqual({ status: 'pending' });
  });

  it('returns in_progress status', () => {
    const claudeTask: ClaudeCodeTask = {
      id: 'task-3',
      subject: 'A task',
      description: 'Description',
      status: 'in_progress',
      blocks: [],
      blockedBy: [],
    };

    const result = fromClaudeTask(claudeTask);

    expect(result).toEqual({ status: 'in_progress' });
  });

  it('ignores metadata and other fields', () => {
    const claudeTask: ClaudeCodeTask = {
      id: 'task-4',
      subject: 'Changed',
      description: 'Changed description',
      activeForm: 'Doing something',
      status: 'completed',
      owner: 'worker-1',
      blocks: ['task-5', 'task-6'],
      blockedBy: ['task-3'],
      metadata: {
        guidance: 'Some guidance',
        doneWhen: 'Some criteria',
        extra: 42,
      },
    };

    const result = fromClaudeTask(claudeTask);

    expect(result).toEqual({ status: 'completed' });
    expect(Object.keys(result)).toEqual(['status']);
  });
});
