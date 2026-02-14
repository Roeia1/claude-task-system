import { describe, expect, it } from 'vitest';
import { StoryIdSchema, type Task, TaskSchema, type TaskStatus, TaskStatusSchema } from './task.ts';

describe('TaskStatusSchema', () => {
  it('accepts valid task status values', () => {
    const validStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed'];
    for (const status of validStatuses) {
      expect(TaskStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects invalid task status values', () => {
    expect(() => TaskStatusSchema.parse('invalid')).toThrow();
    expect(() => TaskStatusSchema.parse('ready')).toThrow();
    expect(() => TaskStatusSchema.parse('blocked')).toThrow();
    expect(() => TaskStatusSchema.parse('')).toThrow();
    expect(() => TaskStatusSchema.parse(null)).toThrow();
  });
});

describe('TaskSchema', () => {
  const validTask: Task = {
    id: 't1',
    subject: 'Implement feature',
    description: 'Add the new feature to the system',
    status: 'pending',
    blockedBy: [],
  };

  it('parses a valid task with all required fields', () => {
    expect(TaskSchema.parse(validTask)).toEqual(validTask);
  });

  it('parses a task with all optional fields', () => {
    const fullTask: Task = {
      ...validTask,
      activeForm: 'Implementing feature',
      guidance: 'Follow TDD workflow',
      doneWhen: 'Tests pass and feature works',
    };
    expect(TaskSchema.parse(fullTask)).toEqual(fullTask);
  });

  it('parses a task with blockedBy entries', () => {
    const blockedTask: Task = {
      ...validTask,
      status: 'pending',
      blockedBy: ['t0', 't-1'],
    };
    expect(TaskSchema.parse(blockedTask)).toEqual(blockedTask);
  });

  it('parses a task with in_progress status', () => {
    const task: Task = { ...validTask, status: 'in_progress' };
    expect(TaskSchema.parse(task)).toEqual(task);
  });

  it('parses a task with completed status', () => {
    const task: Task = { ...validTask, status: 'completed' };
    expect(TaskSchema.parse(task)).toEqual(task);
  });

  it('rejects objects missing subject', () => {
    expect(() =>
      TaskSchema.parse({
        id: 't1',
        description: 'desc',
        status: 'pending',
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('rejects objects missing description', () => {
    expect(() =>
      TaskSchema.parse({
        id: 't1',
        subject: 'Test',
        status: 'pending',
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('rejects objects missing blockedBy', () => {
    expect(() =>
      TaskSchema.parse({
        id: 't1',
        subject: 'Test',
        description: 'desc',
        status: 'pending',
      }),
    ).toThrow();
  });

  it('rejects objects missing id', () => {
    expect(() =>
      TaskSchema.parse({
        subject: 'Test',
        description: 'desc',
        status: 'pending',
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('rejects objects missing status', () => {
    expect(() =>
      TaskSchema.parse({
        id: 't1',
        subject: 'Test',
        description: 'desc',
        blockedBy: [],
      }),
    ).toThrow();
  });

  it('allows omitting optional fields', () => {
    const minimalTask = {
      id: 't1',
      subject: 'Test',
      description: 'desc',
      status: 'pending',
      blockedBy: [],
    };
    const result = TaskSchema.parse(minimalTask);
    expect(result.activeForm).toBeUndefined();
    expect(result.guidance).toBeUndefined();
    expect(result.doneWhen).toBeUndefined();
  });
});

describe('Story ID validation schema', () => {
  it('accepts valid story IDs', () => {
    expect(StoryIdSchema.parse('my-story')).toBe('my-story');
    expect(StoryIdSchema.parse('story-123')).toBe('story-123');
    expect(StoryIdSchema.parse('abc')).toBe('abc');
    expect(StoryIdSchema.parse('a')).toBe('a');
    expect(StoryIdSchema.parse('123')).toBe('123');
    expect(StoryIdSchema.parse('my-long-story-id-123')).toBe('my-long-story-id-123');
  });

  it('rejects IDs with uppercase letters', () => {
    expect(() => StoryIdSchema.parse('My-Story')).toThrow();
    expect(() => StoryIdSchema.parse('STORY')).toThrow();
    expect(() => StoryIdSchema.parse('myStory')).toThrow();
  });

  it('rejects IDs with spaces', () => {
    expect(() => StoryIdSchema.parse('my story')).toThrow();
    expect(() => StoryIdSchema.parse(' leading')).toThrow();
    expect(() => StoryIdSchema.parse('trailing ')).toThrow();
  });

  it('rejects IDs with special characters', () => {
    expect(() => StoryIdSchema.parse('my_story')).toThrow();
    expect(() => StoryIdSchema.parse('my.story')).toThrow();
    expect(() => StoryIdSchema.parse('my/story')).toThrow();
    expect(() => StoryIdSchema.parse('my@story')).toThrow();
  });

  it('rejects empty strings', () => {
    expect(() => StoryIdSchema.parse('')).toThrow();
  });
});
