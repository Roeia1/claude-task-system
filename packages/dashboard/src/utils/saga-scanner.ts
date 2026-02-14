/**
 * Shared SAGA Directory Scanner
 *
 * Scans .saga/stories/ and .saga/epics/ using @saga-ai/utils storage utilities.
 * Returns structured data for the dashboard parser and server.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  createStoryPaths,
  type Epic,
  listEpics,
  listStories,
  listTasks,
  type Task,
} from '@saga-ai/utils';

// ============================================================================
// Constants
// ============================================================================

/** Starting position to search for frontmatter end marker (after opening "---\n") */
const FRONTMATTER_START_OFFSET = 3;

/** Length of opening "---\n" marker */
const FRONTMATTER_OPEN_LENGTH = 4;

/** Length of closing "\n---" marker */
const FRONTMATTER_CLOSE_LENGTH = 4;

// ============================================================================
// Types
// ============================================================================

/**
 * Scanned story with tasks from JSON storage
 */
interface ScannedStory {
  /** Story identifier */
  id: string;
  /** Story title */
  title: string;
  /** Story description */
  description: string;
  /** Parent epic identifier (undefined for standalone stories) */
  epicId?: string;
  /** Story guidance text */
  guidance?: string;
  /** Done-when criteria */
  doneWhen?: string;
  /** Avoid guidance */
  avoid?: string;
  /** Git branch */
  branch?: string;
  /** Pull request URL */
  pr?: string;
  /** Worktree path from story.json */
  worktree?: string;
  /** Full path to journal.md (if exists) */
  journalPath?: string;
  /** Tasks belonging to this story */
  tasks: Task[];
}

/**
 * Scanned epic from JSON storage (re-exported from @saga-ai/types Epic)
 */
type ScannedEpic = Epic;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse YAML frontmatter from markdown content.
 * Kept for journal.md parsing (journal remains markdown format).
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  if (!content?.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf('\n---', FRONTMATTER_START_OFFSET);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterBlock = content.slice(FRONTMATTER_OPEN_LENGTH, endIndex);
  const body = content.slice(endIndex + FRONTMATTER_CLOSE_LENGTH).trim();

  const frontmatter: Record<string, unknown> = {};

  for (const line of frontmatterBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    let value: string | unknown[] = trimmed.slice(colonIndex + 1).trim();

    // Handle quoted values
    if (
      (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) ||
      (typeof value === 'string' && value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

// ============================================================================
// Story Scanning
// ============================================================================

/**
 * Scan .saga/stories/ using @saga-ai/types storage utilities.
 *
 * For each story, loads tasks and checks for journal.md.
 * Returns structured ScannedStory objects with tasks included.
 */
function scanStories(sagaRoot: string): ScannedStory[] {
  const storiesDir = join(sagaRoot, '.saga', 'stories');
  if (!existsSync(storiesDir)) {
    return [];
  }

  const stories = listStories(sagaRoot);

  return stories.map((story) => {
    // Load tasks for this story
    let tasks: Task[] = [];
    try {
      tasks = listTasks(sagaRoot, story.id);
    } catch {
      // No tasks or story dir issue — return empty
    }

    // Check for journal.md
    const { journalMd } = createStoryPaths(sagaRoot, story.id);
    const hasJournal = existsSync(journalMd);

    return {
      id: story.id,
      title: story.title,
      description: story.description,
      epicId: story.epic,
      guidance: story.guidance,
      doneWhen: story.doneWhen,
      avoid: story.avoid,
      branch: story.branch,
      pr: story.pr,
      worktree: story.worktree,
      journalPath: hasJournal ? journalMd : undefined,
      tasks,
    };
  });
}

// ============================================================================
// Epic Scanning
// ============================================================================

/**
 * Scan .saga/epics/ using @saga-ai/types storage utilities.
 *
 * Returns Epic objects directly from the shared storage layer.
 */
function scanEpics(sagaRoot: string): ScannedEpic[] {
  const epicsDir = join(sagaRoot, '.saga', 'epics');
  if (!existsSync(epicsDir)) {
    return [];
  }

  return listEpics(sagaRoot);
}

// ============================================================================
// Utility Checks
// ============================================================================

/**
 * Check if .saga directory exists
 */
function sagaDirectoryExists(projectPath: string): boolean {
  return existsSync(join(projectPath, '.saga'));
}

export { parseFrontmatter, scanStories, scanEpics, sagaDirectoryExists };
export type { ScannedStory, ScannedEpic };
