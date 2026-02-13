import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Epic, Task } from './schemas/index.ts';
import {
  deriveEpicStatus,
  deriveStoryStatus,
  ensureUniqueStoryId,
  listTasks,
  readEpic,
  readStory,
  readTask,
  validateStoryId,
  writeEpic,
  writeStory,
  writeTask,
} from './storage.ts';

describe('integration: story with tasks and derived status', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-integration-')));
    mkdirSync(join(testDir, '.saga', 'stories'), { recursive: true });
    mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const TASK_COUNT = 3;

  it('creates a story with tasks, reads back, and derives pending status', () => {
    const story = { id: 'auth-setup', title: 'Auth Setup', description: 'Set up authentication' };
    writeStory(testDir, story);

    const task1: Task = {
      id: 't1',
      subject: 'Create schema',
      description: 'DB schema',
      status: 'pending',
      blockedBy: [],
    };
    const task2: Task = {
      id: 't2',
      subject: 'Add endpoints',
      description: 'API endpoints',
      status: 'pending',
      blockedBy: ['t1'],
    };
    const task3: Task = {
      id: 't3',
      subject: 'Write tests',
      description: 'Integration tests',
      status: 'pending',
      blockedBy: ['t2'],
    };

    writeTask(testDir, 'auth-setup', task1);
    writeTask(testDir, 'auth-setup', task2);
    writeTask(testDir, 'auth-setup', task3);

    const readBackStory = readStory(testDir, 'auth-setup');
    expect(readBackStory).toEqual(story);

    const tasks = listTasks(testDir, 'auth-setup');
    expect(tasks).toHaveLength(TASK_COUNT);

    const status = deriveStoryStatus(tasks);
    expect(status).toBe('pending');
  });

  it('transitions to in_progress when a task starts', () => {
    const story = { id: 'feature-x', title: 'Feature X', description: 'Build feature X' };
    writeStory(testDir, story);

    const task1: Task = {
      id: 't1',
      subject: 'Design',
      description: 'Design the feature',
      status: 'completed',
      blockedBy: [],
    };
    const task2: Task = {
      id: 't2',
      subject: 'Implement',
      description: 'Build it',
      status: 'in_progress',
      blockedBy: ['t1'],
    };
    const task3: Task = {
      id: 't3',
      subject: 'Test',
      description: 'Test it',
      status: 'pending',
      blockedBy: ['t2'],
    };

    writeTask(testDir, 'feature-x', task1);
    writeTask(testDir, 'feature-x', task2);
    writeTask(testDir, 'feature-x', task3);

    const tasks = listTasks(testDir, 'feature-x');
    expect(deriveStoryStatus(tasks)).toBe('in_progress');
  });

  it('transitions to completed when all tasks are completed', () => {
    const story = { id: 'done-story', title: 'Done Story', description: 'All done' };
    writeStory(testDir, story);

    const task1: Task = {
      id: 't1',
      subject: 'First',
      description: 'First task',
      status: 'pending',
      blockedBy: [],
    };
    const task2: Task = {
      id: 't2',
      subject: 'Second',
      description: 'Second task',
      status: 'pending',
      blockedBy: [],
    };

    writeTask(testDir, 'done-story', task1);
    writeTask(testDir, 'done-story', task2);

    // Initially pending
    let tasks = listTasks(testDir, 'done-story');
    expect(deriveStoryStatus(tasks)).toBe('pending');

    // Update task1 to in_progress
    writeTask(testDir, 'done-story', { ...task1, status: 'in_progress' });
    tasks = listTasks(testDir, 'done-story');
    expect(deriveStoryStatus(tasks)).toBe('in_progress');

    // Update task1 to completed, task2 to in_progress
    writeTask(testDir, 'done-story', { ...task1, status: 'completed' });
    writeTask(testDir, 'done-story', { ...task2, status: 'in_progress' });
    tasks = listTasks(testDir, 'done-story');
    expect(deriveStoryStatus(tasks)).toBe('in_progress');

    // Update all to completed
    writeTask(testDir, 'done-story', { ...task1, status: 'completed' });
    writeTask(testDir, 'done-story', { ...task2, status: 'completed' });
    tasks = listTasks(testDir, 'done-story');
    expect(deriveStoryStatus(tasks)).toBe('completed');
  });

  it('reads individual tasks back by ID after writing', () => {
    const story = { id: 'read-back', title: 'Read Back', description: 'Read individual tasks' };
    writeStory(testDir, story);

    const task1: Task = {
      id: 't1',
      subject: 'Task one',
      description: 'First',
      status: 'pending',
      blockedBy: [],
    };
    const task2: Task = {
      id: 't2',
      subject: 'Task two',
      description: 'Second',
      status: 'in_progress',
      blockedBy: ['t1'],
    };

    writeTask(testDir, 'read-back', task1);
    writeTask(testDir, 'read-back', task2);

    const readT1 = readTask(testDir, 'read-back', 't1');
    const readT2 = readTask(testDir, 'read-back', 't2');

    expect(readT1).toEqual(task1);
    expect(readT2).toEqual(task2);
  });
});

describe('integration: epic with stories and derived status', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-integration-epic-')));
    mkdirSync(join(testDir, '.saga', 'stories'), { recursive: true });
    mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('creates an epic with children stories, derives epic status from story statuses', () => {
    const epic: Epic = {
      id: 'my-epic',
      title: 'My Epic',
      description: 'A multi-story epic',
      children: [
        { id: 'story-a', blockedBy: [] },
        { id: 'story-b', blockedBy: ['story-a'] },
      ],
    };
    writeEpic(testDir, epic);

    // Create story-a with all-pending tasks
    writeStory(testDir, { id: 'story-a', title: 'Story A', description: 'First story' });
    writeTask(testDir, 'story-a', {
      id: 't1',
      subject: 'A-task1',
      description: 'Task',
      status: 'pending',
      blockedBy: [],
    });
    writeTask(testDir, 'story-a', {
      id: 't2',
      subject: 'A-task2',
      description: 'Task',
      status: 'pending',
      blockedBy: [],
    });

    // Create story-b with all-pending tasks
    writeStory(testDir, { id: 'story-b', title: 'Story B', description: 'Second story' });
    writeTask(testDir, 'story-b', {
      id: 't1',
      subject: 'B-task1',
      description: 'Task',
      status: 'pending',
      blockedBy: [],
    });

    // Read back epic
    const readBackEpic = readEpic(testDir, 'my-epic');
    expect(readBackEpic).toEqual(epic);

    // Derive story statuses
    const storyAStatus = deriveStoryStatus(listTasks(testDir, 'story-a'));
    const storyBStatus = deriveStoryStatus(listTasks(testDir, 'story-b'));
    expect(storyAStatus).toBe('pending');
    expect(storyBStatus).toBe('pending');

    // Derive epic status from story statuses
    expect(deriveEpicStatus([storyAStatus, storyBStatus])).toBe('pending');
  });

  it('derives in_progress epic status when a story has in_progress tasks', () => {
    const epic: Epic = {
      id: 'progress-epic',
      title: 'In Progress Epic',
      description: 'One story in progress',
      children: [
        { id: 'story-1', blockedBy: [] },
        { id: 'story-2', blockedBy: [] },
      ],
    };
    writeEpic(testDir, epic);

    // story-1: one task in_progress
    writeStory(testDir, { id: 'story-1', title: 'Story 1', description: 'First' });
    writeTask(testDir, 'story-1', {
      id: 't1',
      subject: 'Task',
      description: 'Doing',
      status: 'in_progress',
      blockedBy: [],
    });

    // story-2: all pending
    writeStory(testDir, { id: 'story-2', title: 'Story 2', description: 'Second' });
    writeTask(testDir, 'story-2', {
      id: 't1',
      subject: 'Task',
      description: 'Waiting',
      status: 'pending',
      blockedBy: [],
    });

    const story1Status = deriveStoryStatus(listTasks(testDir, 'story-1'));
    const story2Status = deriveStoryStatus(listTasks(testDir, 'story-2'));

    expect(story1Status).toBe('in_progress');
    expect(story2Status).toBe('pending');
    expect(deriveEpicStatus([story1Status, story2Status])).toBe('in_progress');
  });

  it('derives completed epic status when all stories have all tasks completed', () => {
    const epic: Epic = {
      id: 'done-epic',
      title: 'Done Epic',
      description: 'All stories complete',
      children: [
        { id: 'story-x', blockedBy: [] },
        { id: 'story-y', blockedBy: ['story-x'] },
      ],
    };
    writeEpic(testDir, epic);

    writeStory(testDir, { id: 'story-x', title: 'Story X', description: 'Complete' });
    writeTask(testDir, 'story-x', {
      id: 't1',
      subject: 'Done',
      description: 'Done',
      status: 'completed',
      blockedBy: [],
    });
    writeTask(testDir, 'story-x', {
      id: 't2',
      subject: 'Done',
      description: 'Done',
      status: 'completed',
      blockedBy: [],
    });

    writeStory(testDir, { id: 'story-y', title: 'Story Y', description: 'Complete' });
    writeTask(testDir, 'story-y', {
      id: 't1',
      subject: 'Done',
      description: 'Done',
      status: 'completed',
      blockedBy: [],
    });

    const storyXStatus = deriveStoryStatus(listTasks(testDir, 'story-x'));
    const storyYStatus = deriveStoryStatus(listTasks(testDir, 'story-y'));

    expect(storyXStatus).toBe('completed');
    expect(storyYStatus).toBe('completed');
    expect(deriveEpicStatus([storyXStatus, storyYStatus])).toBe('completed');
  });

  it('tracks epic status through full lifecycle: pending -> in_progress -> completed', () => {
    const epic: Epic = {
      id: 'lifecycle-epic',
      title: 'Lifecycle Epic',
      description: 'Full lifecycle test',
      children: [
        { id: 'setup', blockedBy: [] },
        { id: 'build', blockedBy: ['setup'] },
      ],
    };
    writeEpic(testDir, epic);

    // Both stories start pending
    writeStory(testDir, { id: 'setup', title: 'Setup', description: 'Setup story' });
    writeTask(testDir, 'setup', {
      id: 't1',
      subject: 'Init',
      description: 'Initialize',
      status: 'pending',
      blockedBy: [],
    });

    writeStory(testDir, { id: 'build', title: 'Build', description: 'Build story' });
    writeTask(testDir, 'build', {
      id: 't1',
      subject: 'Code',
      description: 'Write code',
      status: 'pending',
      blockedBy: [],
    });

    const getEpicStatus = () => {
      const setupStatus = deriveStoryStatus(listTasks(testDir, 'setup'));
      const buildStatus = deriveStoryStatus(listTasks(testDir, 'build'));
      return deriveEpicStatus([setupStatus, buildStatus]);
    };

    // Phase 1: All pending
    expect(getEpicStatus()).toBe('pending');

    // Phase 2: Setup in progress
    writeTask(testDir, 'setup', {
      id: 't1',
      subject: 'Init',
      description: 'Initialize',
      status: 'in_progress',
      blockedBy: [],
    });
    expect(getEpicStatus()).toBe('in_progress');

    // Phase 3: Setup done, build starts
    writeTask(testDir, 'setup', {
      id: 't1',
      subject: 'Init',
      description: 'Initialize',
      status: 'completed',
      blockedBy: [],
    });
    writeTask(testDir, 'build', {
      id: 't1',
      subject: 'Code',
      description: 'Write code',
      status: 'in_progress',
      blockedBy: [],
    });
    expect(getEpicStatus()).toBe('in_progress');

    // Phase 4: All done
    writeTask(testDir, 'build', {
      id: 't1',
      subject: 'Code',
      description: 'Write code',
      status: 'completed',
      blockedBy: [],
    });
    expect(getEpicStatus()).toBe('completed');
  });
});

describe('integration: ID validation and uniqueness', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-integration-id-')));
    mkdirSync(join(testDir, '.saga', 'stories'), { recursive: true });
    mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('validates ID before creating a story, then enforces uniqueness on second create', () => {
    const storyId = 'new-feature-1';

    // Validate ID format
    expect(validateStoryId(storyId)).toBe(true);

    // Ensure unique before first create
    ensureUniqueStoryId(testDir, storyId);

    // Create the story
    writeStory(testDir, { id: storyId, title: 'New Feature', description: 'A new feature' });
    writeTask(testDir, storyId, {
      id: 't1',
      subject: 'Task',
      description: 'Do it',
      status: 'pending',
      blockedBy: [],
    });

    // Verify the story and task exist
    const story = readStory(testDir, storyId);
    expect(story.id).toBe(storyId);

    const tasks = listTasks(testDir, storyId);
    expect(tasks).toHaveLength(1);

    // Try to create another story with the same ID - should fail uniqueness check
    expect(() => ensureUniqueStoryId(testDir, storyId)).toThrow('already exists');
  });

  it('rejects invalid ID before any file system operations', () => {
    const invalidId = 'My_Feature';

    expect(validateStoryId(invalidId)).toBe(false);

    // The validation is a gate - we would not proceed to write
    // But ensureUniqueStoryId should still work (no directory exists)
    ensureUniqueStoryId(testDir, invalidId);
  });

  it('allows creating multiple stories with different valid IDs', () => {
    const ids = ['auth-setup', 'db-migration', 'api-v2'];

    for (const id of ids) {
      expect(validateStoryId(id)).toBe(true);
      ensureUniqueStoryId(testDir, id);
      writeStory(testDir, { id, title: `Story ${id}`, description: `Story for ${id}` });
    }

    // All three stories exist and are independent
    for (const id of ids) {
      const story = readStory(testDir, id);
      expect(story.id).toBe(id);
    }

    // Each ID now fails uniqueness check
    for (const id of ids) {
      expect(() => ensureUniqueStoryId(testDir, id)).toThrow('already exists');
    }
  });
});
