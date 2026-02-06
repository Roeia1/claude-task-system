import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  createEpicPaths,
  createStoryPaths,
  type Epic,
  EpicSchema,
  type Story,
  StorySchema,
} from '@saga-ai/types';

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
