import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Source fixtures (checked into git) */
const SOURCE_FIXTURES = join(__dirname, 'fixtures');

/** Delay in ms after file write to allow file watcher to detect changes.
 * With polling mode enabled for tests, this can be shorter. */
const FILE_WATCHER_SETTLE_DELAY_MS = 100;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fixture utilities bound to a specific fixtures directory.
 * Each parallel worker gets its own instance with its own directory.
 */
interface FixtureUtils {
  /** Base path to the fixtures directory */
  fixturesPath: string;
  /** Path to the .saga directory within fixtures */
  sagaPath: string;
  /** Path to epics directory */
  epicsPath: string;

  /** Get path to a specific epic */
  getEpicPath(epicSlug: string): string;
  /** Get path to a specific story */
  getStoryPath(epicSlug: string, storySlug: string): string;
  /** Get path to a story.md file */
  getStoryFilePath(epicSlug: string, storySlug: string): string;
  /** Get path to a journal.md file */
  getJournalFilePath(epicSlug: string, storySlug: string): string;
  /** Read a story file */
  readStoryFile(epicSlug: string, storySlug: string): Promise<string>;
  /** Write a story file with flush and settle delay */
  writeStoryFile(epicSlug: string, storySlug: string, content: string): Promise<void>;
  /** Delete an epic directory */
  deleteEpic(epicSlug: string): Promise<void>;
  /** Delete all epics */
  deleteAllEpics(): Promise<void>;
  /** Create a minimal epic */
  createEpic(epicSlug: string, title: string): Promise<void>;
  /** Create a minimal story */
  createStory(epicSlug: string, storySlug: string, title: string, status?: string): Promise<void>;
  /** Reset all fixtures by re-copying from source */
  resetAllFixtures(): Promise<void>;
}

// Path helper functions
function makeGetEpicPath(epicsPath: string) {
  return (epicSlug: string): string => join(epicsPath, epicSlug);
}

function makeGetStoryPath(epicsPath: string) {
  return (epicSlug: string, storySlug: string): string =>
    join(epicsPath, epicSlug, 'stories', storySlug);
}

function makeGetStoryFilePath(getStoryPath: (e: string, s: string) => string) {
  return (epicSlug: string, storySlug: string): string =>
    join(getStoryPath(epicSlug, storySlug), 'story.md');
}

function makeGetJournalFilePath(getStoryPath: (e: string, s: string) => string) {
  return (epicSlug: string, storySlug: string): string =>
    join(getStoryPath(epicSlug, storySlug), 'journal.md');
}

// File operation functions
function makeReadStoryFile(getStoryFilePath: (e: string, s: string) => string) {
  return (epicSlug: string, storySlug: string): Promise<string> =>
    readFile(getStoryFilePath(epicSlug, storySlug), 'utf-8');
}

function makeWriteStoryFile(getStoryFilePath: (e: string, s: string) => string) {
  return async (epicSlug: string, storySlug: string, content: string): Promise<void> => {
    await writeFile(getStoryFilePath(epicSlug, storySlug), content, { flush: true });
    await sleep(FILE_WATCHER_SETTLE_DELAY_MS);
  };
}

function makeDeleteEpic(getEpicPath: (e: string) => string) {
  return async (epicSlug: string): Promise<void> => {
    await rm(getEpicPath(epicSlug), { recursive: true, force: true });
  };
}

function makeDeleteAllEpics(epicsPath: string) {
  return async (): Promise<void> => {
    await rm(epicsPath, { recursive: true, force: true });
    await mkdir(epicsPath, { recursive: true });
  };
}

function makeCreateEpic(getEpicPath: (e: string) => string) {
  return async (epicSlug: string, title: string): Promise<void> => {
    const epicPath = getEpicPath(epicSlug);
    await mkdir(join(epicPath, 'stories'), { recursive: true });
    await writeFile(
      join(epicPath, 'epic.md'),
      `# ${title}

This epic was created dynamically for testing.
`,
    );
  };
}

function makeCreateStory(getStoryPath: (e: string, s: string) => string) {
  return async (
    epicSlug: string,
    storySlug: string,
    title: string,
    status = 'ready',
  ): Promise<void> => {
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
  };
}

function makeResetAllFixtures(fixturesPath: string) {
  return async (): Promise<void> => {
    await rm(fixturesPath, { recursive: true, force: true });
    await cp(SOURCE_FIXTURES, fixturesPath, { recursive: true });
  };
}

/**
 * Create fixture utilities bound to a specific fixtures directory.
 * Use this to get isolated utilities for each parallel worker.
 */
function createFixtureUtils(fixturesPath: string): FixtureUtils {
  const sagaPath = join(fixturesPath, '.saga');
  const epicsPath = join(sagaPath, 'epics');

  const getEpicPath = makeGetEpicPath(epicsPath);
  const getStoryPath = makeGetStoryPath(epicsPath);
  const getStoryFilePath = makeGetStoryFilePath(getStoryPath);
  const getJournalFilePath = makeGetJournalFilePath(getStoryPath);

  return {
    fixturesPath,
    sagaPath,
    epicsPath,
    getEpicPath,
    getStoryPath,
    getStoryFilePath,
    getJournalFilePath,
    readStoryFile: makeReadStoryFile(getStoryFilePath),
    writeStoryFile: makeWriteStoryFile(getStoryFilePath),
    deleteEpic: makeDeleteEpic(getEpicPath),
    deleteAllEpics: makeDeleteAllEpics(epicsPath),
    createEpic: makeCreateEpic(getEpicPath),
    createStory: makeCreateStory(getStoryPath),
    resetAllFixtures: makeResetAllFixtures(fixturesPath),
  };
}

export { SOURCE_FIXTURES, createFixtureUtils };
export type { FixtureUtils };
