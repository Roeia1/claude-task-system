/**
 * Tests for the file system parsing module
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseEpic, parseJournal, parseStory, scanSagaDirectory } from '../parser.js';

/** Helper to assert a value is not null/undefined and return it typed */
function assertDefined<T>(
  value: T | null | undefined,
  message = 'Expected value to be defined',
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

describe('parser', () => {
  let testDir: string;
  let sagaDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'saga-parser-test-'));
    sagaDir = join(testDir, '.saga');
    mkdirSync(join(sagaDir, 'epics'), { recursive: true });
    mkdirSync(join(sagaDir, 'archive'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseStory', () => {
    it('should parse story with valid YAML frontmatter', async () => {
      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'test-story');
      mkdirSync(storyPath, { recursive: true });

      const storyContent = `---
id: test-story
title: Test Story Title
status: in_progress
epic: test-epic
tasks:
  - id: t1
    title: First Task
    status: completed
  - id: t2
    title: Second Task
    status: pending
---

## Context

This is the story context.
`;
      writeFileSync(join(storyPath, 'story.md'), storyContent);

      const result = assertDefined(await parseStory(join(storyPath, 'story.md'), 'test-epic'));

      expect(result.slug).toBe('test-story');
      expect(result.title).toBe('Test Story Title');
      expect(result.status).toBe('in_progress');
      expect(result.epicSlug).toBe('test-epic');
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]).toEqual({ id: 't1', title: 'First Task', status: 'completed' });
      expect(result.tasks[1]).toEqual({ id: 't2', title: 'Second Task', status: 'pending' });
    });

    it('should return null for non-existent file', async () => {
      const result = await parseStory('/nonexistent/path/story.md', 'test-epic');
      expect(result).toBeNull();
    });

    it('should handle malformed YAML with sensible defaults', async () => {
      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'bad-story');
      mkdirSync(storyPath, { recursive: true });

      // Malformed YAML - missing required fields
      const storyContent = `---
title: Just a Title
---

Some content.
`;
      writeFileSync(join(storyPath, 'story.md'), storyContent);

      const result = assertDefined(await parseStory(join(storyPath, 'story.md'), 'test-epic'));

      expect(result.title).toBe('Just a Title');
      expect(result.status).toBe('ready'); // default
      expect(result.tasks).toEqual([]); // default empty array
    });

    it('should handle completely invalid YAML gracefully', async () => {
      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'invalid-story');
      mkdirSync(storyPath, { recursive: true });

      // Completely invalid YAML
      const storyContent = `---
: : : invalid yaml
  bad: indentation
    worse: [unclosed
---

Content here.
`;
      writeFileSync(join(storyPath, 'story.md'), storyContent);

      // Should return with defaults rather than throwing
      const result = assertDefined(await parseStory(join(storyPath, 'story.md'), 'test-epic'));

      expect(result.status).toBe('ready');
      expect(result.tasks).toEqual([]);
    });

    it('should include paths in the result', async () => {
      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'test-story');
      mkdirSync(storyPath, { recursive: true });

      const storyContent = `---
id: test-story
title: Test Story
status: ready
epic: test-epic
tasks: []
---
`;
      writeFileSync(join(storyPath, 'story.md'), storyContent);

      const result = assertDefined(await parseStory(join(storyPath, 'story.md'), 'test-epic'));

      expect(result.paths.storyMd).toContain('story.md');
    });

    it('should detect journal.md if present', async () => {
      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'test-story');
      mkdirSync(storyPath, { recursive: true });

      const storyContent = `---
id: test-story
title: Test Story
status: ready
epic: test-epic
tasks: []
---
`;
      writeFileSync(join(storyPath, 'story.md'), storyContent);
      writeFileSync(join(storyPath, 'journal.md'), '# Journal');

      const result = assertDefined(await parseStory(join(storyPath, 'story.md'), 'test-epic'));

      expect(result.paths.journalMd).toContain('journal.md');
    });
  });

  describe('parseEpic', () => {
    it('should extract title from first heading in epic.md', async () => {
      const epicPath = join(sagaDir, 'epics', 'test-epic');
      mkdirSync(epicPath, { recursive: true });

      const epicContent = `# My Amazing Epic

## Overview

This is the epic overview.
`;
      writeFileSync(join(epicPath, 'epic.md'), epicContent);

      const title = await parseEpic(join(epicPath, 'epic.md'));

      expect(title).toBe('My Amazing Epic');
    });

    it('should return null for non-existent file', async () => {
      const result = await parseEpic('/nonexistent/epic.md');
      expect(result).toBeNull();
    });

    it('should return slug-based title if no heading found', async () => {
      const epicPath = join(sagaDir, 'epics', 'test-epic');
      mkdirSync(epicPath, { recursive: true });

      const epicContent = `No heading here, just text.`;
      writeFileSync(join(epicPath, 'epic.md'), epicContent);

      const result = await parseEpic(join(epicPath, 'epic.md'));

      // Should return null or undefined when no heading
      expect(result).toBeNull();
    });
  });

  describe('parseJournal', () => {
    it('should parse session entries', async () => {
      const journalContent = `# Journal

## Session: 2024-01-15T10:00:00Z

### Task: t1 - First Task

**What was done:**
- Implemented feature X

**Decisions:**
- Used approach A

**Next steps:**
- Continue with task t2
`;

      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'test-story');
      mkdirSync(storyPath, { recursive: true });
      writeFileSync(join(storyPath, 'journal.md'), journalContent);

      const entries = await parseJournal(join(storyPath, 'journal.md'));

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('session');
      expect(entries[0].timestamp).toBe('2024-01-15T10:00:00Z');
      expect(entries[0].content).toContain('First Task');
    });

    it('should parse blocker entries', async () => {
      const journalContent = `# Journal

## Blocker: Authentication Issue

**Task**: t3 - Login implementation
**What I'm trying to do**: Implement OAuth flow
**What I tried**: Using passport.js
**What I need**: Decision on auth provider
**Suggested options**:
- Option A: Google OAuth
- Option B: GitHub OAuth
`;

      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'test-story');
      mkdirSync(storyPath, { recursive: true });
      writeFileSync(join(storyPath, 'journal.md'), journalContent);

      const entries = await parseJournal(join(storyPath, 'journal.md'));

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('blocker');
      expect(entries[0].content).toContain('Authentication Issue');
    });

    it('should parse resolution entries', async () => {
      const journalContent = `# Journal

## Resolution: Use Google OAuth

After team discussion, we decided to use Google OAuth because:
- Better user experience
- Simpler integration
`;

      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'test-story');
      mkdirSync(storyPath, { recursive: true });
      writeFileSync(join(storyPath, 'journal.md'), journalContent);

      const entries = await parseJournal(join(storyPath, 'journal.md'));

      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe('resolution');
      expect(entries[0].content).toContain('Google OAuth');
    });

    it('should parse multiple entries of different types', async () => {
      const journalContent = `# Journal

## Session: 2024-01-14T10:00:00Z

Started work on authentication.

## Blocker: Need OAuth Provider Decision

Blocked on auth provider choice.

## Resolution: Use GitHub OAuth

Team chose GitHub OAuth.

## Session: 2024-01-15T10:00:00Z

Implemented GitHub OAuth.
`;

      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'test-story');
      mkdirSync(storyPath, { recursive: true });
      writeFileSync(join(storyPath, 'journal.md'), journalContent);

      const entries = await parseJournal(join(storyPath, 'journal.md'));

      expect(entries).toHaveLength(4);
      expect(entries[0].type).toBe('session');
      expect(entries[1].type).toBe('blocker');
      expect(entries[2].type).toBe('resolution');
      expect(entries[3].type).toBe('session');
    });

    it('should return empty array for non-existent file', async () => {
      const entries = await parseJournal('/nonexistent/journal.md');
      expect(entries).toEqual([]);
    });

    it('should return empty array for file with no recognized headers', async () => {
      const storyPath = join(sagaDir, 'epics', 'test-epic', 'stories', 'test-story');
      mkdirSync(storyPath, { recursive: true });
      writeFileSync(join(storyPath, 'journal.md'), '# Just a title\n\nSome random content.');

      const entries = await parseJournal(join(storyPath, 'journal.md'));
      expect(entries).toEqual([]);
    });
  });

  describe('scanSagaDirectory', () => {
    it('should return empty array when no epics exist', async () => {
      const result = await scanSagaDirectory(testDir);

      expect(result).toEqual([]);
    });

    it('should scan single epic with stories', async () => {
      // Create epic
      const epicPath = join(sagaDir, 'epics', 'my-epic');
      mkdirSync(epicPath, { recursive: true });
      writeFileSync(join(epicPath, 'epic.md'), '# My Test Epic\n\nContent here.');

      // Create story
      const storyPath = join(epicPath, 'stories', 'my-story');
      mkdirSync(storyPath, { recursive: true });
      writeFileSync(
        join(storyPath, 'story.md'),
        `---
id: my-story
title: My Test Story
status: ready
epic: my-epic
tasks:
  - id: t1
    title: Task One
    status: pending
---

Story content.
`,
      );

      const result = await scanSagaDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('my-epic');
      expect(result[0].title).toBe('My Test Epic');
      expect(result[0].stories).toHaveLength(1);
      expect(result[0].stories[0].slug).toBe('my-story');
      expect(result[0].stories[0].title).toBe('My Test Story');
    });

    it('should calculate story counts correctly', async () => {
      // Create epic
      const epicPath = join(sagaDir, 'epics', 'counting-epic');
      mkdirSync(epicPath, { recursive: true });
      writeFileSync(join(epicPath, 'epic.md'), '# Counting Epic');

      // Create stories with different statuses
      const statuses = ['ready', 'in_progress', 'blocked', 'completed', 'completed'];

      for (let i = 0; i < statuses.length; i++) {
        const storyPath = join(epicPath, 'stories', `story-${i}`);
        mkdirSync(storyPath, { recursive: true });
        writeFileSync(
          join(storyPath, 'story.md'),
          `---
id: story-${i}
title: Story ${i}
status: ${statuses[i]}
epic: counting-epic
tasks: []
---
`,
        );
      }

      const result = await scanSagaDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].storyCounts).toEqual({
        total: 5,
        ready: 1,
        inProgress: 1,
        blocked: 1,
        completed: 2,
      });
    });

    it('should scan multiple epics', async () => {
      // Create two epics
      for (const epicSlug of ['epic-one', 'epic-two']) {
        const epicPath = join(sagaDir, 'epics', epicSlug);
        mkdirSync(epicPath, { recursive: true });
        writeFileSync(join(epicPath, 'epic.md'), `# ${epicSlug} Title`);

        const storyPath = join(epicPath, 'stories', 'story-a');
        mkdirSync(storyPath, { recursive: true });
        writeFileSync(
          join(storyPath, 'story.md'),
          `---
id: story-a
title: Story A for ${epicSlug}
status: ready
epic: ${epicSlug}
tasks: []
---
`,
        );
      }

      const result = await scanSagaDirectory(testDir);

      expect(result).toHaveLength(2);
      const slugs = result.map((e) => e.slug).sort();
      expect(slugs).toEqual(['epic-one', 'epic-two']);
    });

    it('should include archived stories with archived flag', async () => {
      // Create epic in main location
      const epicPath = join(sagaDir, 'epics', 'my-epic');
      mkdirSync(epicPath, { recursive: true });
      writeFileSync(join(epicPath, 'epic.md'), '# My Epic');

      // Create active story
      const activeStoryPath = join(epicPath, 'stories', 'active-story');
      mkdirSync(activeStoryPath, { recursive: true });
      writeFileSync(
        join(activeStoryPath, 'story.md'),
        `---
id: active-story
title: Active Story
status: ready
epic: my-epic
tasks: []
---
`,
      );

      // Create archived story
      const archivedPath = join(sagaDir, 'archive', 'my-epic', 'archived-story');
      mkdirSync(archivedPath, { recursive: true });
      writeFileSync(
        join(archivedPath, 'story.md'),
        `---
id: archived-story
title: Archived Story
status: completed
epic: my-epic
tasks: []
---
`,
      );

      const result = await scanSagaDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].stories).toHaveLength(2);

      const activeStory = result[0].stories.find((s) => s.slug === 'active-story');
      const archivedStory = result[0].stories.find((s) => s.slug === 'archived-story');

      expect(activeStory).toBeDefined();
      expect(assertDefined(activeStory).archived).toBeFalsy();

      expect(archivedStory).toBeDefined();
      expect(assertDefined(archivedStory).archived).toBe(true);
    });

    it('should handle epic with no stories directory', async () => {
      const epicPath = join(sagaDir, 'epics', 'empty-epic');
      mkdirSync(epicPath, { recursive: true });
      writeFileSync(join(epicPath, 'epic.md'), '# Empty Epic');

      const result = await scanSagaDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('empty-epic');
      expect(result[0].stories).toEqual([]);
      expect(result[0].storyCounts.total).toBe(0);
    });

    it('should use relative paths from saga root', async () => {
      // Create epic with story
      const epicPath = join(sagaDir, 'epics', 'path-test');
      mkdirSync(epicPath, { recursive: true });
      writeFileSync(join(epicPath, 'epic.md'), '# Path Test Epic');

      const storyPath = join(epicPath, 'stories', 'my-story');
      mkdirSync(storyPath, { recursive: true });
      writeFileSync(
        join(storyPath, 'story.md'),
        `---
id: my-story
title: My Story
status: ready
epic: path-test
tasks: []
---
`,
      );

      const result = await scanSagaDirectory(testDir);

      expect(result).toHaveLength(1);
      // Paths should be relative to saga root, not absolute
      expect(result[0].path).not.toContain(testDir);
      expect(result[0].path).toContain('path-test');
      expect(result[0].stories[0].paths.storyMd).not.toContain(testDir);
    });

    it('should skip non-directory entries in epics folder', async () => {
      // Create a regular file in epics folder (should be ignored)
      writeFileSync(join(sagaDir, 'epics', 'not-a-directory.txt'), 'ignored');

      // Create a valid epic
      const epicPath = join(sagaDir, 'epics', 'valid-epic');
      mkdirSync(epicPath, { recursive: true });
      writeFileSync(join(epicPath, 'epic.md'), '# Valid Epic');

      const result = await scanSagaDirectory(testDir);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('valid-epic');
    });
  });
});
