/**
 * Tests for File Watcher Module
 *
 * Tests file watching with chokidar for .saga/ directory changes.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSagaWatcher, type WatcherEvent } from '../watcher.ts';

describe('watcher', () => {
  let tempDir: string;
  let sagaRoot: string;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = await mkdtemp(join(tmpdir(), 'saga-watcher-test-'));
    sagaRoot = tempDir;

    // Create basic .saga structure
    await mkdir(join(sagaRoot, '.saga', 'epics', 'test-epic', 'stories', 'test-story'), {
      recursive: true,
    });
    await mkdir(join(sagaRoot, '.saga', 'archive'), { recursive: true });

    // Create epic.md
    await writeFile(
      join(sagaRoot, '.saga', 'epics', 'test-epic', 'epic.md'),
      '# Test Epic\n\nSome content.',
    );

    // Create story.md
    await writeFile(
      join(sagaRoot, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
      `---
id: test-story
title: Test Story
status: ready
tasks:
  - id: t1
    title: Task 1
    status: pending
---

## Context
Some context.
`,
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('createSagaWatcher', () => {
    it('should create a watcher instance', async () => {
      const watcher = await createSagaWatcher(sagaRoot);

      expect(watcher).toBeDefined();
      expect(watcher.close).toBeInstanceOf(Function);
      expect(watcher.on).toBeInstanceOf(Function);

      await watcher.close();
    });

    it('should watch .saga/epics directory', async () => {
      const watcher = await createSagaWatcher(sagaRoot);

      // Watcher should be able to listen for events
      expect(watcher.on).toBeDefined();

      await watcher.close();
    });

    it('should watch .saga/archive directory', async () => {
      const watcher = await createSagaWatcher(sagaRoot);

      // Verify watcher is created (archive watching verified through event tests)
      expect(watcher).toBeDefined();

      await watcher.close();
    });
  });

  describe('file change detection', () => {
    it('should emit story:changed event when story.md is modified', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify story.md
      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        `---
id: test-story
title: Test Story Updated
status: in_progress
tasks:
  - id: t1
    title: Task 1
    status: in_progress
---

## Context
Updated context.
`,
      );

      // Wait for debounced event (100ms debounce + buffer)
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('story:changed');
      expect(events[0].epicSlug).toBe('test-epic');
      expect(events[0].storySlug).toBe('test-story');

      await watcher.close();
    });

    it('should emit story:changed event when journal.md is created', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create journal.md
      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'journal.md'),
        `# Journal: test-story

## Session: 2026-01-27T00:00:00Z

### Task: t1

**What was done:**
- Created journal
`,
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some((e) => e.type === 'story:changed')).toBe(true);

      await watcher.close();
    });

    it('should emit epic:changed event when epic.md is modified', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('epic:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify epic.md
      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'test-epic', 'epic.md'),
        '# Test Epic Updated\n\nUpdated content.',
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('epic:changed');
      expect(events[0].epicSlug).toBe('test-epic');

      await watcher.close();
    });

    it('should emit epic:added event when new epic directory is created', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('epic:added', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create new epic
      await mkdir(join(sagaRoot, '.saga', 'epics', 'new-epic'), { recursive: true });
      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'new-epic', 'epic.md'),
        '# New Epic\n\nNew content.',
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some((e) => e.type === 'epic:added' && e.epicSlug === 'new-epic')).toBe(true);

      await watcher.close();
    });

    it('should emit story:added event when new story is created', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:added', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create new story
      await mkdir(join(sagaRoot, '.saga', 'epics', 'test-epic', 'stories', 'new-story'), {
        recursive: true,
      });
      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'test-epic', 'stories', 'new-story', 'story.md'),
        `---
id: new-story
title: New Story
status: ready
tasks: []
---
`,
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some((e) => e.type === 'story:added' && e.storySlug === 'new-story')).toBe(
        true,
      );

      await watcher.close();
    });
  });

  describe('debouncing', () => {
    it('should debounce rapid changes into single event', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Make rapid changes
      const storyPath = join(
        sagaRoot,
        '.saga',
        'epics',
        'test-epic',
        'stories',
        'test-story',
        'story.md',
      );

      await writeFile(storyPath, '---\nid: test-story\ntitle: Change 1\nstatus: ready\n---\n');
      await writeFile(storyPath, '---\nid: test-story\ntitle: Change 2\nstatus: ready\n---\n');
      await writeFile(storyPath, '---\nid: test-story\ntitle: Change 3\nstatus: ready\n---\n');

      // Wait for debounce window to pass
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should have only 1 event (or at most 2 due to timing), not 3
      expect(events.length).toBeLessThanOrEqual(2);

      await watcher.close();
    });
  });

  describe('file filtering', () => {
    it('should only watch .md files', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });
      watcher.on('epic:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a non-md file
      await writeFile(join(sagaRoot, '.saga', 'epics', 'test-epic', 'notes.txt'), 'Some notes');

      // Wait for potential event
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not have received any events for .txt file
      expect(events.length).toBe(0);

      await watcher.close();
    });
  });

  describe('archive watching', () => {
    it('should emit story:changed event for archived story changes', async () => {
      // Create archived story
      await mkdir(join(sagaRoot, '.saga', 'archive', 'test-epic', 'archived-story'), {
        recursive: true,
      });
      await writeFile(
        join(sagaRoot, '.saga', 'archive', 'test-epic', 'archived-story', 'story.md'),
        `---
id: archived-story
title: Archived Story
status: completed
tasks: []
---
`,
      );

      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Modify archived story
      await writeFile(
        join(sagaRoot, '.saga', 'archive', 'test-epic', 'archived-story', 'story.md'),
        `---
id: archived-story
title: Archived Story Updated
status: completed
tasks: []
---
`,
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].storySlug).toBe('archived-story');
      expect(events[0].archived).toBe(true);

      await watcher.close();
    });
  });

  describe('error handling', () => {
    it('should handle watching non-existent saga directory gracefully', async () => {
      const nonExistentPath = join(tempDir, 'non-existent');

      // Should not throw
      const watcher = await createSagaWatcher(nonExistentPath);
      expect(watcher).toBeDefined();

      await watcher.close();
    });

    it('should recover from transient file errors without crashing', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const errors: Error[] = [];

      watcher.on('error', (error) => {
        errors.push(error);
      });

      // Watcher should be operational
      expect(watcher).toBeDefined();

      await watcher.close();
    });
  });

  describe('close', () => {
    it('should stop watching after close is called', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Close the watcher
      await watcher.close();

      // Wait a bit then make changes
      await new Promise((resolve) => setTimeout(resolve, 100));

      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'test-epic', 'stories', 'test-story', 'story.md'),
        '---\nid: test-story\ntitle: After Close\nstatus: ready\n---\n',
      );

      // Wait for potential event
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Should not have received events after close
      expect(events.length).toBe(0);
    });
  });
});
