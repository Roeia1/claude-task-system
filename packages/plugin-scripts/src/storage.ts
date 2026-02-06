import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createStoryPaths, type Story, StorySchema } from '@saga-ai/types';

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
