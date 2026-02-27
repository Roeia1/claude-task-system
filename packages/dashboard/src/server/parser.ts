/**
 * File System Parsing Module
 *
 * Parses .saga/ directory structure using JSON-based storage from @saga-ai/utils.
 * Stories and epics are read from .saga/stories/ and .saga/epics/ as JSON files.
 * Status is derived at read time from task/story statuses.
 * Journal parsing remains unchanged (journal.md is still markdown).
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import {
  createStoryPaths,
  createWorktreePaths,
  deriveEpicStatus,
  deriveStoryStatus,
  type Epic,
  listEpics,
  listTasks,
  readStory,
  type Task as SagaTask,
  type ScannedStory,
  scanStories,
  type TaskStatus,
} from '@saga-ai/utils';

// Regex pattern for journal section headers
const JOURNAL_SECTION_PATTERN = /^##\s+/m;

/**
 * Convert snake_case TaskStatus to camelCase for API response
 */
type ApiStatus = 'pending' | 'inProgress' | 'completed';

function toApiStatus(status: TaskStatus): ApiStatus {
  return status === 'in_progress' ? 'inProgress' : status;
}

/**
 * Convert a ScannedStory to a StoryDetail
 */
function toStoryDetail(story: ScannedStory): StoryDetail {
  const derivedStatus = deriveStoryStatus(story.tasks);

  const tasks: Task[] = story.tasks.map((t) => ({
    id: t.id,
    subject: t.subject,
    description: t.description,
    status: toApiStatus(t.status),
    blockedBy: t.blockedBy,
    guidance: t.guidance,
    doneWhen: t.doneWhen,
    activeForm: t.activeForm,
  }));

  return {
    id: story.id,
    title: story.title,
    description: story.description,
    epic: story.epic,
    status: toApiStatus(derivedStatus),
    tasks,
    guidance: story.guidance,
    doneWhen: story.doneWhen,
    avoid: story.avoid,
    branch: story.branch,
    pr: story.pr,
    worktree: story.worktree,
    journalPath: story.journalPath,
  };
}

/**
 * Build a ParsedEpic from scanned epic and its stories
 */
function buildEpic(scannedEpic: Epic, epicStories: StoryDetail[]): ParsedEpic {
  const storyCounts: StoryCounts = {
    total: epicStories.length,
    pending: epicStories.filter((s) => s.status === 'pending').length,
    inProgress: epicStories.filter((s) => s.status === 'inProgress').length,
    completed: epicStories.filter((s) => s.status === 'completed').length,
  };

  // Derive epic status from story statuses
  const storyStatuses: TaskStatus[] = epicStories.map((s) => {
    if (s.status === 'inProgress') {
      return 'in_progress';
    }
    return s.status as TaskStatus;
  });
  const derivedStatus = deriveEpicStatus(storyStatuses);

  return {
    id: scannedEpic.id,
    title: scannedEpic.title,
    description: scannedEpic.description,
    children: scannedEpic.children,
    status: toApiStatus(derivedStatus),
    storyCounts,
    stories: epicStories,
  };
}

// ============================================================================
// EXPORTED INTERFACES AND FUNCTIONS
// ============================================================================

/**
 * Story counts by status (new model: pending/inProgress/completed)
 */
export interface StoryCounts {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

/**
 * Task within a story (full detail from JSON storage)
 */
export interface Task {
  id: string;
  subject: string;
  description: string;
  status: ApiStatus;
  blockedBy: string[];
  guidance?: string;
  doneWhen?: string;
  activeForm?: string;
}

/**
 * Journal entry parsed from journal.md
 */
export interface JournalEntry {
  timestamp: string;
  type: 'session' | 'blocker' | 'resolution';
  title: string;
  content: string;
}

/**
 * Story detail with tasks and derived status
 */
export interface StoryDetail {
  id: string;
  title: string;
  description: string;
  epic?: string;
  epicName?: string;
  status: ApiStatus;
  tasks: Task[];
  journal?: JournalEntry[];
  guidance?: string;
  doneWhen?: string;
  avoid?: string;
  branch?: string;
  pr?: string;
  worktree?: string;
  journalPath?: string;
}

/**
 * Epic summary for list view
 */
export interface EpicSummary {
  id: string;
  title: string;
  description: string;
  status: ApiStatus;
  storyCounts: StoryCounts;
}

/**
 * Epic child reference with dependency info
 */
export interface EpicChild {
  id: string;
  blockedBy: string[];
}

/**
 * Epic detail including stories
 */
export interface ParsedEpic extends EpicSummary {
  children: EpicChild[];
  stories: StoryDetail[];
}

/**
 * Result of scanning the .saga directory
 */
export interface ScanResult {
  epics: ParsedEpic[];
  standaloneStories: StoryDetail[];
}

/**
 * Get all stories (both standalone and epic-owned) with epicName resolved.
 *
 * Scans all stories and epics, then resolves epicName from the parent epic's
 * title for stories that belong to an epic. Stories referencing a non-existent
 * epic are included with epicName undefined.
 *
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @returns Array of StoryDetail with epicName populated where applicable
 */
export function getAllStoriesWithEpicNames(sagaRoot: string): StoryDetail[] {
  const scannedStories = scanStories(sagaRoot);
  const allStoryDetails = scannedStories.map(toStoryDetail);

  // Build a map from epic ID to epic title
  let scannedEpics: Epic[] = [];
  try {
    scannedEpics = listEpics(sagaRoot);
  } catch {
    // No epics directory
  }

  const epicTitleMap = new Map<string, string>();
  for (const epic of scannedEpics) {
    epicTitleMap.set(epic.id, epic.title);
  }

  // Resolve epicName for each story
  return allStoryDetails.map((story) => {
    if (story.epic) {
      const epicName = epicTitleMap.get(story.epic);
      if (epicName) {
        return { ...story, epicName };
      }
    }
    return story;
  });
}

/**
 * Resolve the epic title for a given epic ID.
 *
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @param epicId - The epic ID to resolve the title for
 * @returns The epic title or undefined if not found
 */
export function resolveEpicName(sagaRoot: string, epicId: string): string | undefined {
  try {
    const epics = listEpics(sagaRoot);
    const epic = epics.find((e) => e.id === epicId);
    return epic?.title;
  } catch {
    return undefined;
  }
}

/**
 * Parse a single story by ID from the JSON storage
 *
 * Used by websocket for real-time updates when a specific story changes.
 *
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @param storyId - The story ID to parse
 * @returns StoryDetail or null if story doesn't exist
 */
export function parseStory(sagaRoot: string, storyId: string): StoryDetail | null {
  try {
    // Try worktree path first (has latest execution state), then fall back to master
    const wtPaths = createWorktreePaths(sagaRoot, storyId);
    const wtStoryDir = `${wtPaths.worktreeDir}/.saga/stories/${storyId}`;
    const wtStoryJson = `${wtStoryDir}/story.json`;
    const useWorktree = existsSync(wtStoryJson);

    const storyRoot = useWorktree ? wtPaths.worktreeDir : sagaRoot;
    const story = readStory(storyRoot, storyId);

    let tasks: SagaTask[] = [];
    try {
      tasks = listTasks(storyRoot, storyId);
    } catch {
      // No tasks
    }

    const { journalMd } = createStoryPaths(storyRoot, storyId);
    const hasJournal = existsSync(journalMd);

    const derivedStatus = deriveStoryStatus(tasks);

    return {
      id: story.id,
      title: story.title,
      description: story.description,
      epic: story.epic,
      status: toApiStatus(derivedStatus),
      tasks: tasks.map((t) => ({
        id: t.id,
        subject: t.subject,
        description: t.description,
        status: toApiStatus(t.status),
        blockedBy: t.blockedBy,
        guidance: t.guidance,
        doneWhen: t.doneWhen,
        activeForm: t.activeForm,
      })),
      guidance: story.guidance,
      doneWhen: story.doneWhen,
      avoid: story.avoid,
      branch: story.branch,
      pr: story.pr,
      worktree: story.worktree,
      journalPath: hasJournal ? journalMd : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a journal.md file into structured entries
 *
 * Entries are identified by ## headers:
 * - ## Session: <timestamp>
 * - ## Blocker: <title>
 * - ## Resolution: <title>
 *
 * @param journalPath - Full path to the journal.md file
 * @returns Array of JournalEntry objects
 */
export async function parseJournal(journalPath: string): Promise<JournalEntry[]> {
  try {
    const content = await readFile(journalPath, 'utf-8');
    const entries: JournalEntry[] = [];

    // Split by ## headers while preserving content
    const sections = content.split(JOURNAL_SECTION_PATTERN).slice(1); // Skip content before first ##

    for (const section of sections) {
      const lines = section.split('\n');
      const headerLine = lines[0] || '';
      const sectionContent = lines.slice(1).join('\n').trim();

      // Determine entry type from header
      if (headerLine.toLowerCase().startsWith('session:')) {
        const timestamp = headerLine.substring('session:'.length).trim();
        entries.push({
          timestamp,
          type: 'session',
          title: `Session ${timestamp}`,
          content: sectionContent,
        });
      } else if (headerLine.toLowerCase().startsWith('blocker:')) {
        const title = headerLine.substring('blocker:'.length).trim();
        entries.push({
          timestamp: '', // Blockers may not have timestamps
          type: 'blocker',
          title,
          content: sectionContent,
        });
      } else if (headerLine.toLowerCase().startsWith('resolution:')) {
        const title = headerLine.substring('resolution:'.length).trim();
        entries.push({
          timestamp: '', // Resolutions may not have timestamps
          type: 'resolution',
          title,
          content: sectionContent,
        });
      }
      // Other headers are ignored
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * Scan the .saga/ directory and return complete data structure
 *
 * Uses the shared saga-scanner for directory traversal and @saga-ai/types
 * for status derivation. Returns epics with nested stories plus standalone stories.
 *
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @returns ScanResult with epics and standalone stories
 */
export function scanSagaDirectory(sagaRoot: string): ScanResult {
  const scannedStories = scanStories(sagaRoot);

  let scannedEpics: Epic[] = [];
  try {
    scannedEpics = listEpics(sagaRoot);
  } catch {
    // No epics directory
  }

  // Convert all stories to StoryDetail
  const allStories = scannedStories.map(toStoryDetail);

  // Group stories by epic
  const storiesByEpic = new Map<string, StoryDetail[]>();
  const standaloneStories: StoryDetail[] = [];

  for (const story of allStories) {
    if (story.epic) {
      const existing = storiesByEpic.get(story.epic) || [];
      existing.push(story);
      storiesByEpic.set(story.epic, existing);
    } else {
      standaloneStories.push(story);
    }
  }

  // Build parsed epics
  const epics = scannedEpics.map((scannedEpic) => {
    const epicStories = storiesByEpic.get(scannedEpic.id) || [];
    return buildEpic(scannedEpic, epicStories);
  });

  return { epics, standaloneStories };
}
