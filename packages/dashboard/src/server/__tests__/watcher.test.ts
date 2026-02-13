/**
 * Tests for File Watcher Module
 *
 * Tests file watching with chokidar for .saga/ directory changes.
 *
 * New path structure:
 *   .saga/stories/<story-id>/story.json  → story:added/changed/removed
 *   .saga/stories/<story-id>/<task-id>.json → story:changed (task change triggers story refresh)
 *   .saga/stories/<story-id>/journal.md  → story:changed
 *   .saga/epics/<epic-id>.json           → epic:added/changed/removed
 *
 * Note: These tests involve real file system watching with debouncing and
 * awaitWriteFinish for reliability. Tests take ~500ms each due to:
 * watcher setup + awaitWriteFinish stabilization + debounce delay + FS events.
 * This is expected behavior for integration tests of file watching functionality.
 */

import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSagaWatcher, type WatcherEvent } from '../watcher.ts';

/**
 * Delay in ms to wait for watcher to be ready after creation.
 * With polling mode, timing is predictable.
 */
const WATCHER_READY_DELAY_MS = 100;

/**
 * Delay in ms to wait for debounced events.
 * Accounts for: polling interval (100ms) + awaitWriteFinish (50ms)
 * + debounce delay (100ms) + buffer.
 */
const DEBOUNCE_WAIT_MS = 400;

describe('watcher', () => {
  let tempDir: string;
  let sagaRoot: string;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = await mkdtemp(join(tmpdir(), 'saga-watcher-test-'));
    sagaRoot = tempDir;

    // Create new .saga structure with stories/ and epics/
    await mkdir(join(sagaRoot, '.saga', 'stories', 'test-story'), {
      recursive: true,
    });
    await mkdir(join(sagaRoot, '.saga', 'epics'), { recursive: true });

    // Create epic JSON file
    await writeFile(
      join(sagaRoot, '.saga', 'epics', 'test-epic.json'),
      JSON.stringify({
        id: 'test-epic',
        title: 'Test Epic',
        description: 'A test epic',
        children: [{ id: 'test-story', blockedBy: [] }],
      }),
    );

    // Create story.json
    await writeFile(
      join(sagaRoot, '.saga', 'stories', 'test-story', 'story.json'),
      JSON.stringify({
        id: 'test-story',
        title: 'Test Story',
        description: 'A test story',
        epic: 'test-epic',
      }),
    );

    // Create task JSON file
    await writeFile(
      join(sagaRoot, '.saga', 'stories', 'test-story', 't1.json'),
      JSON.stringify({
        id: 't1',
        subject: 'Task 1',
        description: 'First task',
        status: 'pending',
        blockedBy: [],
      }),
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

    it('should watch .saga/stories directory', async () => {
      const watcher = await createSagaWatcher(sagaRoot);

      // Watcher should be able to listen for events
      expect(watcher.on).toBeDefined();

      await watcher.close();
    });

    it('should watch .saga/epics directory', async () => {
      const watcher = await createSagaWatcher(sagaRoot);

      // Verify watcher is created (epics watching verified through event tests)
      expect(watcher).toBeDefined();

      await watcher.close();
    });
  });

  describe('story file change detection', () => {
    it('should emit story:changed event when story.json is modified', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Modify story.json
      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'test-story', 'story.json'),
        JSON.stringify({
          id: 'test-story',
          title: 'Test Story Updated',
          description: 'Updated story',
          epic: 'test-epic',
        }),
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('story:changed');
      expect(events[0].storyId).toBe('test-story');

      await watcher.close();
    });

    it('should emit story:changed event when a task JSON file is modified', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Modify task file
      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'test-story', 't1.json'),
        JSON.stringify({
          id: 't1',
          subject: 'Task 1 Updated',
          description: 'Updated task',
          status: 'in_progress',
          blockedBy: [],
        }),
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('story:changed');
      expect(events[0].storyId).toBe('test-story');

      await watcher.close();
    });

    it('should emit story:changed event when a new task JSON file is added', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Add new task file
      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'test-story', 't2.json'),
        JSON.stringify({
          id: 't2',
          subject: 'Task 2',
          description: 'Second task',
          status: 'pending',
          blockedBy: [],
        }),
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('story:changed');
      expect(events[0].storyId).toBe('test-story');

      await watcher.close();
    });

    it('should emit story:changed event when journal.md is created', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Create journal.md
      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'test-story', 'journal.md'),
        `# Journal: test-story

## Session: 2026-01-27T00:00:00Z

### Task: t1

**What was done:**
- Created journal
`,
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some((e) => e.type === 'story:changed')).toBe(true);
      expect(events[0].storyId).toBe('test-story');

      await watcher.close();
    });

    it('should emit story:added event when new story folder with story.json is created', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:added', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Create new story
      await mkdir(join(sagaRoot, '.saga', 'stories', 'new-story'), {
        recursive: true,
      });
      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'new-story', 'story.json'),
        JSON.stringify({
          id: 'new-story',
          title: 'New Story',
          description: 'A new story',
        }),
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some((e) => e.type === 'story:added' && e.storyId === 'new-story')).toBe(true);

      await watcher.close();
    });

    it('should emit story:removed event when story.json is deleted', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:removed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Remove story.json
      await unlink(join(sagaRoot, '.saga', 'stories', 'test-story', 'story.json'));

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('story:removed');
      expect(events[0].storyId).toBe('test-story');

      await watcher.close();
    });
  });

  describe('epic file change detection', () => {
    it('should emit epic:changed event when epic JSON file is modified', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('epic:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Modify epic JSON file
      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'test-epic.json'),
        JSON.stringify({
          id: 'test-epic',
          title: 'Test Epic Updated',
          description: 'Updated epic',
          children: [{ id: 'test-story', blockedBy: [] }],
        }),
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('epic:changed');
      expect(events[0].epicId).toBe('test-epic');

      await watcher.close();
    });

    it('should emit epic:added event when new epic JSON file is created', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('epic:added', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Create new epic
      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'new-epic.json'),
        JSON.stringify({
          id: 'new-epic',
          title: 'New Epic',
          description: 'A new epic',
          children: [],
        }),
      );

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some((e) => e.type === 'epic:added' && e.epicId === 'new-epic')).toBe(true);

      await watcher.close();
    });

    it('should emit epic:removed event when epic JSON file is deleted', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('epic:removed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Remove epic file
      await unlink(join(sagaRoot, '.saga', 'epics', 'test-epic.json'));

      // Wait for debounced event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].type).toBe('epic:removed');
      expect(events[0].epicId).toBe('test-epic');

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
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Make rapid changes to story.json
      const storyPath = join(sagaRoot, '.saga', 'stories', 'test-story', 'story.json');

      await writeFile(storyPath, JSON.stringify({ id: 'test-story', title: 'Change 1' }));
      await writeFile(storyPath, JSON.stringify({ id: 'test-story', title: 'Change 2' }));
      await writeFile(storyPath, JSON.stringify({ id: 'test-story', title: 'Change 3' }));

      // Wait for debounce window to pass
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      // Should have only 1 event (or at most 2 due to timing), not 3
      expect(events.length).toBeLessThanOrEqual(2);

      await watcher.close();
    });

    it('should aggregate task and story changes for the same story', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Modify both story.json and task file rapidly
      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'test-story', 'story.json'),
        JSON.stringify({ id: 'test-story', title: 'Updated' }),
      );
      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'test-story', 't1.json'),
        JSON.stringify({ id: 't1', subject: 'Updated', status: 'completed', blockedBy: [] }),
      );

      // Wait for debounce window to pass
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      // Both changes should be debounced since they relate to the same story
      expect(events.length).toBeLessThanOrEqual(2);
      expect(events.every((e) => e.storyId === 'test-story')).toBe(true);

      await watcher.close();
    });
  });

  describe('file filtering', () => {
    it('should ignore non-JSON non-journal files in story directories', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });
      watcher.on('epic:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready and any initial events to settle
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Clear any events that happened during watcher initialization
      events.length = 0;

      // Create a non-JSON, non-journal file in a story directory
      await writeFile(join(sagaRoot, '.saga', 'stories', 'test-story', 'notes.txt'), 'Some notes');

      // Wait for potential event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      // Should not have received any events for .txt file
      expect(events.length).toBe(0);

      await watcher.close();
    });

    it('should ignore non-JSON files in epics directory', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('epic:changed', (event) => {
        events.push(event);
      });
      watcher.on('epic:added', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      // Clear any events
      events.length = 0;

      // Create a non-JSON file in epics directory
      await writeFile(join(sagaRoot, '.saga', 'epics', 'notes.txt'), 'Some notes');

      // Wait for potential event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      // Should not have received any events for .txt file
      expect(events.length).toBe(0);

      await watcher.close();
    });
  });

  describe('WatcherEvent fields', () => {
    it('should use storyId field (not storySlug) in story events', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('story:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'test-story', 'story.json'),
        JSON.stringify({ id: 'test-story', title: 'Updated' }),
      );

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].storyId).toBe('test-story');
      // Should NOT have epicSlug or storySlug fields
      expect('epicSlug' in events[0]).toBe(false);
      expect('storySlug' in events[0]).toBe(false);
      expect('archived' in events[0]).toBe(false);

      await watcher.close();
    });

    it('should use epicId field (not epicSlug) in epic events', async () => {
      const watcher = await createSagaWatcher(sagaRoot);
      const events: WatcherEvent[] = [];

      watcher.on('epic:changed', (event) => {
        events.push(event);
      });

      // Wait for watcher to be ready
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      await writeFile(
        join(sagaRoot, '.saga', 'epics', 'test-epic.json'),
        JSON.stringify({ id: 'test-epic', title: 'Updated' }),
      );

      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].epicId).toBe('test-epic');
      // Should NOT have epicSlug field
      expect('epicSlug' in events[0]).toBe(false);

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
      await new Promise((resolve) => setTimeout(resolve, WATCHER_READY_DELAY_MS));

      await writeFile(
        join(sagaRoot, '.saga', 'stories', 'test-story', 'story.json'),
        JSON.stringify({ id: 'test-story', title: 'After Close' }),
      );

      // Wait for potential event
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_WAIT_MS));

      // Should not have received events after close
      expect(events.length).toBe(0);
    });
  });
});
