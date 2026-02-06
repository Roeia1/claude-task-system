import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Epic, Story, Task } from '@saga-ai/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

describe('story storage', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-storage-test-')));
    mkdirSync(join(testDir, '.saga', 'stories'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('writeStory', () => {
    it('creates story.json with valid JSON', () => {
      const story = {
        id: 'my-story',
        title: 'My Story',
        description: 'A test story',
      };

      writeStory(testDir, story);

      const filePath = join(testDir, '.saga', 'stories', 'my-story', 'story.json');
      expect(existsSync(filePath)).toBe(true);

      const contents = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(contents);
      expect(parsed).toEqual(story);
    });

    it('creates the story directory if it does not exist', () => {
      const story = {
        id: 'new-story',
        title: 'New Story',
        description: 'A brand new story',
      };

      writeStory(testDir, story);

      const dirPath = join(testDir, '.saga', 'stories', 'new-story');
      expect(existsSync(dirPath)).toBe(true);
    });

    it('writes pretty-printed JSON with trailing newline', () => {
      const story = {
        id: 'pretty-story',
        title: 'Pretty Story',
        description: 'Testing pretty print',
      };

      writeStory(testDir, story);

      const filePath = join(testDir, '.saga', 'stories', 'pretty-story', 'story.json');
      const contents = readFileSync(filePath, 'utf-8');
      expect(contents).toBe(`${JSON.stringify(story, null, 2)}\n`);
    });

    it('writes all optional fields when present', () => {
      const story = {
        id: 'full-story',
        title: 'Full Story',
        description: 'A story with all fields',
        epic: 'my-epic',
        guidance: 'Some guidance',
        doneWhen: 'When tests pass',
        avoid: 'Bad patterns',
        branch: 'feature-branch',
        pr: 'https://github.com/org/repo/pull/1',
        worktree: '/path/to/worktree',
      };

      writeStory(testDir, story);

      const filePath = join(testDir, '.saga', 'stories', 'full-story', 'story.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed).toEqual(story);
    });

    it('throws for a story missing required id field', () => {
      const invalid = {
        title: 'No ID',
        description: 'Missing ID',
      } as unknown as Story;

      expect(() => writeStory(testDir, invalid)).toThrow();
    });

    it('throws for a story with extra fields (strict schema)', () => {
      const invalid = {
        id: 'extra-fields',
        title: 'Extra Fields',
        description: 'Has status',
        status: 'ready',
      } as unknown as Story;

      expect(() => writeStory(testDir, invalid)).toThrow();
    });

    it('overwrites an existing story.json', () => {
      const story1 = {
        id: 'overwrite-test',
        title: 'Original',
        description: 'First version',
      };
      const story2 = {
        id: 'overwrite-test',
        title: 'Updated',
        description: 'Second version',
      };

      writeStory(testDir, story1);
      writeStory(testDir, story2);

      const filePath = join(testDir, '.saga', 'stories', 'overwrite-test', 'story.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed.title).toBe('Updated');
    });
  });

  describe('readStory', () => {
    it('reads and parses a valid story.json', () => {
      const story = {
        id: 'read-test',
        title: 'Read Test',
        description: 'Testing read',
      };

      writeStory(testDir, story);
      const result = readStory(testDir, 'read-test');
      expect(result).toEqual(story);
    });

    it('returns a typed Story object with all optional fields', () => {
      const story = {
        id: 'typed-story',
        title: 'Typed Story',
        description: 'All fields present',
        epic: 'my-epic',
        guidance: 'Follow TDD',
        doneWhen: 'All tests pass',
        avoid: 'Shortcuts',
        branch: 'story-branch',
        pr: 'https://github.com/org/repo/pull/2',
        worktree: '/path/to/wt',
      };

      writeStory(testDir, story);
      const result = readStory(testDir, 'typed-story');
      expect(result).toEqual(story);
    });

    it('throws when story directory does not exist', () => {
      expect(() => readStory(testDir, 'nonexistent')).toThrow();
    });

    it('throws when story.json does not exist in the directory', () => {
      mkdirSync(join(testDir, '.saga', 'stories', 'empty-dir'), { recursive: true });
      expect(() => readStory(testDir, 'empty-dir')).toThrow();
    });

    it('throws for malformed JSON', () => {
      const storyDir = join(testDir, '.saga', 'stories', 'bad-json');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'story.json'), '{ invalid json }', 'utf-8');

      expect(() => readStory(testDir, 'bad-json')).toThrow();
    });

    it('throws for JSON that does not match the Story schema', () => {
      const storyDir = join(testDir, '.saga', 'stories', 'bad-schema');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({ id: 'bad-schema', extra: 'field' }),
        'utf-8',
      );

      expect(() => readStory(testDir, 'bad-schema')).toThrow();
    });

    it('round-trips write then read correctly', () => {
      const story = {
        id: 'round-trip',
        title: 'Round Trip',
        description: 'Write and read back',
        epic: 'test-epic',
      };

      writeStory(testDir, story);
      const result = readStory(testDir, 'round-trip');
      expect(result).toEqual(story);
    });
  });
});

describe('epic storage', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-epic-storage-test-')));
    mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('writeEpic', () => {
    it('creates epic JSON file with valid content', () => {
      const epic: Epic = {
        id: 'my-epic',
        title: 'My Epic',
        description: 'A test epic',
        children: [{ id: 'story-1', blockedBy: [] }],
      };

      writeEpic(testDir, epic);

      const filePath = join(testDir, '.saga', 'epics', 'my-epic.json');
      expect(existsSync(filePath)).toBe(true);

      const contents = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(contents);
      expect(parsed).toEqual(epic);
    });

    it('writes pretty-printed JSON with trailing newline', () => {
      const epic: Epic = {
        id: 'pretty-epic',
        title: 'Pretty Epic',
        description: 'Testing pretty print',
        children: [],
      };

      writeEpic(testDir, epic);

      const filePath = join(testDir, '.saga', 'epics', 'pretty-epic.json');
      const contents = readFileSync(filePath, 'utf-8');
      expect(contents).toBe(`${JSON.stringify(epic, null, 2)}\n`);
    });

    it('writes epic with empty children array', () => {
      const epic: Epic = {
        id: 'no-children',
        title: 'No Children',
        description: 'Epic with no stories',
        children: [],
      };

      writeEpic(testDir, epic);

      const filePath = join(testDir, '.saga', 'epics', 'no-children.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed.children).toEqual([]);
    });

    it('writes epic with multiple children and blockedBy references', () => {
      const epic: Epic = {
        id: 'complex-epic',
        title: 'Complex Epic',
        description: 'Epic with dependencies',
        children: [
          { id: 'story-a', blockedBy: [] },
          { id: 'story-b', blockedBy: ['story-a'] },
          { id: 'story-c', blockedBy: ['story-a', 'story-b'] },
        ],
      };

      writeEpic(testDir, epic);

      const filePath = join(testDir, '.saga', 'epics', 'complex-epic.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed.children).toEqual(epic.children);
    });

    it('overwrites an existing epic JSON file', () => {
      const epic1: Epic = {
        id: 'overwrite-epic',
        title: 'Original',
        description: 'First version',
        children: [],
      };
      const epic2: Epic = {
        id: 'overwrite-epic',
        title: 'Updated',
        description: 'Second version',
        children: [{ id: 'new-story', blockedBy: [] }],
      };

      writeEpic(testDir, epic1);
      writeEpic(testDir, epic2);

      const filePath = join(testDir, '.saga', 'epics', 'overwrite-epic.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed.title).toBe('Updated');
      expect(parsed.children).toHaveLength(1);
    });

    it('throws for an epic missing required id field', () => {
      const invalid = {
        title: 'No ID',
        description: 'Missing ID',
        children: [],
      } as unknown as Epic;

      expect(() => writeEpic(testDir, invalid)).toThrow();
    });

    it('throws for an epic missing required children field', () => {
      const invalid = {
        id: 'no-children-field',
        title: 'Missing Children',
        description: 'No children array',
      } as unknown as Epic;

      expect(() => writeEpic(testDir, invalid)).toThrow();
    });

    it('throws for an epic with extra fields (strict schema)', () => {
      const invalid = {
        id: 'extra-fields',
        title: 'Extra Fields',
        description: 'Has status',
        children: [],
        status: 'pending',
      } as unknown as Epic;

      expect(() => writeEpic(testDir, invalid)).toThrow();
    });

    it('throws for an epic with invalid children structure', () => {
      const invalid = {
        id: 'bad-children',
        title: 'Bad Children',
        description: 'Invalid children',
        children: [{ id: 'story-1' }],
      } as unknown as Epic;

      expect(() => writeEpic(testDir, invalid)).toThrow();
    });
  });

  describe('readEpic', () => {
    it('reads and parses a valid epic JSON file', () => {
      const epic: Epic = {
        id: 'read-epic',
        title: 'Read Epic',
        description: 'Testing read',
        children: [{ id: 'story-1', blockedBy: [] }],
      };

      writeEpic(testDir, epic);
      const result = readEpic(testDir, 'read-epic');
      expect(result).toEqual(epic);
    });

    it('reads an epic with empty children array', () => {
      const epic: Epic = {
        id: 'empty-children',
        title: 'Empty Children',
        description: 'No stories',
        children: [],
      };

      writeEpic(testDir, epic);
      const result = readEpic(testDir, 'empty-children');
      expect(result.children).toEqual([]);
    });

    it('throws when epic file does not exist', () => {
      expect(() => readEpic(testDir, 'nonexistent')).toThrow();
    });

    it('throws for malformed JSON', () => {
      const filePath = join(testDir, '.saga', 'epics', 'bad-json.json');
      writeFileSync(filePath, '{ invalid json }', 'utf-8');

      expect(() => readEpic(testDir, 'bad-json')).toThrow();
    });

    it('throws for JSON that does not match the Epic schema', () => {
      const filePath = join(testDir, '.saga', 'epics', 'bad-schema.json');
      writeFileSync(
        filePath,
        JSON.stringify({
          id: 'bad-schema',
          title: 'Bad',
          description: 'Schema',
          extra: 'field',
          children: [],
        }),
        'utf-8',
      );

      expect(() => readEpic(testDir, 'bad-schema')).toThrow();
    });

    it('throws for JSON with invalid children structure', () => {
      const filePath = join(testDir, '.saga', 'epics', 'invalid-children.json');
      writeFileSync(
        filePath,
        JSON.stringify({
          id: 'invalid-children',
          title: 'Bad',
          description: 'Children',
          children: ['not-an-object'],
        }),
        'utf-8',
      );

      expect(() => readEpic(testDir, 'invalid-children')).toThrow();
    });

    it('round-trips write then read correctly', () => {
      const epic: Epic = {
        id: 'round-trip-epic',
        title: 'Round Trip Epic',
        description: 'Write and read back',
        children: [
          { id: 'story-a', blockedBy: [] },
          { id: 'story-b', blockedBy: ['story-a'] },
        ],
      };

      writeEpic(testDir, epic);
      const result = readEpic(testDir, 'round-trip-epic');
      expect(result).toEqual(epic);
    });
  });
});

describe('task storage', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-task-storage-test-')));
    mkdirSync(join(testDir, '.saga', 'stories'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  const makeTask = (overrides: Partial<Task> = {}): Task => ({
    id: 't1',
    subject: 'Test task',
    description: 'A test task',
    status: 'pending',
    blockedBy: [],
    ...overrides,
  });

  describe('writeTask', () => {
    it('creates task JSON file with valid content', () => {
      const task = makeTask();

      writeTask(testDir, 'my-story', task);

      const filePath = join(testDir, '.saga', 'stories', 'my-story', 't1.json');
      expect(existsSync(filePath)).toBe(true);

      const contents = readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(contents);
      expect(parsed).toEqual(task);
    });

    it('creates the story directory if it does not exist', () => {
      const task = makeTask();

      writeTask(testDir, 'new-story', task);

      const dirPath = join(testDir, '.saga', 'stories', 'new-story');
      expect(existsSync(dirPath)).toBe(true);
    });

    it('writes pretty-printed JSON with trailing newline', () => {
      const task = makeTask();

      writeTask(testDir, 'pretty-story', task);

      const filePath = join(testDir, '.saga', 'stories', 'pretty-story', 't1.json');
      const contents = readFileSync(filePath, 'utf-8');
      expect(contents).toBe(`${JSON.stringify(task, null, 2)}\n`);
    });

    it('writes all optional fields when present', () => {
      const task = makeTask({
        id: 't2',
        activeForm: 'Testing active form',
        guidance: 'Some guidance',
        doneWhen: 'When tests pass',
      });

      writeTask(testDir, 'full-story', task);

      const filePath = join(testDir, '.saga', 'stories', 'full-story', 't2.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed).toEqual(task);
    });

    it('writes task with in_progress status', () => {
      const task = makeTask({ status: 'in_progress' });

      writeTask(testDir, 'status-story', task);

      const filePath = join(testDir, '.saga', 'stories', 'status-story', 't1.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed.status).toBe('in_progress');
    });

    it('writes task with completed status', () => {
      const task = makeTask({ status: 'completed' });

      writeTask(testDir, 'status-story', task);

      const filePath = join(testDir, '.saga', 'stories', 'status-story', 't1.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed.status).toBe('completed');
    });

    it('overwrites an existing task file', () => {
      const task1 = makeTask({ subject: 'Original' });
      const task2 = makeTask({ subject: 'Updated' });

      writeTask(testDir, 'overwrite-story', task1);
      writeTask(testDir, 'overwrite-story', task2);

      const filePath = join(testDir, '.saga', 'stories', 'overwrite-story', 't1.json');
      const parsed = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(parsed.subject).toBe('Updated');
    });

    it('throws for a task missing required id field', () => {
      const invalid = {
        subject: 'No ID',
        description: 'Missing ID',
        status: 'pending',
        blockedBy: [],
      } as unknown as Task;

      expect(() => writeTask(testDir, 'my-story', invalid)).toThrow();
    });

    it('throws for a task with invalid status', () => {
      const invalid = {
        id: 't1',
        subject: 'Bad status',
        description: 'Invalid status value',
        status: 'blocked',
        blockedBy: [],
      } as unknown as Task;

      expect(() => writeTask(testDir, 'my-story', invalid)).toThrow();
    });

    it('throws for a task missing required blockedBy field', () => {
      const invalid = {
        id: 't1',
        subject: 'No blockedBy',
        description: 'Missing blockedBy',
        status: 'pending',
      } as unknown as Task;

      expect(() => writeTask(testDir, 'my-story', invalid)).toThrow();
    });

    it('writes multiple tasks to the same story directory', () => {
      const task1 = makeTask({ id: 't1' });
      const task2 = makeTask({ id: 't2', subject: 'Second task' });
      const task3 = makeTask({ id: 't3', subject: 'Third task' });

      writeTask(testDir, 'multi-story', task1);
      writeTask(testDir, 'multi-story', task2);
      writeTask(testDir, 'multi-story', task3);

      expect(existsSync(join(testDir, '.saga', 'stories', 'multi-story', 't1.json'))).toBe(true);
      expect(existsSync(join(testDir, '.saga', 'stories', 'multi-story', 't2.json'))).toBe(true);
      expect(existsSync(join(testDir, '.saga', 'stories', 'multi-story', 't3.json'))).toBe(true);
    });
  });

  describe('readTask', () => {
    it('reads and parses a valid task JSON file', () => {
      const task = makeTask();

      writeTask(testDir, 'read-story', task);
      const result = readTask(testDir, 'read-story', 't1');
      expect(result).toEqual(task);
    });

    it('reads task with all optional fields', () => {
      const task = makeTask({
        activeForm: 'Testing',
        guidance: 'Follow TDD',
        doneWhen: 'All tests pass',
      });

      writeTask(testDir, 'full-story', task);
      const result = readTask(testDir, 'full-story', 't1');
      expect(result).toEqual(task);
    });

    it('throws when story directory does not exist', () => {
      expect(() => readTask(testDir, 'nonexistent', 't1')).toThrow();
    });

    it('throws when task file does not exist', () => {
      mkdirSync(join(testDir, '.saga', 'stories', 'empty-story'), { recursive: true });
      expect(() => readTask(testDir, 'empty-story', 't1')).toThrow();
    });

    it('throws for malformed JSON', () => {
      const storyDir = join(testDir, '.saga', 'stories', 'bad-json');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 't1.json'), '{ invalid json }', 'utf-8');

      expect(() => readTask(testDir, 'bad-json', 't1')).toThrow();
    });

    it('throws for JSON that does not match the Task schema', () => {
      const storyDir = join(testDir, '.saga', 'stories', 'bad-schema');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 't1.json'),
        JSON.stringify({ id: 't1', wrong: 'field' }),
        'utf-8',
      );

      expect(() => readTask(testDir, 'bad-schema', 't1')).toThrow();
    });

    it('round-trips write then read correctly', () => {
      const task = makeTask({
        id: 't5',
        subject: 'Round trip task',
        blockedBy: ['t3', 't4'],
        guidance: 'Some guidance',
      });

      writeTask(testDir, 'round-trip-story', task);
      const result = readTask(testDir, 'round-trip-story', 't5');
      expect(result).toEqual(task);
    });
  });

  describe('listTasks', () => {
    it('returns all tasks for a story', () => {
      const task1 = makeTask({ id: 't1', subject: 'First' });
      const task2 = makeTask({ id: 't2', subject: 'Second' });
      const task3 = makeTask({ id: 't3', subject: 'Third' });

      writeTask(testDir, 'list-story', task1);
      writeTask(testDir, 'list-story', task2);
      writeTask(testDir, 'list-story', task3);

      const tasks = listTasks(testDir, 'list-story');

      const ids = tasks.map((t) => t.id).sort();
      expect(ids).toEqual(['t1', 't2', 't3']);
    });

    it('excludes story.json from task listing', () => {
      const task = makeTask();
      writeTask(testDir, 'with-story-json', task);

      // Also write a story.json in the same directory
      const storyDir = join(testDir, '.saga', 'stories', 'with-story-json');
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({ id: 'with-story-json', title: 'Test', description: 'Test' }),
        'utf-8',
      );

      const tasks = listTasks(testDir, 'with-story-json');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('t1');
    });

    it('excludes journal.md from task listing', () => {
      const task = makeTask();
      writeTask(testDir, 'with-journal', task);

      // Also write a journal.md in the same directory
      const storyDir = join(testDir, '.saga', 'stories', 'with-journal');
      writeFileSync(join(storyDir, 'journal.md'), '# Journal', 'utf-8');

      const tasks = listTasks(testDir, 'with-journal');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('t1');
    });

    it('excludes non-JSON files from task listing', () => {
      const task = makeTask();
      writeTask(testDir, 'with-extras', task);

      const storyDir = join(testDir, '.saga', 'stories', 'with-extras');
      writeFileSync(join(storyDir, 'notes.txt'), 'some notes', 'utf-8');
      writeFileSync(join(storyDir, '.gitkeep'), '', 'utf-8');

      const tasks = listTasks(testDir, 'with-extras');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('t1');
    });

    it('returns empty array for story with no task files', () => {
      mkdirSync(join(testDir, '.saga', 'stories', 'empty-story'), { recursive: true });

      const tasks = listTasks(testDir, 'empty-story');
      expect(tasks).toEqual([]);
    });

    it('returns empty array for story with only story.json and journal.md', () => {
      const storyDir = join(testDir, '.saga', 'stories', 'no-tasks');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(
        join(storyDir, 'story.json'),
        JSON.stringify({ id: 'no-tasks', title: 'Test', description: 'Test' }),
        'utf-8',
      );
      writeFileSync(join(storyDir, 'journal.md'), '# Journal', 'utf-8');

      const tasks = listTasks(testDir, 'no-tasks');
      expect(tasks).toEqual([]);
    });

    it('throws when story directory does not exist', () => {
      expect(() => listTasks(testDir, 'nonexistent')).toThrow();
    });
  });
});

describe('deriveStoryStatus', () => {
  it('returns "pending" for an empty task array', () => {
    expect(deriveStoryStatus([])).toBe('pending');
  });

  it('returns "pending" when all tasks are pending', () => {
    expect(deriveStoryStatus([{ status: 'pending' }, { status: 'pending' }])).toBe('pending');
  });

  it('returns "in_progress" when any task is in_progress', () => {
    expect(
      deriveStoryStatus([{ status: 'pending' }, { status: 'in_progress' }, { status: 'pending' }]),
    ).toBe('in_progress');
  });

  it('returns "in_progress" when some tasks are completed and one is in_progress', () => {
    expect(
      deriveStoryStatus([
        { status: 'completed' },
        { status: 'in_progress' },
        { status: 'pending' },
      ]),
    ).toBe('in_progress');
  });

  it('returns "completed" when all tasks are completed', () => {
    expect(deriveStoryStatus([{ status: 'completed' }, { status: 'completed' }])).toBe('completed');
  });

  it('returns "pending" when some tasks are completed and rest are pending (no in_progress)', () => {
    expect(deriveStoryStatus([{ status: 'completed' }, { status: 'pending' }])).toBe('pending');
  });

  it('returns "pending" for a single pending task', () => {
    expect(deriveStoryStatus([{ status: 'pending' }])).toBe('pending');
  });

  it('returns "in_progress" for a single in_progress task', () => {
    expect(deriveStoryStatus([{ status: 'in_progress' }])).toBe('in_progress');
  });

  it('returns "completed" for a single completed task', () => {
    expect(deriveStoryStatus([{ status: 'completed' }])).toBe('completed');
  });
});

describe('deriveEpicStatus', () => {
  it('returns "pending" for an empty status array', () => {
    expect(deriveEpicStatus([])).toBe('pending');
  });

  it('returns "pending" when all stories are pending', () => {
    expect(deriveEpicStatus(['pending', 'pending'])).toBe('pending');
  });

  it('returns "in_progress" when any story is in_progress', () => {
    expect(deriveEpicStatus(['pending', 'in_progress', 'pending'])).toBe('in_progress');
  });

  it('returns "in_progress" when some stories are completed and one is in_progress', () => {
    expect(deriveEpicStatus(['completed', 'in_progress', 'pending'])).toBe('in_progress');
  });

  it('returns "completed" when all stories are completed', () => {
    expect(deriveEpicStatus(['completed', 'completed'])).toBe('completed');
  });

  it('returns "pending" when some stories are completed and rest are pending (no in_progress)', () => {
    expect(deriveEpicStatus(['completed', 'pending'])).toBe('pending');
  });

  it('returns "pending" for a single pending status', () => {
    expect(deriveEpicStatus(['pending'])).toBe('pending');
  });

  it('returns "in_progress" for a single in_progress status', () => {
    expect(deriveEpicStatus(['in_progress'])).toBe('in_progress');
  });

  it('returns "completed" for a single completed status', () => {
    expect(deriveEpicStatus(['completed'])).toBe('completed');
  });
});

describe('validateStoryId', () => {
  it('accepts a simple lowercase id', () => {
    expect(validateStoryId('auth-setup')).toBe(true);
  });

  it('accepts a single character id', () => {
    expect(validateStoryId('a')).toBe(true);
  });

  it('accepts an id with digits', () => {
    expect(validateStoryId('my-story-123')).toBe(true);
  });

  it('accepts an id with only digits', () => {
    expect(validateStoryId('123')).toBe(true);
  });

  it('accepts an id with only dashes and letters', () => {
    expect(validateStoryId('auth-setup-db')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(validateStoryId('')).toBe(false);
  });

  it('rejects an id with uppercase letters', () => {
    expect(validateStoryId('Auth-Setup')).toBe(false);
  });

  it('rejects an id with spaces', () => {
    expect(validateStoryId('my story')).toBe(false);
  });

  it('rejects an id with underscores', () => {
    expect(validateStoryId('my_story')).toBe(false);
  });

  it('rejects an id with special characters', () => {
    expect(validateStoryId('story@1')).toBe(false);
  });

  it('rejects an id with dots', () => {
    expect(validateStoryId('story.one')).toBe(false);
  });

  it('rejects an id with slashes', () => {
    expect(validateStoryId('story/one')).toBe(false);
  });
});

describe('ensureUniqueStoryId', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-unique-id-test-')));
    mkdirSync(join(testDir, '.saga', 'stories'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('does not throw when no story directory exists with the given id', () => {
    expect(() => ensureUniqueStoryId(testDir, 'new-story')).not.toThrow();
  });

  it('throws when a story directory already exists with the given id', () => {
    mkdirSync(join(testDir, '.saga', 'stories', 'existing-story'), { recursive: true });

    expect(() => ensureUniqueStoryId(testDir, 'existing-story')).toThrow('already exists');
  });

  it('does not throw when other story directories exist but not the given id', () => {
    mkdirSync(join(testDir, '.saga', 'stories', 'other-story'), { recursive: true });

    expect(() => ensureUniqueStoryId(testDir, 'new-story')).not.toThrow();
  });

  it('throws with a descriptive error message including the story id', () => {
    mkdirSync(join(testDir, '.saga', 'stories', 'duplicate-story'), { recursive: true });

    expect(() => ensureUniqueStoryId(testDir, 'duplicate-story')).toThrow('duplicate-story');
  });
});
