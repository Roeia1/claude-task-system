import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Source fixtures (checked into git)
const SOURCE_FIXTURES = join(__dirname, 'fixtures');

// Temp fixtures path - must match playwright.e2e.config.ts
const FIXTURES_PATH = join(tmpdir(), 'saga-e2e-fixtures');

// Path to the .saga directory within fixtures
const SAGA_PATH = join(FIXTURES_PATH, '.saga');

// Path to epics directory
const EPICS_PATH = join(SAGA_PATH, 'epics');

/** Delay in ms after file write to allow file watcher to detect changes.
 * With native file watching this is typically much faster than polling. */
const FILE_WATCHER_SETTLE_DELAY_MS = 100;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get path to a specific epic
 */
function getEpicPath(epicSlug: string): string {
  return join(EPICS_PATH, epicSlug);
}

/**
 * Get path to a specific story
 */
function getStoryPath(epicSlug: string, storySlug: string): string {
  return join(EPICS_PATH, epicSlug, 'stories', storySlug);
}

/**
 * Get path to a story.md file
 */
function getStoryFilePath(epicSlug: string, storySlug: string): string {
  return join(getStoryPath(epicSlug, storySlug), 'story.md');
}

/**
 * Get path to a journal.md file
 */
function getJournalFilePath(epicSlug: string, storySlug: string): string {
  return join(getStoryPath(epicSlug, storySlug), 'journal.md');
}

/**
 * Read a story file
 */
function readStoryFile(epicSlug: string, storySlug: string): Promise<string> {
  return readFile(getStoryFilePath(epicSlug, storySlug), 'utf-8');
}

/**
 * Write a story file with flush to ensure file watcher detects the change.
 * Includes a small delay to allow the file watcher to detect the change.
 */
async function writeStoryFile(epicSlug: string, storySlug: string, content: string): Promise<void> {
  await writeFile(getStoryFilePath(epicSlug, storySlug), content, { flush: true });
  // Allow file watcher to detect the change
  await sleep(FILE_WATCHER_SETTLE_DELAY_MS);
}

/**
 * Delete an epic directory
 */
async function deleteEpic(epicSlug: string): Promise<void> {
  await rm(getEpicPath(epicSlug), { recursive: true, force: true });
}

/**
 * Delete all epics
 */
async function deleteAllEpics(): Promise<void> {
  await rm(EPICS_PATH, { recursive: true, force: true });
  await mkdir(EPICS_PATH, { recursive: true });
}

/**
 * Create a minimal epic
 */
async function createEpic(epicSlug: string, title: string): Promise<void> {
  const epicPath = getEpicPath(epicSlug);
  await mkdir(join(epicPath, 'stories'), { recursive: true });
  await writeFile(
    join(epicPath, 'epic.md'),
    `# ${title}

This epic was created dynamically for testing.
`,
  );
}

/**
 * Create a minimal story
 */
async function createStory(
  epicSlug: string,
  storySlug: string,
  title: string,
  status = 'ready',
): Promise<void> {
  const storyPath = getStoryPath(epicSlug, storySlug);
  await mkdir(storyPath, { recursive: true });
  await writeFile(
    join(storyPath, 'story.md'),
    `---
id: ${storySlug}
title: ${title}
status: ${status}
epic: ${epicSlug}
tasks: []
---

## Context

${title} story.
`,
  );
}

/**
 * Reset all fixtures by re-copying from source.
 * Use this in beforeEach to ensure tests start with a clean state.
 */
async function resetAllFixtures(): Promise<void> {
  await rm(FIXTURES_PATH, { recursive: true, force: true });
  await cp(SOURCE_FIXTURES, FIXTURES_PATH, { recursive: true });
}

// All exports at the end of the module
export {
  SOURCE_FIXTURES,
  FIXTURES_PATH,
  SAGA_PATH,
  EPICS_PATH,
  getEpicPath,
  getStoryPath,
  getStoryFilePath,
  getJournalFilePath,
  readStoryFile,
  writeStoryFile,
  deleteEpic,
  deleteAllEpics,
  createEpic,
  createStory,
  resetAllFixtures,
};
