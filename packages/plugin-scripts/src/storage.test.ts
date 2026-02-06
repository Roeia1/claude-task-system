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
import type { Story } from '@saga-ai/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readStory, writeStory } from './storage.ts';

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
