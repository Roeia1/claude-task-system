/**
 * SAGA Directory Structure Types
 *
 * Utility types for constructing paths within the .saga/ directory structure.
 * These types represent the canonical paths used across the SAGA system:
 *
 * .saga/
 * ├── epics/
 * │   └── {epic-slug}/
 * │       ├── epic.md
 * │       └── stories/
 * │           └── {story-slug}/
 * │               ├── story.md
 * │               └── journal.md
 * │
 * ├── worktrees/
 * │   └── {epic-slug}/
 * │       └── {story-slug}/          # Git worktree directory
 * │           └── .saga/...          # Nested saga structure
 * │
 * └── archive/
 *     └── {epic-slug}/
 *         └── {story-slug}/
 *             └── story.md
 */

/**
 * Root-level SAGA directory paths
 */
interface SagaPaths {
  /** Project root directory (parent of .saga/) */
  root: string;
  /** .saga directory path */
  saga: string;
  /** .saga/epics directory path */
  epics: string;
  /** .saga/worktrees directory path */
  worktrees: string;
  /** .saga/archive directory path */
  archive: string;
}

/**
 * Epic directory paths
 */
interface EpicPaths {
  /** Epic slug identifier */
  epicSlug: string;
  /** Epic directory: .saga/epics/{epic-slug}/ */
  epicDir: string;
  /** Epic definition file: .saga/epics/{epic-slug}/epic.md */
  epicMd: string;
  /** Stories directory: .saga/epics/{epic-slug}/stories/ */
  storiesDir: string;
}

/**
 * Story directory paths (within epics)
 */
interface StoryPaths {
  /** Epic slug identifier */
  epicSlug: string;
  /** Story slug identifier */
  storySlug: string;
  /** Story directory: .saga/epics/{epic-slug}/stories/{story-slug}/ */
  storyDir: string;
  /** Story definition file: .saga/epics/{epic-slug}/stories/{story-slug}/story.md */
  storyMd: string;
  /** Execution journal: .saga/epics/{epic-slug}/stories/{story-slug}/journal.md */
  journalMd: string;
}

/**
 * Worktree directory paths
 */
interface WorktreePaths {
  /** Epic slug identifier */
  epicSlug: string;
  /** Story slug identifier */
  storySlug: string;
  /** Worktree directory: .saga/worktrees/{epic-slug}/{story-slug}/ */
  worktreeDir: string;
  /** Story.md path inside worktree's nested .saga structure */
  storyMdInWorktree: string;
  /** Journal.md path inside worktree's nested .saga structure */
  journalMdInWorktree: string;
}

/**
 * Archive directory paths
 */
interface ArchivePaths {
  /** Epic slug identifier */
  epicSlug: string;
  /** Story slug identifier (optional, for story-level archives) */
  storySlug?: string;
  /** Archived epic directory: .saga/archive/{epic-slug}/ */
  archiveEpicDir: string;
  /** Archived story directory: .saga/archive/{epic-slug}/{story-slug}/ */
  archiveStoryDir?: string;
  /** Archived story.md: .saga/archive/{epic-slug}/{story-slug}/story.md */
  archiveStoryMd?: string;
}

/**
 * Normalize a project root path by removing trailing slashes
 */
function normalizeRoot(projectRoot: string): string {
  return projectRoot.endsWith('/') ? projectRoot.slice(0, -1) : projectRoot;
}

/**
 * Create root-level SAGA paths
 *
 * @param projectRoot - Path to the project root directory
 * @returns SagaPaths object with all root-level paths
 */
function createSagaPaths(projectRoot: string): SagaPaths {
  const root = normalizeRoot(projectRoot);
  const saga = `${root}/.saga`;

  return {
    root,
    saga,
    epics: `${saga}/epics`,
    worktrees: `${saga}/worktrees`,
    archive: `${saga}/archive`,
  };
}

/**
 * Create epic directory paths
 *
 * @param projectRoot - Path to the project root directory
 * @param epicSlug - Epic slug identifier
 * @returns EpicPaths object with all epic-level paths
 */
function createEpicPaths(projectRoot: string, epicSlug: string): EpicPaths {
  const { epics } = createSagaPaths(projectRoot);
  const epicDir = `${epics}/${epicSlug}`;

  return {
    epicSlug,
    epicDir,
    epicMd: `${epicDir}/epic.md`,
    storiesDir: `${epicDir}/stories`,
  };
}

/**
 * Create story directory paths (within the epics structure)
 *
 * @param projectRoot - Path to the project root directory
 * @param epicSlug - Epic slug identifier
 * @param storySlug - Story slug identifier
 * @returns StoryPaths object with all story-level paths
 */
function createStoryPaths(projectRoot: string, epicSlug: string, storySlug: string): StoryPaths {
  const { storiesDir } = createEpicPaths(projectRoot, epicSlug);
  const storyDir = `${storiesDir}/${storySlug}`;

  return {
    epicSlug,
    storySlug,
    storyDir,
    storyMd: `${storyDir}/story.md`,
    journalMd: `${storyDir}/journal.md`,
  };
}

/**
 * Create worktree directory paths
 *
 * Worktrees contain a nested .saga/ structure that mirrors the main project.
 * This allows the worktree to be self-contained.
 *
 * @param projectRoot - Path to the project root directory
 * @param epicSlug - Epic slug identifier
 * @param storySlug - Story slug identifier
 * @returns WorktreePaths object with all worktree-level paths
 */
function createWorktreePaths(
  projectRoot: string,
  epicSlug: string,
  storySlug: string,
): WorktreePaths {
  const { worktrees } = createSagaPaths(projectRoot);
  const worktreeDir = `${worktrees}/${epicSlug}/${storySlug}`;

  const nestedStoryDir = `${worktreeDir}/.saga/epics/${epicSlug}/stories/${storySlug}`;

  return {
    epicSlug,
    storySlug,
    worktreeDir,
    storyMdInWorktree: `${nestedStoryDir}/story.md`,
    journalMdInWorktree: `${nestedStoryDir}/journal.md`,
  };
}

/**
 * Create archive directory paths
 *
 * @param projectRoot - Path to the project root directory
 * @param epicSlug - Epic slug identifier
 * @param storySlug - Optional story slug identifier for story-level archives
 * @returns ArchivePaths object with all archive-level paths
 */
function createArchivePaths(
  projectRoot: string,
  epicSlug: string,
  storySlug?: string,
): ArchivePaths {
  const { archive } = createSagaPaths(projectRoot);
  const archiveEpicDir = `${archive}/${epicSlug}`;

  const result: ArchivePaths = {
    epicSlug,
    archiveEpicDir,
  };

  if (storySlug) {
    const archiveStoryDir = `${archiveEpicDir}/${storySlug}`;
    result.storySlug = storySlug;
    result.archiveStoryDir = archiveStoryDir;
    result.archiveStoryMd = `${archiveStoryDir}/story.md`;
  }

  return result;
}

export {
  type ArchivePaths,
  type EpicPaths,
  type SagaPaths,
  type StoryPaths,
  type WorktreePaths,
  createArchivePaths,
  createEpicPaths,
  createSagaPaths,
  createStoryPaths,
  createWorktreePaths,
};
