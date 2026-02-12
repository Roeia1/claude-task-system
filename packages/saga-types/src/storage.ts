import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STORY_ID_PATTERN = /^[a-z0-9-]+$/;

import { createEpicPaths, createSagaPaths, createStoryPaths } from './directory.ts';
import { type Epic, EpicSchema } from './epic.ts';
import { type Story, StorySchema } from './story.ts';
import { type Task, TaskSchema, type TaskStatus } from './task.ts';

/**
 * Write a story.json file to .saga/stories/<story.id>/story.json
 *
 * Creates the story directory if it does not exist.
 * Validates the story object against the StorySchema before writing.
 */
export function writeStory(projectRoot: string, story: Story): void {
  const validated = StorySchema.parse(story);
  const { storyDir, storyJson } = createStoryPaths(projectRoot, validated.id);

  if (!existsSync(storyDir)) {
    mkdirSync(storyDir, { recursive: true });
  }

  writeFileSync(storyJson, `${JSON.stringify(validated, null, 2)}\n`, 'utf-8');
}

/**
 * Read a story.json file from .saga/stories/<storyId>/story.json
 *
 * Parses and validates the JSON against the StorySchema.
 * Throws if the file does not exist or contains invalid data.
 */
export function readStory(projectRoot: string, storyId: string): Story {
  const { storyJson } = createStoryPaths(projectRoot, storyId);

  if (!existsSync(storyJson)) {
    throw new Error(`Story file not found: ${storyJson}`);
  }

  const raw = readFileSync(storyJson, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Malformed JSON in story file: ${storyJson}`);
  }

  return StorySchema.parse(parsed);
}

/**
 * Write an epic JSON file to .saga/epics/<epic.id>.json
 *
 * Validates the epic object against the EpicSchema before writing.
 * Epics are single files, not directories.
 */
export function writeEpic(projectRoot: string, epic: Epic): void {
  const validated = EpicSchema.parse(epic);
  const { epicJson } = createEpicPaths(projectRoot, validated.id);

  writeFileSync(epicJson, `${JSON.stringify(validated, null, 2)}\n`, 'utf-8');
}

/**
 * Read an epic JSON file from .saga/epics/<epicId>.json
 *
 * Parses and validates the JSON against the EpicSchema.
 * Throws if the file does not exist or contains invalid data.
 */
export function readEpic(projectRoot: string, epicId: string): Epic {
  const { epicJson } = createEpicPaths(projectRoot, epicId);

  if (!existsSync(epicJson)) {
    throw new Error(`Epic file not found: ${epicJson}`);
  }

  const raw = readFileSync(epicJson, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Malformed JSON in epic file: ${epicJson}`);
  }

  return EpicSchema.parse(parsed);
}

/**
 * Write a task JSON file to .saga/stories/<storyId>/<task.id>.json
 *
 * Creates the story directory if it does not exist.
 * Validates the task object against the TaskSchema before writing.
 */
export function writeTask(projectRoot: string, storyId: string, task: Task): void {
  const validated = TaskSchema.parse(task);
  const { storyDir } = createStoryPaths(projectRoot, storyId);

  if (!existsSync(storyDir)) {
    mkdirSync(storyDir, { recursive: true });
  }

  const taskPath = join(storyDir, `${validated.id}.json`);
  writeFileSync(taskPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf-8');
}

/**
 * Read a task JSON file from .saga/stories/<storyId>/<taskId>.json
 *
 * Parses and validates the JSON against the TaskSchema.
 * Throws if the file does not exist or contains invalid data.
 */
export function readTask(projectRoot: string, storyId: string, taskId: string): Task {
  const { storyDir } = createStoryPaths(projectRoot, storyId);
  const taskPath = join(storyDir, `${taskId}.json`);

  if (!existsSync(taskPath)) {
    throw new Error(`Task file not found: ${taskPath}`);
  }

  const raw = readFileSync(taskPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Malformed JSON in task file: ${taskPath}`);
  }

  return TaskSchema.parse(parsed);
}

/**
 * List all task files in a story folder, returning parsed Task objects.
 *
 * Excludes story.json, journal.md, and any non-JSON files.
 * Throws if the story directory does not exist.
 */
export function listTasks(projectRoot: string, storyId: string): Task[] {
  const { storyDir } = createStoryPaths(projectRoot, storyId);

  if (!existsSync(storyDir)) {
    throw new Error(`Story directory not found: ${storyDir}`);
  }

  const files = readdirSync(storyDir);

  return files
    .filter((f) => f.endsWith('.json') && f !== 'story.json')
    .map((f) => {
      const taskPath = join(storyDir, f);
      const raw = readFileSync(taskPath, 'utf-8');

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`Malformed JSON in task file: ${taskPath}`);
      }

      return TaskSchema.parse(parsed);
    });
}

/**
 * List all epic JSON files in .saga/epics/, returning parsed Epic objects.
 *
 * Reads each .json file in the epics directory.
 * Throws if the epics directory does not exist.
 */
export function listEpics(projectRoot: string): Epic[] {
  const { epics } = createSagaPaths(projectRoot);

  if (!existsSync(epics)) {
    throw new Error(`Epics directory not found: ${epics}`);
  }

  const files = readdirSync(epics);

  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const epicPath = join(epics, f);
      const raw = readFileSync(epicPath, 'utf-8');

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`Malformed JSON in epic file: ${epicPath}`);
      }

      return EpicSchema.parse(parsed);
    });
}

/**
 * List all story folders in .saga/stories/, returning parsed Story objects.
 *
 * Reads each story directory's story.json file.
 * Throws if the stories directory does not exist.
 */
export function listStories(projectRoot: string): Story[] {
  const { stories } = createSagaPaths(projectRoot);

  if (!existsSync(stories)) {
    throw new Error(`Stories directory not found: ${stories}`);
  }

  const entries = readdirSync(stories, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const storyJsonPath = join(stories, entry.name, 'story.json');

      if (!existsSync(storyJsonPath)) {
        return null;
      }

      const raw = readFileSync(storyJsonPath, 'utf-8');

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error(`Malformed JSON in story file: ${storyJsonPath}`);
      }

      return StorySchema.parse(parsed);
    })
    .filter((story): story is Story => story !== null);
}

/**
 * List stories that belong to a specific epic.
 *
 * Returns stories whose `epic` field matches the given epicId.
 */
export function listEpicStories(projectRoot: string, epicId: string): Story[] {
  return listStories(projectRoot).filter((story) => story.epic === epicId);
}

/**
 * List stories that do not belong to any epic.
 *
 * Returns stories whose `epic` field is undefined.
 */
export function listStandaloneStories(projectRoot: string): Story[] {
  return listStories(projectRoot).filter((story) => story.epic === undefined);
}

/**
 * Derive story status from its task statuses.
 *
 * - If any task is "in_progress" -> "in_progress"
 * - If all tasks are "completed" -> "completed"
 * - Otherwise -> "pending"
 * - Empty array -> "pending"
 */
export function deriveStoryStatus(tasks: Pick<Task, 'status'>[]): TaskStatus {
  if (tasks.length === 0) {
    return 'pending';
  }
  if (tasks.some((t) => t.status === 'in_progress')) {
    return 'in_progress';
  }
  if (tasks.every((t) => t.status === 'completed')) {
    return 'completed';
  }
  return 'pending';
}

/**
 * Derive epic status from story statuses.
 *
 * - If any story is "in_progress" -> "in_progress"
 * - If all stories are "completed" -> "completed"
 * - Otherwise -> "pending"
 * - Empty array -> "pending"
 */
export function deriveEpicStatus(storyStatuses: TaskStatus[]): TaskStatus {
  if (storyStatuses.length === 0) {
    return 'pending';
  }
  if (storyStatuses.some((s) => s === 'in_progress')) {
    return 'in_progress';
  }
  if (storyStatuses.every((s) => s === 'completed')) {
    return 'completed';
  }
  return 'pending';
}

/**
 * Validate that a story ID matches the [a-z0-9-]+ pattern.
 *
 * Returns true if the ID is valid, false otherwise.
 * Pure function -- does not touch the file system.
 */
export function validateStoryId(id: string): boolean {
  return STORY_ID_PATTERN.test(id);
}

/**
 * Ensure a story ID is unique by checking if .saga/stories/<id>/ already exists.
 *
 * Throws a descriptive error if the directory exists.
 */
export function ensureUniqueStoryId(projectRoot: string, id: string): void {
  const { storyDir } = createStoryPaths(projectRoot, id);

  if (existsSync(storyDir)) {
    throw new Error(`Story ID "${id}" already exists: ${storyDir}`);
  }
}
