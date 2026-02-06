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
import type { Epic, Story } from '@saga-ai/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readEpic, readStory, writeEpic, writeStory } from './storage.ts';

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
