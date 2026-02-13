import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
 *
 * Uses the new JSON storage format:
 * - .saga/epics/<epic-id>.json
 * - .saga/stories/<story-id>/story.json
 * - .saga/stories/<story-id>/<task-id>.json
 * - .saga/stories/<story-id>/journal.md
 */
interface FixtureUtils {
  /** Base path to the fixtures directory */
  fixturesPath: string;
  /** Path to the .saga directory within fixtures */
  sagaPath: string;
  /** Path to epics directory */
  epicsPath: string;
  /** Path to stories directory */
  storiesPath: string;

  /** Get path to a specific epic JSON file */
  getEpicPath(epicId: string): string;
  /** Get path to a specific story directory */
  getStoryPath(storyId: string): string;
  /** Get path to a story.json file */
  getStoryFilePath(storyId: string): string;
  /** Get path to a journal.md file */
  getJournalFilePath(storyId: string): string;
  /** Get path to a task JSON file */
  getTaskFilePath(storyId: string, taskId: string): string;
  /** Read a story.json file */
  readStoryFile(storyId: string): Promise<string>;
  /** Write a task JSON file with flush and settle delay */
  writeTaskFile(storyId: string, taskId: string, content: string): Promise<void>;
  /** Delete an epic and its stories */
  deleteEpic(epicId: string): Promise<void>;
  /** Delete all epics and stories */
  deleteAllEpics(): Promise<void>;
  /** Create a minimal epic */
  createEpic(epicId: string, title: string): Promise<void>;
  /** Create a minimal story with no tasks */
  createStory(epicId: string, storyId: string, title: string): Promise<void>;
  /** Reset all fixtures by re-copying from source */
  resetAllFixtures(): Promise<void>;
}

/** Path helpers for a fixtures directory */
function createPathHelpers(fixturesPath: string) {
  const sagaPath = join(fixturesPath, '.saga');
  const epicsPath = join(sagaPath, 'epics');
  const storiesPath = join(sagaPath, 'stories');

  return {
    sagaPath,
    epicsPath,
    storiesPath,
    getEpicPath: (epicId: string): string => join(epicsPath, `${epicId}.json`),
    getStoryPath: (storyId: string): string => join(storiesPath, storyId),
    getStoryFilePath: (storyId: string): string => join(storiesPath, storyId, 'story.json'),
    getJournalFilePath: (storyId: string): string => join(storiesPath, storyId, 'journal.md'),
    getTaskFilePath: (storyId: string, taskId: string): string =>
      join(storiesPath, storyId, `${taskId}.json`),
  };
}

/** Delete an epic and its associated stories */
async function deleteEpicAndStories(
  epicPath: string,
  storiesPath: string,
  epicId: string,
): Promise<void> {
  await rm(epicPath, { force: true });
  try {
    const storyDirs = await readdir(storiesPath);
    const readResults = await Promise.all(
      storyDirs.map(async (dir) => {
        try {
          const content = await readFile(join(storiesPath, dir, 'story.json'), 'utf-8');
          return JSON.parse(content).epic === epicId ? dir : null;
        } catch {
          return null;
        }
      }),
    );
    const toDelete = readResults.filter((dir): dir is string => dir !== null);
    await Promise.all(
      toDelete.map((dir) => rm(join(storiesPath, dir), { recursive: true, force: true })),
    );
  } catch {
    // stories dir may not exist
  }
}

/** Create a story and add it to its epic's children list */
async function createStoryWithEpicLink(
  storyDir: string,
  epicPath: string,
  epicId: string,
  storyId: string,
  title: string,
): Promise<void> {
  await mkdir(storyDir, { recursive: true });
  await writeFile(
    join(storyDir, 'story.json'),
    JSON.stringify({ id: storyId, title, description: `${title} story.`, epic: epicId }),
  );
  try {
    const epicContent = await readFile(epicPath, 'utf-8');
    const epic = JSON.parse(epicContent);
    if (!epic.children.some((c: { id: string }) => c.id === storyId)) {
      epic.children.push({ id: storyId, blockedBy: [] });
      await writeFile(epicPath, JSON.stringify(epic));
    }
  } catch {
    // Epic may not exist yet
  }
}

/** Mutation helpers for a fixtures directory */
function createMutationHelpers(fixturesPath: string, paths: ReturnType<typeof createPathHelpers>) {
  const { epicsPath, storiesPath, getEpicPath, getStoryPath, getStoryFilePath, getTaskFilePath } =
    paths;

  return {
    readStoryFile: (storyId: string): Promise<string> =>
      readFile(getStoryFilePath(storyId), 'utf-8'),
    writeTaskFile: async (storyId: string, taskId: string, content: string): Promise<void> => {
      await writeFile(getTaskFilePath(storyId, taskId), content, { flush: true });
      await sleep(FILE_WATCHER_SETTLE_DELAY_MS);
    },
    deleteEpic: (epicId: string) => deleteEpicAndStories(getEpicPath(epicId), storiesPath, epicId),
    deleteAllEpics: async (): Promise<void> => {
      await rm(epicsPath, { recursive: true, force: true });
      await mkdir(epicsPath, { recursive: true });
      await rm(storiesPath, { recursive: true, force: true });
      await mkdir(storiesPath, { recursive: true });
    },
    createEpic: async (epicId: string, title: string): Promise<void> => {
      await mkdir(epicsPath, { recursive: true });
      const data = {
        id: epicId,
        title,
        description: 'This epic was created dynamically for testing.',
        children: [],
      };
      await writeFile(getEpicPath(epicId), JSON.stringify(data));
    },
    createStory: (epicId: string, storyId: string, title: string) =>
      createStoryWithEpicLink(getStoryPath(storyId), getEpicPath(epicId), epicId, storyId, title),
    resetAllFixtures: async (): Promise<void> => {
      await rm(fixturesPath, { recursive: true, force: true });
      await cp(SOURCE_FIXTURES, fixturesPath, { recursive: true });
    },
  };
}

/**
 * Create fixture utilities bound to a specific fixtures directory.
 * Use this to get isolated utilities for each parallel worker.
 */
function createFixtureUtils(fixturesPath: string): FixtureUtils {
  const paths = createPathHelpers(fixturesPath);
  const mutations = createMutationHelpers(fixturesPath, paths);
  return { fixturesPath, ...paths, ...mutations };
}

export { SOURCE_FIXTURES, createFixtureUtils };
export type { FixtureUtils };
