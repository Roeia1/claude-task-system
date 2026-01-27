/**
 * File System Parsing Module
 *
 * Parses .saga/ directory structure including epic.md, story.md, and journal.md files.
 * Uses the shared saga-scanner for directory traversal and adds rich parsing
 * for tasks and journal entries.
 */

import { readFile } from 'fs/promises';
import { relative } from 'path';
import matter from 'gray-matter';
import {
  scanAllStories,
  scanEpics,
  type ScannedStory,
  type ScannedEpic,
} from '../utils/saga-scanner.js';

/**
 * Story counts by status
 */
export interface StoryCounts {
  total: number;
  ready: number;
  inProgress: number;
  blocked: number;
  completed: number;
}

/**
 * Task within a story
 */
export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
}

/**
 * Journal entry parsed from journal.md
 */
export interface JournalEntry {
  timestamp: string;
  type: 'session' | 'blocker' | 'resolution';
  content: string;
}

/**
 * Story detail including tasks and journal
 */
export interface StoryDetail {
  slug: string;
  epicSlug: string;
  title: string;
  status: 'ready' | 'in_progress' | 'blocked' | 'completed';
  tasks: Task[];
  journal?: JournalEntry[];
  archived?: boolean;
  paths: {
    storyMd: string;
    journalMd?: string;
    worktree?: string;
  };
}

/**
 * Epic summary for list view
 */
export interface EpicSummary {
  slug: string;
  title: string;
  storyCounts: StoryCounts;
  path: string;
}

/**
 * Epic detail including stories
 */
export interface Epic extends EpicSummary {
  content: string;
  stories: StoryDetail[];
}

/**
 * Convert ScannedStory to StoryDetail with rich parsing
 */
async function toStoryDetail(story: ScannedStory, sagaRoot: string): Promise<StoryDetail> {
  // Parse tasks from frontmatter using gray-matter for complex YAML
  let tasks: Task[] = [];
  try {
    const content = await readFile(story.storyPath, 'utf-8');
    const parsed = matter(content);
    tasks = parseTasks(parsed.data.tasks);
  } catch {
    // Use simple frontmatter if gray-matter fails
    tasks = parseTasks(story.frontmatter.tasks);
  }

  return {
    slug: story.slug,
    epicSlug: story.epicSlug,
    title: story.title,
    status: validateStatus(story.status),
    tasks,
    archived: story.archived,
    paths: {
      storyMd: relative(sagaRoot, story.storyPath),
      ...(story.journalPath ? { journalMd: relative(sagaRoot, story.journalPath) } : {}),
      ...(story.worktreePath ? { worktree: relative(sagaRoot, story.worktreePath) } : {}),
    },
  };
}

/**
 * Validate and normalize story status
 */
function validateStatus(status: unknown): 'ready' | 'in_progress' | 'blocked' | 'completed' {
  const validStatuses = ['ready', 'in_progress', 'blocked', 'completed'];
  if (typeof status === 'string' && validStatuses.includes(status)) {
    return status as 'ready' | 'in_progress' | 'blocked' | 'completed';
  }
  return 'ready'; // default
}

/**
 * Parse tasks array from frontmatter
 */
function parseTasks(tasks: unknown): Task[] {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      id: typeof t.id === 'string' ? t.id : 'unknown',
      title: typeof t.title === 'string' ? t.title : 'Unknown Task',
      status: validateTaskStatus(t.status),
    }));
}

/**
 * Validate and normalize task status
 */
function validateTaskStatus(status: unknown): 'pending' | 'in_progress' | 'completed' {
  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (typeof status === 'string' && validStatuses.includes(status)) {
    return status as 'pending' | 'in_progress' | 'completed';
  }
  return 'pending'; // default
}

/**
 * Parse a story.md file into StoryDetail
 *
 * Used by websocket for real-time updates when a specific story file changes.
 *
 * @param storyPath - Full path to the story.md file
 * @param epicSlug - The slug of the parent epic
 * @returns StoryDetail or null if file doesn't exist
 */
export async function parseStory(storyPath: string, epicSlug: string): Promise<StoryDetail | null> {
  const { join } = await import('path');
  const { stat } = await import('fs/promises');

  let content: string;
  try {
    content = await readFile(storyPath, 'utf-8');
  } catch {
    // File doesn't exist
    return null;
  }

  const storyDir = storyPath.replace(/\/story\.md$/, '');
  const dirName = storyDir.split('/').pop() || 'unknown';

  // Try to parse frontmatter, use defaults if invalid
  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = matter(content);
    frontmatter = parsed.data as Record<string, unknown>;
  } catch {
    // Invalid YAML, continue with empty frontmatter
  }

  // Extract values with defaults
  const slug = (frontmatter.id as string) || (frontmatter.slug as string) || dirName;
  const title = (frontmatter.title as string) || dirName;
  const status = validateStatus(frontmatter.status);
  const tasks = parseTasks(frontmatter.tasks);

  // Check for journal.md
  const journalPath = join(storyDir, 'journal.md');
  let hasJournal = false;
  try {
    await stat(journalPath);
    hasJournal = true;
  } catch {
    // No journal
  }

  return {
    slug,
    epicSlug,
    title,
    status,
    tasks,
    paths: {
      storyMd: storyPath,
      ...(hasJournal ? { journalMd: journalPath } : {}),
    },
  };
}

/**
 * Parse an epic.md file to extract the title
 *
 * @param epicPath - Full path to the epic.md file
 * @returns Title string or null if file doesn't exist or no heading found
 */
export async function parseEpic(epicPath: string): Promise<string | null> {
  try {
    const content = await readFile(epicPath, 'utf-8');

    // Extract title from first # heading
    const match = content.match(/^#\s+(.+)$/m);
    if (match) {
      return match[1].trim();
    }

    return null;
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
    const sections = content.split(/^##\s+/m).slice(1); // Skip content before first ##

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
          content: sectionContent,
        });
      } else if (headerLine.toLowerCase().startsWith('blocker:')) {
        const title = headerLine.substring('blocker:'.length).trim();
        entries.push({
          timestamp: '', // Blockers may not have timestamps
          type: 'blocker',
          content: `${title}\n\n${sectionContent}`.trim(),
        });
      } else if (headerLine.toLowerCase().startsWith('resolution:')) {
        const title = headerLine.substring('resolution:'.length).trim();
        entries.push({
          timestamp: '', // Resolutions may not have timestamps
          type: 'resolution',
          content: `${title}\n\n${sectionContent}`.trim(),
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
 * Uses the shared saga-scanner for directory traversal and adds rich parsing
 * for tasks and journal entries.
 *
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @returns Array of Epic objects with nested stories
 */
export async function scanSagaDirectory(sagaRoot: string): Promise<Epic[]> {
  // Use shared scanner to get all epics and stories
  const [scannedEpics, scannedStories] = await Promise.all([
    scanEpics(sagaRoot),
    scanAllStories(sagaRoot),
  ]);

  // Group stories by epic
  const storiesByEpic = new Map<string, ScannedStory[]>();
  for (const story of scannedStories) {
    const existing = storiesByEpic.get(story.epicSlug) || [];
    existing.push(story);
    storiesByEpic.set(story.epicSlug, existing);
  }

  // Build Epic objects with rich story details
  const epics: Epic[] = [];

  for (const scannedEpic of scannedEpics) {
    const epicStories = storiesByEpic.get(scannedEpic.slug) || [];

    // Convert scanned stories to StoryDetail with tasks
    const stories = await Promise.all(
      epicStories.map((s) => toStoryDetail(s, sagaRoot))
    );

    // Calculate story counts
    const storyCounts: StoryCounts = {
      total: stories.length,
      ready: stories.filter((s) => s.status === 'ready').length,
      inProgress: stories.filter((s) => s.status === 'in_progress').length,
      blocked: stories.filter((s) => s.status === 'blocked').length,
      completed: stories.filter((s) => s.status === 'completed').length,
    };

    epics.push({
      slug: scannedEpic.slug,
      title: scannedEpic.title,
      content: scannedEpic.content,
      storyCounts,
      stories,
      path: relative(sagaRoot, scannedEpic.epicPath),
    });
  }

  return epics;
}
