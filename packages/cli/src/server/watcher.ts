/**
 * File Watcher Module
 *
 * Watches .saga/epics/ and .saga/archive/ directories for file changes
 * using chokidar. Emits events for epic and story changes.
 */

import { EventEmitter } from 'node:events';
import { join, relative, sep } from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';

/**
 * Event types emitted by the watcher
 */
export type WatcherEventType =
  | 'epic:added'
  | 'epic:changed'
  | 'epic:removed'
  | 'story:added'
  | 'story:changed'
  | 'story:removed';

/**
 * Event data for watcher events
 */
export interface WatcherEvent {
  type: WatcherEventType;
  epicSlug: string;
  storySlug?: string;
  archived?: boolean;
  path: string;
}

/**
 * SAGA file watcher interface
 */
export interface SagaWatcher {
  /**
   * Subscribe to watcher events
   */
  on(event: 'epic:added', listener: (event: WatcherEvent) => void): this;
  on(event: 'epic:changed', listener: (event: WatcherEvent) => void): this;
  on(event: 'epic:removed', listener: (event: WatcherEvent) => void): this;
  on(event: 'story:added', listener: (event: WatcherEvent) => void): this;
  on(event: 'story:changed', listener: (event: WatcherEvent) => void): this;
  on(event: 'story:removed', listener: (event: WatcherEvent) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;

  /**
   * Close the watcher and stop watching files
   */
  close(): Promise<void>;
}

/**
 * Parse a file path to extract epic and story information
 */
function parseFilePath(
  filePath: string,
  sagaRoot: string,
): {
  epicSlug: string;
  storySlug?: string;
  archived: boolean;
  isEpicFile: boolean;
  isStoryFile: boolean;
  isMainStoryFile: boolean; // true for story.md, false for journal.md
} | null {
  // Get relative path from saga root
  const relativePath = relative(sagaRoot, filePath);
  const parts = relativePath.split(sep);

  // Expected patterns:
  // .saga/epics/<epic-slug>/epic.md
  // .saga/epics/<epic-slug>/stories/<story-slug>/story.md
  // .saga/epics/<epic-slug>/stories/<story-slug>/journal.md
  // .saga/archive/<epic-slug>/<story-slug>/story.md
  // .saga/archive/<epic-slug>/<story-slug>/journal.md

  if (parts[0] !== '.saga' || parts.length < 4) {
    return null;
  }

  const isArchive = parts[1] === 'archive';
  const isEpics = parts[1] === 'epics';

  if (!isArchive && !isEpics) {
    return null;
  }

  const epicSlug = parts[2];

  if (isArchive) {
    // Archive: .saga/archive/<epic-slug>/<story-slug>/...
    if (parts.length >= 5) {
      const storySlug = parts[3];
      const fileName = parts[4];
      if (fileName === 'story.md' || fileName === 'journal.md') {
        return {
          epicSlug,
          storySlug,
          archived: true,
          isEpicFile: false,
          isStoryFile: true,
          isMainStoryFile: fileName === 'story.md',
        };
      }
    }
    return null;
  }

  // Epics: .saga/epics/<epic-slug>/...
  if (parts.length === 4 && parts[3] === 'epic.md') {
    // Epic file: .saga/epics/<epic-slug>/epic.md
    return {
      epicSlug,
      archived: false,
      isEpicFile: true,
      isStoryFile: false,
      isMainStoryFile: false,
    };
  }

  if (parts.length >= 6 && parts[3] === 'stories') {
    // Story file: .saga/epics/<epic-slug>/stories/<story-slug>/...
    const storySlug = parts[4];
    const fileName = parts[5];
    if (fileName === 'story.md' || fileName === 'journal.md') {
      return {
        epicSlug,
        storySlug,
        archived: false,
        isEpicFile: false,
        isStoryFile: true,
        isMainStoryFile: fileName === 'story.md',
      };
    }
  }

  return null;
}

/**
 * Create a debounced function that groups rapid calls
 */
function createDebouncer<T>(delayMs: number) {
  const pending = new Map<string, { timer: NodeJS.Timeout; data: T }>();

  return {
    schedule(key: string, data: T, callback: (data: T) => void): void {
      // Clear existing timer for this key
      const existing = pending.get(key);
      if (existing) {
        clearTimeout(existing.timer);
      }

      // Schedule new callback
      const timer = setTimeout(() => {
        pending.delete(key);
        callback(data);
      }, delayMs);

      pending.set(key, { timer, data });
    },

    clear(): void {
      for (const { timer } of pending.values()) {
        clearTimeout(timer);
      }
      pending.clear();
    },
  };
}

/**
 * Create a SAGA file watcher
 *
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @returns SagaWatcher instance
 */
export async function createSagaWatcher(sagaRoot: string): Promise<SagaWatcher> {
  const emitter = new EventEmitter();
  const debouncer = createDebouncer<WatcherEvent>(100); // 100ms debounce

  // Watch only .saga/epics and .saga/archive directories (not worktrees which can be huge)
  const epicsDir = join(sagaRoot, '.saga', 'epics');
  const archiveDir = join(sagaRoot, '.saga', 'archive');

  // Create watcher for epics and archive directories
  const watcher: FSWatcher = chokidar.watch([epicsDir, archiveDir], {
    persistent: true,
    ignoreInitial: true, // Don't emit events for existing files
    // Use polling for reliable cross-platform behavior in tests
    // This is fine since we only watch epics/archive (~20 files), not entire .saga/ (79K+ files)
    usePolling: true,
    interval: 100,
  });

  // Track if watcher is closed
  let closed = false;
  let ready = false;

  // Handle file events
  const handleFileEvent = (eventType: 'add' | 'change' | 'unlink', filePath: string) => {
    if (closed || !ready) return;

    const parsed = parseFilePath(filePath, sagaRoot);
    if (!parsed) return;

    const { epicSlug, storySlug, archived, isEpicFile, isStoryFile, isMainStoryFile } = parsed;

    // Create a unique key for debouncing
    const key = storySlug ? `story:${epicSlug}:${storySlug}:${archived}` : `epic:${epicSlug}`;

    // Determine event type
    let watcherEventType: WatcherEventType;
    if (isEpicFile) {
      watcherEventType =
        eventType === 'add'
          ? 'epic:added'
          : eventType === 'unlink'
            ? 'epic:removed'
            : 'epic:changed';
    } else if (isStoryFile) {
      // For story.md: add/unlink triggers story:added/removed
      // For journal.md: any change triggers story:changed (it's a change to the story, not a new story)
      if (isMainStoryFile) {
        watcherEventType =
          eventType === 'add'
            ? 'story:added'
            : eventType === 'unlink'
              ? 'story:removed'
              : 'story:changed';
      } else {
        // journal.md changes are always story:changed
        watcherEventType = 'story:changed';
      }
    } else {
      return;
    }

    const event: WatcherEvent = {
      type: watcherEventType,
      epicSlug,
      storySlug,
      archived,
      path: relative(sagaRoot, filePath),
    };

    // Debounce the event
    debouncer.schedule(key, event, (debouncedEvent) => {
      if (!closed) {
        emitter.emit(debouncedEvent.type, debouncedEvent);
      }
    });
  };

  // Register event handlers
  watcher.on('add', (path) => handleFileEvent('add', path));
  watcher.on('change', (path) => handleFileEvent('change', path));
  watcher.on('unlink', (path) => handleFileEvent('unlink', path));

  watcher.on('error', (error) => {
    if (!closed) {
      emitter.emit('error', error);
    }
  });

  // Wait for watcher to be ready
  await new Promise<void>((resolve) => {
    watcher.on('ready', () => {
      ready = true;
      resolve();
    });
  });

  return {
    on(event: string, listener: (...args: unknown[]) => void): SagaWatcher {
      emitter.on(event, listener);
      return this;
    },

    async close(): Promise<void> {
      closed = true;
      debouncer.clear();
      await watcher.close();
    },
  };
}
