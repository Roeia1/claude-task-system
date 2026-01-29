import { writeFile, readFile, rm, mkdir, cp } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Source fixtures (checked into git)
export const SOURCE_FIXTURES = join(__dirname, 'fixtures');

// Temp fixtures path - must match playwright.e2e.config.ts
export const FIXTURES_PATH = join(tmpdir(), 'saga-e2e-fixtures');

// Path to the .saga directory within fixtures
export const SAGA_PATH = join(FIXTURES_PATH, '.saga');

// Path to epics directory
export const EPICS_PATH = join(SAGA_PATH, 'epics');

/**
 * Get path to a specific epic
 */
export function getEpicPath(epicSlug: string): string {
  return join(EPICS_PATH, epicSlug);
}

/**
 * Get path to a specific story
 */
export function getStoryPath(epicSlug: string, storySlug: string): string {
  return join(EPICS_PATH, epicSlug, 'stories', storySlug);
}

/**
 * Get path to a story.md file
 */
export function getStoryFilePath(epicSlug: string, storySlug: string): string {
  return join(getStoryPath(epicSlug, storySlug), 'story.md');
}

/**
 * Get path to a journal.md file
 */
export function getJournalFilePath(epicSlug: string, storySlug: string): string {
  return join(getStoryPath(epicSlug, storySlug), 'journal.md');
}

/**
 * Read a story file
 */
export async function readStoryFile(epicSlug: string, storySlug: string): Promise<string> {
  return readFile(getStoryFilePath(epicSlug, storySlug), 'utf-8');
}

/**
 * Write a story file
 */
export async function writeStoryFile(epicSlug: string, storySlug: string, content: string): Promise<void> {
  await writeFile(getStoryFilePath(epicSlug, storySlug), content);
}

/**
 * Delete an epic directory
 */
export async function deleteEpic(epicSlug: string): Promise<void> {
  await rm(getEpicPath(epicSlug), { recursive: true, force: true });
}

/**
 * Delete all epics
 */
export async function deleteAllEpics(): Promise<void> {
  await rm(EPICS_PATH, { recursive: true, force: true });
  await mkdir(EPICS_PATH, { recursive: true });
}

/**
 * Create a minimal epic
 */
export async function createEpic(epicSlug: string, title: string): Promise<void> {
  const epicPath = getEpicPath(epicSlug);
  await mkdir(join(epicPath, 'stories'), { recursive: true });
  await writeFile(join(epicPath, 'epic.md'), `# ${title}

This epic was created dynamically for testing.
`);
}

/**
 * Create a minimal story
 */
export async function createStory(
  epicSlug: string,
  storySlug: string,
  title: string,
  status: string = 'ready'
): Promise<void> {
  const storyPath = getStoryPath(epicSlug, storySlug);
  await mkdir(storyPath, { recursive: true });
  await writeFile(join(storyPath, 'story.md'), `---
id: ${storySlug}
title: ${title}
status: ${status}
epic: ${epicSlug}
tasks: []
---

## Context

${title} story.
`);
}

/**
 * Reset all fixtures by re-copying from source.
 * Use this in beforeEach to ensure tests start with a clean state.
 */
export async function resetAllFixtures(): Promise<void> {
  await rm(FIXTURES_PATH, { recursive: true, force: true });
  await cp(SOURCE_FIXTURES, FIXTURES_PATH, { recursive: true });
}
