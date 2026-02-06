/**
 * SAGA Directory Structure Types
 *
 * Utility types for constructing paths within the .saga/ directory structure.
 * These types represent the canonical paths used across the SAGA system:
 *
 * .saga/
 * ├── epics/
 * │   └── {epic-id}.json           # Single file per epic
 * │
 * ├── stories/
 * │   └── {story-id}/
 * │       ├── story.json
 * │       └── journal.md
 * │
 * ├── worktrees/
 * │   └── {story-id}/              # Git worktree directory
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
  /** .saga/stories directory path */
  stories: string;
  /** .saga/worktrees directory path */
  worktrees: string;
  /** .saga/archive directory path */
  archive: string;
}

/**
 * Epic paths - single JSON file per epic
 */
interface EpicPaths {
  /** Epic identifier */
  epicId: string;
  /** Epic JSON file: .saga/epics/{epic-id}.json */
  epicJson: string;
}

/**
 * Story directory paths (flat structure under .saga/stories/)
 */
interface StoryPaths {
  /** Story identifier */
  storyId: string;
  /** Story directory: .saga/stories/{story-id}/ */
  storyDir: string;
  /** Story definition file: .saga/stories/{story-id}/story.json */
  storyJson: string;
  /** Execution journal: .saga/stories/{story-id}/journal.md */
  journalMd: string;
}

/**
 * Worktree directory paths (flat structure under .saga/worktrees/)
 */
interface WorktreePaths {
  /** Story identifier */
  storyId: string;
  /** Worktree directory: .saga/worktrees/{story-id}/ */
  worktreeDir: string;
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
    stories: `${saga}/stories`,
    worktrees: `${saga}/worktrees`,
    archive: `${saga}/archive`,
  };
}

/**
 * Create epic paths - points to a single JSON file
 *
 * @param projectRoot - Path to the project root directory
 * @param epicId - Epic identifier
 * @returns EpicPaths object with epic JSON file path
 */
function createEpicPaths(projectRoot: string, epicId: string): EpicPaths {
  const { epics } = createSagaPaths(projectRoot);

  return {
    epicId,
    epicJson: `${epics}/${epicId}.json`,
  };
}

/**
 * Create story directory paths (flat structure)
 *
 * @param projectRoot - Path to the project root directory
 * @param storyId - Story identifier
 * @returns StoryPaths object with all story-level paths
 */
function createStoryPaths(projectRoot: string, storyId: string): StoryPaths {
  const { stories } = createSagaPaths(projectRoot);
  const storyDir = `${stories}/${storyId}`;

  return {
    storyId,
    storyDir,
    storyJson: `${storyDir}/story.json`,
    journalMd: `${storyDir}/journal.md`,
  };
}

/**
 * Create worktree directory paths (flat structure)
 *
 * @param projectRoot - Path to the project root directory
 * @param storyId - Story identifier
 * @returns WorktreePaths object with worktree directory path
 */
function createWorktreePaths(projectRoot: string, storyId: string): WorktreePaths {
  const { worktrees } = createSagaPaths(projectRoot);

  return {
    storyId,
    worktreeDir: `${worktrees}/${storyId}`,
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

/**
 * Create flat story directory paths (alias for createStoryPaths)
 *
 * @param projectRoot - Path to the project root directory
 * @param storyId - Story identifier
 * @returns StoryPaths object with storyId, storyDir, storyJson, journalMd
 */
const createFlatStoryPaths = createStoryPaths;

/**
 * Create flat epic path (alias for createEpicPaths)
 *
 * @param projectRoot - Path to the project root directory
 * @param epicId - Epic identifier
 * @returns EpicPaths object with epicId, epicJson
 */
const createFlatEpicPath = createEpicPaths;

/**
 * Create a task JSON file path
 *
 * @param projectRoot - Path to the project root directory
 * @param storyId - Story identifier
 * @param taskId - Task identifier
 * @returns Path to the task JSON file: .saga/stories/{storyId}/{taskId}.json
 */
function createTaskPath(projectRoot: string, storyId: string, taskId: string): string {
  const { storyDir } = createStoryPaths(projectRoot, storyId);
  return `${storyDir}/${taskId}.json`;
}

export {
  type ArchivePaths,
  type EpicPaths,
  type SagaPaths,
  type StoryPaths,
  type WorktreePaths,
  createArchivePaths,
  createEpicPaths,
  createFlatEpicPath,
  createFlatStoryPaths,
  createSagaPaths,
  createStoryPaths,
  createTaskPath,
  createWorktreePaths,
};
