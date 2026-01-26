/**
 * File System Parsing Module
 *
 * Parses .saga/ directory structure including epic.md, story.md, and journal.md files.
 * Uses gray-matter for YAML frontmatter parsing.
 */

import { readFile, readdir, stat } from 'fs/promises';
import { join, dirname, relative } from 'path';
import matter from 'gray-matter';

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
 * Parse a story.md file
 *
 * @param storyPath - Full path to the story.md file
 * @param epicSlug - The slug of the parent epic
 * @returns StoryDetail or null if file doesn't exist
 */
export async function parseStory(storyPath: string, epicSlug: string): Promise<StoryDetail | null> {
  try {
    const content = await readFile(storyPath, 'utf-8');
    const storyDir = dirname(storyPath);
    const slug = storyDir.split('/').pop() || 'unknown';

    let frontmatter: Record<string, unknown> = {};

    try {
      const parsed = matter(content);
      frontmatter = parsed.data as Record<string, unknown>;
    } catch (e) {
      // Log warning but continue with defaults
      console.warn(`Warning: Failed to parse YAML frontmatter in ${storyPath}`);
    }

    // Extract values with defaults for missing/invalid data
    const title = typeof frontmatter.title === 'string' ? frontmatter.title : slug;
    const status = validateStatus(frontmatter.status);
    const tasks = parseTasks(frontmatter.tasks);

    // Check for journal.md
    const journalPath = join(storyDir, 'journal.md');
    const hasJournal = await fileExists(journalPath);

    return {
      slug: typeof frontmatter.id === 'string' ? frontmatter.id : slug,
      epicSlug,
      title,
      status,
      tasks,
      paths: {
        storyMd: storyPath,
        ...(hasJournal ? { journalMd: journalPath } : {}),
      },
    };
  } catch (e) {
    // File doesn't exist or can't be read
    return null;
  }
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
 * @param sagaRoot - Path to the project root containing .saga/ directory
 * @returns Array of Epic objects with nested stories
 */
export async function scanSagaDirectory(sagaRoot: string): Promise<Epic[]> {
  const sagaDir = join(sagaRoot, '.saga');
  const epicsDir = join(sagaDir, 'epics');
  const archiveDir = join(sagaDir, 'archive');

  const epics: Epic[] = [];

  // Check if epics directory exists
  if (!(await isDirectory(epicsDir))) {
    return epics;
  }

  // Get all epic directories
  const epicEntries = await readdir(epicsDir);

  for (const epicSlug of epicEntries) {
    const epicPath = join(epicsDir, epicSlug);

    // Skip non-directories
    if (!(await isDirectory(epicPath))) {
      continue;
    }

    // Parse epic.md
    const epicMdPath = join(epicPath, 'epic.md');
    const title = await parseEpic(epicMdPath);
    let content = '';

    try {
      content = await readFile(epicMdPath, 'utf-8');
    } catch {
      // No content if file doesn't exist
    }

    // Scan active stories
    const stories: StoryDetail[] = [];
    const storiesDir = join(epicPath, 'stories');

    if (await isDirectory(storiesDir)) {
      const storyEntries = await readdir(storiesDir);

      for (const storySlug of storyEntries) {
        const storyDir = join(storiesDir, storySlug);

        if (!(await isDirectory(storyDir))) {
          continue;
        }

        const storyMdPath = join(storyDir, 'story.md');
        const story = await parseStory(storyMdPath, epicSlug);

        if (story) {
          // Make paths relative to saga root
          story.paths.storyMd = relative(sagaRoot, story.paths.storyMd);
          if (story.paths.journalMd) {
            story.paths.journalMd = relative(sagaRoot, story.paths.journalMd);
          }
          stories.push(story);
        }
      }
    }

    // Scan archived stories for this epic
    const archiveEpicDir = join(archiveDir, epicSlug);

    if (await isDirectory(archiveEpicDir)) {
      const archivedStoryEntries = await readdir(archiveEpicDir);

      for (const storySlug of archivedStoryEntries) {
        const storyDir = join(archiveEpicDir, storySlug);

        if (!(await isDirectory(storyDir))) {
          continue;
        }

        const storyMdPath = join(storyDir, 'story.md');
        const story = await parseStory(storyMdPath, epicSlug);

        if (story) {
          story.archived = true;
          // Make paths relative to saga root
          story.paths.storyMd = relative(sagaRoot, story.paths.storyMd);
          if (story.paths.journalMd) {
            story.paths.journalMd = relative(sagaRoot, story.paths.journalMd);
          }
          stories.push(story);
        }
      }
    }

    // Calculate story counts
    const storyCounts: StoryCounts = {
      total: stories.length,
      ready: stories.filter((s) => s.status === 'ready').length,
      inProgress: stories.filter((s) => s.status === 'in_progress').length,
      blocked: stories.filter((s) => s.status === 'blocked').length,
      completed: stories.filter((s) => s.status === 'completed').length,
    };

    epics.push({
      slug: epicSlug,
      title: title || epicSlug, // Fallback to slug if no title
      content,
      storyCounts,
      stories,
      path: relative(sagaRoot, epicPath),
    });
  }

  return epics;
}
