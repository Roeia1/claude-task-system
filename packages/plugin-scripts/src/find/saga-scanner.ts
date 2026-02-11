/**
 * Shared SAGA Directory Scanner
 *
 * Core directory traversal logic for scanning .saga/ structure.
 * Used by both the finder utility (CLI) and parser (server).
 *
 * Reads JSON-based story, task, and epic files from the flat .saga/ structure.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import type { TaskStatus } from '@saga-ai/types';
import {
  createEpicPaths,
  createSagaPaths,
  createStoryPaths,
  createWorktreePaths,
} from '@saga-ai/types';

/** Regex pattern for stripping .json extension from file names */
const JSON_EXT_PATTERN = /\.json$/;

// ============================================================================
// Types
// ============================================================================

/**
 * Basic story information from scanning
 */
interface ScannedStory {
  /** Story id (from story.json) */
  id: string;
  /** Story title from story.json */
  title: string;
  /** Story description from story.json */
  description: string;
  /** Derived status from task files */
  status: TaskStatus;
  /** Parent epic id (from story.json "epic" field, or '' if not set) */
  epicId: string;
  /** Full path to story.json */
  storyPath: string;
  /** Full path to worktree directory (if exists) */
  worktreePath?: string;
  /** Full path to journal.md (if exists) */
  journalPath?: string;
  /** Whether this is an archived story */
  archived?: boolean;
}

/**
 * Basic epic information from scanning
 */
interface ScannedEpic {
  /** Epic id */
  id: string;
  /** Epic title */
  title: string;
  /** Full path to the epic JSON file */
  epicPath: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a path is a directory
 */
async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Status Derivation
// ============================================================================

/**
 * Derive overall story status from task statuses.
 *
 * Rules:
 * - No tasks -> 'pending'
 * - All tasks completed -> 'completed'
 * - Any task in_progress -> 'in_progress'
 * - Otherwise -> 'pending'
 */
function deriveStoryStatus(tasks: Array<{ status: string }>): TaskStatus {
  if (tasks.length === 0) {
    return 'pending';
  }
  if (tasks.every((t) => t.status === 'completed')) {
    return 'completed';
  }
  if (tasks.some((t) => t.status === 'in_progress')) {
    return 'in_progress';
  }
  return 'pending';
}

// ============================================================================
// Story Scanning
// ============================================================================

/**
 * Read task files from a story directory.
 *
 * Task files are *.json files in the story directory, excluding story.json.
 */
async function readTaskFiles(storyDir: string): Promise<Array<{ status: string }>> {
  try {
    const entries = await readdir(storyDir);
    const taskFiles = entries.filter((entry) => entry.endsWith('.json') && entry !== 'story.json');

    const tasks = await Promise.all(
      taskFiles.map(async (file) => {
        try {
          const content = await readFile(`${storyDir}/${file}`, 'utf-8');
          const parsed = JSON.parse(content);
          return { status: parsed.status || 'pending' };
        } catch {
          return { status: 'pending' };
        }
      }),
    );

    return tasks;
  } catch {
    return [];
  }
}

/**
 * Scan stories directory for stories.
 *
 * Structure: .saga/stories/{story-id}/story.json
 */
async function scanStories(sagaRoot: string): Promise<ScannedStory[]> {
  const sagaPaths = createSagaPaths(sagaRoot);

  if (!(await isDirectory(sagaPaths.stories))) {
    return [];
  }

  const storyEntries = await readdir(sagaPaths.stories);

  const storyPromises = storyEntries.map(async (storyId) => {
    const storyPaths = createStoryPaths(sagaRoot, storyId);

    if (!(await isDirectory(storyPaths.storyDir))) {
      return null;
    }

    try {
      const content = await readFile(storyPaths.storyJson, 'utf-8');
      const storyData = JSON.parse(content);

      // Read task files to derive status
      const tasks = await readTaskFiles(storyPaths.storyDir);
      const status = deriveStoryStatus(tasks);

      // Check for worktree
      const worktreePaths = createWorktreePaths(sagaRoot, storyId);
      const hasWorktree = await isDirectory(worktreePaths.worktreeDir);

      // Check for journal
      const hasJournal = await fileExists(storyPaths.journalMd);

      const scanned: ScannedStory = {
        id: storyData.id || storyId,
        title: storyData.title || storyId,
        description: storyData.description || '',
        status,
        epicId: storyData.epic || '',
        storyPath: storyPaths.storyJson,
      };

      if (hasWorktree) {
        scanned.worktreePath = worktreePaths.worktreeDir;
      }
      if (hasJournal) {
        scanned.journalPath = storyPaths.journalMd;
      }

      return scanned;
    } catch {
      return null;
    }
  });

  const stories = await Promise.all(storyPromises);
  return stories.filter((story): story is ScannedStory => story !== null);
}

// ============================================================================
// Epic Scanning
// ============================================================================

/**
 * Scan epics directory for epic metadata.
 *
 * Structure: .saga/epics/{epic-id}.json
 */
async function scanEpics(sagaRoot: string): Promise<ScannedEpic[]> {
  const sagaPaths = createSagaPaths(sagaRoot);

  if (!(await isDirectory(sagaPaths.epics))) {
    return [];
  }

  const entries = await readdir(sagaPaths.epics);
  const jsonFiles = entries.filter((entry) => entry.endsWith('.json'));

  const epicPromises = jsonFiles.map(async (file) => {
    const epicId = file.replace(JSON_EXT_PATTERN, '');
    const epicPaths = createEpicPaths(sagaRoot, epicId);

    try {
      const content = await readFile(epicPaths.epicJson, 'utf-8');
      const epicData = JSON.parse(content);

      return {
        id: epicData.id || epicId,
        title: epicData.title || epicId,
        epicPath: epicPaths.epicJson,
      };
    } catch {
      return null;
    }
  });

  const epics = await Promise.all(epicPromises);
  return epics.filter((epic): epic is ScannedEpic => epic !== null);
}

// ============================================================================
// Directory Existence Checks
// ============================================================================

/**
 * Check if .saga directory exists
 */
function sagaDirectoryExists(projectPath: string): boolean {
  const sagaPaths = createSagaPaths(projectPath);
  return existsSync(sagaPaths.saga);
}

/**
 * Check if stories directory exists
 */
function storiesDirectoryExists(projectPath: string): boolean {
  const sagaPaths = createSagaPaths(projectPath);
  return existsSync(sagaPaths.stories);
}

/**
 * Check if worktrees directory exists
 */
function worktreesDirectoryExists(projectPath: string): boolean {
  const sagaPaths = createSagaPaths(projectPath);
  return existsSync(sagaPaths.worktrees);
}

/**
 * Check if epics directory exists
 */
function epicsDirectoryExists(projectPath: string): boolean {
  const sagaPaths = createSagaPaths(projectPath);
  return existsSync(sagaPaths.epics);
}

export {
  deriveStoryStatus,
  scanStories,
  scanEpics,
  sagaDirectoryExists,
  storiesDirectoryExists,
  worktreesDirectoryExists,
  epicsDirectoryExists,
};
export type { ScannedStory, ScannedEpic };
