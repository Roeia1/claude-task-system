/**
 * Hydration service - reads SAGA task files, converts to Claude Code format,
 * and writes them to the session task list directory.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ClaudeCodeTask,
  createStoryPaths,
  type Story,
  StorySchema,
  type Task,
  TaskSchema,
  toClaudeTask,
} from '@saga-ai/types';
import { generateTaskListId, getTaskListDir } from './namespace.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Story metadata returned to the caller for prompt injection.
 */
interface StoryMeta {
  title: string;
  description: string;
  guidance?: string;
  doneWhen?: string;
  avoid?: string;
}

/**
 * Result of a successful hydration.
 */
interface HydrationResult {
  taskListId: string;
  taskCount: number;
  storyMeta: StoryMeta;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Read and validate story.json from a story directory.
 */
function readStory(storyJsonPath: string): Story {
  if (!existsSync(storyJsonPath)) {
    throw new Error(`story.json not found: ${storyJsonPath}`);
  }
  try {
    const raw = readFileSync(storyJsonPath, 'utf-8');
    return StorySchema.parse(JSON.parse(raw));
  } catch (error) {
    throw new Error(
      `Failed to parse story.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Read and validate all task JSON files from a story directory.
 */
function readTasks(storyDir: string): Task[] {
  const files = readdirSync(storyDir).filter((f) => f.endsWith('.json') && f !== 'story.json');
  const tasks: Task[] = [];
  for (const file of files) {
    const filePath = join(storyDir, file);
    try {
      const raw = readFileSync(filePath, 'utf-8');
      tasks.push(TaskSchema.parse(JSON.parse(raw)));
    } catch (error) {
      throw new Error(
        `Failed to parse task file ${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return tasks;
}

/**
 * Convert SAGA tasks to Claude Code format with computed blocks.
 */
function convertTasks(tasks: Task[]): ClaudeCodeTask[] {
  return tasks.map((task) => {
    const blocks = tasks
      .filter((other) => other.blockedBy.includes(task.id))
      .map((other) => other.id);
    const converted = toClaudeTask(task);
    converted.blocks = blocks;
    return converted;
  });
}

/**
 * Write converted tasks to the task list directory.
 */
function writeTasks(claudeTasks: ClaudeCodeTask[], taskListDir: string): void {
  try {
    mkdirSync(taskListDir, { recursive: true });
  } catch (error) {
    throw new Error(
      `Failed to create task list directory ${taskListDir}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  for (const claudeTask of claudeTasks) {
    const taskPath = join(taskListDir, `${claudeTask.id}.json`);
    writeFileSync(taskPath, JSON.stringify(claudeTask, null, 2));
  }
}

/**
 * Extract story metadata for prompt injection.
 */
function extractStoryMeta(story: Story): StoryMeta {
  return {
    title: story.title,
    description: story.description,
    ...(story.guidance !== undefined && { guidance: story.guidance }),
    ...(story.doneWhen !== undefined && { doneWhen: story.doneWhen }),
    ...(story.avoid !== undefined && { avoid: story.avoid }),
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Hydrate a story's tasks into Claude Code format.
 *
 * @param storyId - The story identifier
 * @param sessionTimestamp - Timestamp for session namespacing
 * @param projectDir - The project root directory (contains .saga/)
 * @param claudeTasksBase - Override for the base tasks directory (used in tests)
 */
function hydrate(
  storyId: string,
  sessionTimestamp: number,
  projectDir: string,
  claudeTasksBase?: string,
): HydrationResult {
  const { storyDir, storyJson } = createStoryPaths(projectDir, storyId);

  if (!existsSync(storyDir)) {
    throw new Error(`Story directory not found: ${storyDir}`);
  }

  const story = readStory(storyJson);
  const tasks = readTasks(storyDir);
  const claudeTasks = convertTasks(tasks);

  const taskListId = generateTaskListId(storyId, sessionTimestamp);
  const taskListDir = getTaskListDir(taskListId, claudeTasksBase);
  writeTasks(claudeTasks, taskListDir);

  return {
    taskListId,
    taskCount: claudeTasks.length,
    storyMeta: extractStoryMeta(story),
  };
}

export { hydrate };
export type { HydrationResult, StoryMeta };
