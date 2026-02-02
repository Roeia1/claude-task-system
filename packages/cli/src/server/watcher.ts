/**
 * File Watcher Module
 *
 * Watches .saga/epics/ and .saga/archive/ directories for file changes
 * using chokidar. Emits events for epic and story changes.
 */

import { EventEmitter } from 'node:events';
import { join, relative, sep } from 'node:path';
import process from 'node:process';
import chokidar, { type FSWatcher } from 'chokidar';

// ============================================================================
// Constants
// ============================================================================

/** Minimum number of path parts required for a valid .saga path */
const MIN_PATH_PARTS = 4;

/** Number of path parts for an archive story file: .saga/archive/<epic>/<story>/<file> */
const ARCHIVE_STORY_PARTS = 5;

/** Number of path parts for an epic file: .saga/epics/<epic>/epic.md */
const EPIC_FILE_PARTS = 4;

/** Number of path parts for a story file: .saga/epics/<epic>/stories/<story>/<file> */
const STORY_FILE_PARTS = 6;

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
  epicSlug: string;
  storySlug?: string;
  archived?: boolean;
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
  epicSlug: string;
  storySlug?: string;
  archived: boolean;
  isEpicFile: boolean;
  isStoryFile: boolean;
  isMainStoryFile: boolean; // true for story.md, false for journal.md
}

/**
 * Check if a filename is a valid story-related markdown file
 */
function isStoryMarkdownFile(fileName: string): boolean {
  return fileName === 'story.md' || fileName === 'journal.md';
}

/**
 * Parse an archive path: .saga/archive/<epic-slug>/<story-slug>/<file>
 */
function parseArchivePath(parts: string[], epicSlug: string): ParsedFileInfo | null {
  if (parts.length >= ARCHIVE_STORY_PARTS) {
    const storySlug = parts[3];
    const fileName = parts[4];
    if (isStoryMarkdownFile(fileName)) {
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

/**
 * Parse an epics path: .saga/epics/<epic-slug>/...
 */
function parseEpicsPath(parts: string[], epicSlug: string): ParsedFileInfo | null {
  // Epic file: .saga/epics/<epic-slug>/epic.md
  if (parts.length === EPIC_FILE_PARTS && parts[3] === 'epic.md') {
    return {
      epicSlug,
      archived: false,
      isEpicFile: true,
      isStoryFile: false,
      isMainStoryFile: false,
    };
  }

  // Story file: .saga/epics/<epic-slug>/stories/<story-slug>/<file>
  if (parts.length >= STORY_FILE_PARTS && parts[3] === 'stories') {
    const storySlug = parts[4];
    const fileName = parts[5];
    if (isStoryMarkdownFile(fileName)) {
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
 * Parse a file path to extract epic and story information
 */
function parseFilePath(filePath: string, sagaRoot: string): ParsedFileInfo | null {
  const relativePath = relative(sagaRoot, filePath);
  const parts = relativePath.split(sep);

  if (parts[0] !== '.saga' || parts.length < MIN_PATH_PARTS) {
    return null;
  }

  const epicSlug = parts[2];
  const isArchive = parts[1] === 'archive';
  const isEpics = parts[1] === 'epics';

  if (isArchive) {
    return parseArchivePath(parts, epicSlug);
  }
  if (isEpics) {
    return parseEpicsPath(parts, epicSlug);
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
  // journal.md changes are always story:changed
  if (!isMainStoryFile) {
    return 'story:changed';
  }
  // story.md: add/unlink triggers story:added/removed
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
  const { epicSlug, storySlug, archived } = parsed;
  return storySlug ? `story:${epicSlug}:${storySlug}:${archived}` : `epic:${epicSlug}`;
}

// ============================================================================
// Watcher Factory
// ============================================================================

/**
 * Create a chokidar watcher for .saga directories
 */
function createChokidarWatcher(sagaRoot: string): FSWatcher {
  const epicsDir = join(sagaRoot, '.saga', 'epics');
  const archiveDir = join(sagaRoot, '.saga', 'archive');

  const usePolling = shouldUsePolling();

  return chokidar.watch([epicsDir, archiveDir], {
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
 * Create a SAGA file watcher
 */
async function createSagaWatcher(sagaRoot: string): Promise<SagaWatcher> {
  const emitter = new EventEmitter();
  const debouncer = createDebouncer<WatcherEvent>(DEBOUNCE_DELAY_MS);
  const watcher = createChokidarWatcher(sagaRoot);
  let closed = false;
  let ready = false;

  const handleFileEvent = (eventType: 'add' | 'change' | 'unlink', filePath: string) => {
    if (closed || !ready) {
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
      epicSlug: parsed.epicSlug,
      storySlug: parsed.storySlug,
      archived: parsed.archived,
      path: relative(sagaRoot, filePath),
    };

    debouncer.schedule(createDebounceKey(parsed), event, (e) => {
      if (!closed) {
        emitter.emit(e.type, e);
      }
    });
  };

  watcher.on('add', (path) => handleFileEvent('add', path));
  watcher.on('change', (path) => handleFileEvent('change', path));
  watcher.on('unlink', (path) => handleFileEvent('unlink', path));
  watcher.on('error', (error) => {
    if (!closed) {
      emitter.emit('error', error);
    }
  });

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

// ============================================================================
// Exports
// ============================================================================

export type { WatcherEventType, WatcherEvent, SagaWatcher };
export { createSagaWatcher };
