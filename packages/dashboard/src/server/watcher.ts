/**
 * File Watcher Module
 *
 * Watches .saga/stories/ and .saga/epics/ directories for file changes
 * using chokidar. Emits events for epic and story changes.
 *
 * Path structure:
 *   .saga/stories/<story-id>/story.json     → story:added/changed/removed
 *   .saga/stories/<story-id>/<task-id>.json  → story:changed
 *   .saga/stories/<story-id>/journal.md      → story:changed
 *   .saga/epics/<epic-id>.json               → epic:added/changed/removed
 */

import { EventEmitter } from 'node:events';
import { basename, extname, join, relative, sep } from 'node:path';
import process from 'node:process';
import chokidar, { type FSWatcher } from 'chokidar';

// ============================================================================
// Constants
// ============================================================================

/** Number of path parts for an epic file: .saga/epics/<epic-id>.json */
const EPIC_PATH_PARTS = 3;

/** Number of path parts for a story file: .saga/stories/<story-id>/<file> */
const STORY_PATH_PARTS = 4;

/** Minimum number of path parts for a valid .saga path */
const MIN_PATH_PARTS = 3;

/** Debounce delay in milliseconds for file events */
const DEBOUNCE_DELAY_MS = 100;

/**
 * Check if polling should be used instead of native file watching.
 * Polling is slower but more reliable for tests.
 * Set SAGA_USE_POLLING=1 to enable polling mode.
 */
function shouldUsePolling(): boolean {
  return process.env.SAGA_USE_POLLING === '1';
}

// ============================================================================
// Types (internal - not exported)
// ============================================================================

/**
 * Event types emitted by the watcher
 */
type WatcherEventType =
  | 'epic:added'
  | 'epic:changed'
  | 'epic:removed'
  | 'story:added'
  | 'story:changed'
  | 'story:removed';

/**
 * Event data for watcher events
 */
interface WatcherEvent {
  type: WatcherEventType;
  epicId?: string;
  storyId?: string;
  path: string;
}

/**
 * SAGA file watcher interface
 */
interface SagaWatcher {
  /**
   * Subscribe to watcher events
   */
  on(
    event:
      | 'story:removed'
      | 'story:changed'
      | 'story:added'
      | 'epic:removed'
      | 'epic:changed'
      | 'epic:added',
    listener: (event: WatcherEvent) => void,
  ): this;
  on(event: 'error', listener: (error: Error) => void): this;

  /**
   * Close the watcher and stop watching files
   */
  close(): Promise<void>;
}

// ============================================================================
// File Path Parsing
// ============================================================================

/**
 * Parsed file information from a .saga path
 */
interface ParsedFileInfo {
  epicId?: string;
  storyId?: string;
  isEpicFile: boolean;
  isStoryFile: boolean;
  isMainStoryFile: boolean;
}

/**
 * Parse an epics path: .saga/epics/<epic-id>.json
 */
function parseEpicsPath(parts: string[]): ParsedFileInfo | null {
  // Epic file: .saga/epics/<epic-id>.json
  if (parts.length === EPIC_PATH_PARTS) {
    const fileName = parts[2];
    if (extname(fileName) === '.json') {
      const epicId = basename(fileName, '.json');
      return {
        epicId,
        isEpicFile: true,
        isStoryFile: false,
        isMainStoryFile: false,
      };
    }
  }
  return null;
}

/**
 * Parse a stories path: .saga/stories/<story-id>/<file>
 */
function parseStoriesPath(parts: string[]): ParsedFileInfo | null {
  // Story files: .saga/stories/<story-id>/<file>
  if (parts.length === STORY_PATH_PARTS) {
    const storyId = parts[2];
    const fileName = parts[3];

    // story.json is the main story file
    if (fileName === 'story.json') {
      return {
        storyId,
        isEpicFile: false,
        isStoryFile: true,
        isMainStoryFile: true,
      };
    }

    // journal.md is a story-related file
    if (fileName === 'journal.md') {
      return {
        storyId,
        isEpicFile: false,
        isStoryFile: true,
        isMainStoryFile: false,
      };
    }

    // <task-id>.json files are task files (trigger story:changed)
    if (extname(fileName) === '.json') {
      return {
        storyId,
        isEpicFile: false,
        isStoryFile: true,
        isMainStoryFile: false,
      };
    }
  }
  return null;
}

/**
 * Parse a file path to extract epic and story information
 */
function parseFilePath(filePath: string, sagaRoot: string): ParsedFileInfo | null {
  const relativePath = relative(sagaRoot, filePath);
  const parts = relativePath.split(sep);

  if (parts[0] !== '.saga' || parts.length < MIN_PATH_PARTS) {
    return null;
  }

  const section = parts[1];

  if (section === 'epics') {
    return parseEpicsPath(parts);
  }
  if (section === 'stories') {
    return parseStoriesPath(parts);
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

// ============================================================================
// Event Type Determination
// ============================================================================

/**
 * Determine the watcher event type for an epic file change
 */
function getEpicEventType(eventType: 'add' | 'change' | 'unlink'): WatcherEventType {
  if (eventType === 'add') {
    return 'epic:added';
  }
  if (eventType === 'unlink') {
    return 'epic:removed';
  }
  return 'epic:changed';
}

/**
 * Determine the watcher event type for a story file change
 */
function getStoryEventType(
  eventType: 'add' | 'change' | 'unlink',
  isMainStoryFile: boolean,
): WatcherEventType {
  // Non-main files (journal.md, task files) are always story:changed
  if (!isMainStoryFile) {
    return 'story:changed';
  }
  // story.json: add/unlink triggers story:added/removed
  if (eventType === 'add') {
    return 'story:added';
  }
  if (eventType === 'unlink') {
    return 'story:removed';
  }
  return 'story:changed';
}

/**
 * Determine the watcher event type based on parsed file info
 */
function determineEventType(
  eventType: 'add' | 'change' | 'unlink',
  parsed: ParsedFileInfo,
): WatcherEventType | null {
  if (parsed.isEpicFile) {
    return getEpicEventType(eventType);
  }
  if (parsed.isStoryFile) {
    return getStoryEventType(eventType, parsed.isMainStoryFile);
  }
  return null;
}

/**
 * Create a debounce key for the parsed file info
 */
function createDebounceKey(parsed: ParsedFileInfo): string {
  if (parsed.storyId) {
    return `story:${parsed.storyId}`;
  }
  return `epic:${parsed.epicId}`;
}

// ============================================================================
// Watcher Factory
// ============================================================================

/**
 * Create a chokidar watcher for .saga directories
 */
function createChokidarWatcher(sagaRoot: string): FSWatcher {
  const storiesDir = join(sagaRoot, '.saga', 'stories');
  const epicsDir = join(sagaRoot, '.saga', 'epics');

  const usePolling = shouldUsePolling();

  return chokidar.watch([storiesDir, epicsDir], {
    persistent: true,
    ignoreInitial: true,
    // Use polling for tests (reliable) or native watching for production (fast)
    usePolling,
    interval: usePolling ? DEBOUNCE_DELAY_MS : undefined,
    // Wait for writes to finish when polling
    awaitWriteFinish: usePolling
      ? {
          stabilityThreshold: 50,
          pollInterval: 50,
        }
      : false,
  });
}

/**
 * Create a file event handler that parses, debounces, and emits watcher events
 */
function createFileEventHandler(
  sagaRoot: string,
  debouncer: ReturnType<typeof createDebouncer<WatcherEvent>>,
  emitter: EventEmitter,
  state: { closed: boolean; ready: boolean },
) {
  return (eventType: 'add' | 'change' | 'unlink', filePath: string) => {
    if (state.closed || !state.ready) {
      return;
    }
    const parsed = parseFilePath(filePath, sagaRoot);
    if (!parsed) {
      return;
    }

    const watcherEventType = determineEventType(eventType, parsed);
    if (!watcherEventType) {
      return;
    }

    const event: WatcherEvent = {
      type: watcherEventType,
      epicId: parsed.epicId,
      storyId: parsed.storyId,
      path: relative(sagaRoot, filePath),
    };

    debouncer.schedule(createDebounceKey(parsed), event, (e) => {
      if (!state.closed) {
        emitter.emit(e.type, e);
      }
    });
  };
}

/**
 * Create a SAGA file watcher
 */
async function createSagaWatcher(sagaRoot: string): Promise<SagaWatcher> {
  const emitter = new EventEmitter();
  const debouncer = createDebouncer<WatcherEvent>(DEBOUNCE_DELAY_MS);
  const watcher = createChokidarWatcher(sagaRoot);
  const state = { closed: false, ready: false };

  const handleFileEvent = createFileEventHandler(sagaRoot, debouncer, emitter, state);

  watcher.on('add', (path) => handleFileEvent('add', path));
  watcher.on('change', (path) => handleFileEvent('change', path));
  watcher.on('unlink', (path) => handleFileEvent('unlink', path));
  watcher.on('error', (error) => {
    if (!state.closed) {
      emitter.emit('error', error);
    }
  });

  await new Promise<void>((resolve) => {
    watcher.on('ready', () => {
      state.ready = true;
      resolve();
    });
  });

  return {
    on(event: string, listener: (...args: unknown[]) => void): SagaWatcher {
      emitter.on(event, listener);
      return this;
    },
    async close(): Promise<void> {
      state.closed = true;
      debouncer.clear();
      await watcher.close();
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export type { WatcherEventType, WatcherEvent, SagaWatcher };
export { createSagaWatcher };
