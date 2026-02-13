/**
 * Tests for saga-scanner - JSON-based story and epic scanning
 */

import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSagaPaths, createStoryPaths, createWorktreePaths } from '../../directory.ts';
import {
  deriveStoryStatus,
  epicsDirectoryExists,
  scanEpics,
  scanStories,
  storiesDirectoryExists,
  worktreesDirectoryExists,
} from './saga-scanner.ts';

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;

beforeEach(() => {
  testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-scanner-test-')));
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

/**
 * Create a story with its story.json and optional task files
 */
function setupStory(
  storyId: string,
  storyData: Record<string, unknown>,
  tasks: Array<{ id: string; status: string }> = [],
  options: { withWorktree?: boolean; withJournal?: boolean } = {},
): void {
  const storyPaths = createStoryPaths(testDir, storyId);
  mkdirSync(storyPaths.storyDir, { recursive: true });
  writeFileSync(storyPaths.storyJson, JSON.stringify(storyData, null, 2));

  for (const task of tasks) {
    const taskPath = join(storyPaths.storyDir, `${task.id}.json`);
    writeFileSync(
      taskPath,
      JSON.stringify({
        id: task.id,
        subject: `Task ${task.id}`,
        description: 'Test task',
        status: task.status,
        blockedBy: [],
      }),
    );
  }

  if (options.withWorktree) {
    const worktreePaths = createWorktreePaths(testDir, storyId);
    mkdirSync(worktreePaths.worktreeDir, { recursive: true });
  }

  if (options.withJournal) {
    writeFileSync(storyPaths.journalMd, '# Journal\n');
  }
}

/**
 * Create an epic JSON file
 */
function setupEpic(epicId: string, epicData: Record<string, unknown>): void {
  const sagaPaths = createSagaPaths(testDir);
  mkdirSync(sagaPaths.epics, { recursive: true });
  writeFileSync(join(sagaPaths.epics, `${epicId}.json`), JSON.stringify(epicData, null, 2));
}

// ============================================================================
// deriveStoryStatus
// ============================================================================

describe('deriveStoryStatus', () => {
  it('should return pending when no tasks', () => {
    expect(deriveStoryStatus([])).toBe('pending');
  });

  it('should return completed when all tasks completed', () => {
    const tasks = [{ status: 'completed' }, { status: 'completed' }, { status: 'completed' }];
    expect(deriveStoryStatus(tasks)).toBe('completed');
  });

  it('should return in_progress when any task is in_progress', () => {
    const tasks = [{ status: 'completed' }, { status: 'in_progress' }, { status: 'pending' }];
    expect(deriveStoryStatus(tasks)).toBe('in_progress');
  });

  it('should return pending when tasks are mix of pending and completed', () => {
    const tasks = [{ status: 'completed' }, { status: 'pending' }];
    expect(deriveStoryStatus(tasks)).toBe('pending');
  });

  it('should return pending when all tasks are pending', () => {
    const tasks = [{ status: 'pending' }, { status: 'pending' }];
    expect(deriveStoryStatus(tasks)).toBe('pending');
  });

  it('should return in_progress with single in_progress task', () => {
    const tasks = [{ status: 'in_progress' }];
    expect(deriveStoryStatus(tasks)).toBe('in_progress');
  });

  it('should return completed with single completed task', () => {
    const tasks = [{ status: 'completed' }];
    expect(deriveStoryStatus(tasks)).toBe('completed');
  });
});

// ============================================================================
// scanStories
// ============================================================================

describe('scanStories', () => {
  it('should return empty array when stories directory does not exist', async () => {
    const stories = await scanStories(testDir);
    expect(stories).toEqual([]);
  });

  it('should scan a single story with no tasks', async () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      description: 'Add login functionality to the app',
      epic: 'auth-epic',
    });

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(1);
    expect(stories[0].id).toBe('implement-login');
    expect(stories[0].title).toBe('Implement Login Feature');
    expect(stories[0].description).toBe('Add login functionality to the app');
    expect(stories[0].epicId).toBe('auth-epic');
    expect(stories[0].status).toBe('pending'); // no tasks = pending
  });

  it('should derive status from task files', async () => {
    setupStory(
      'implement-login',
      {
        id: 'implement-login',
        title: 'Implement Login',
        description: 'Login feature',
        epic: 'auth-epic',
      },
      [
        { id: 't1', status: 'completed' },
        { id: 't2', status: 'in_progress' },
        { id: 't3', status: 'pending' },
      ],
    );

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(1);
    expect(stories[0].status).toBe('in_progress');
  });

  it('should mark story as completed when all tasks completed', async () => {
    setupStory(
      'implement-login',
      {
        id: 'implement-login',
        title: 'Implement Login',
        description: 'Login feature',
      },
      [
        { id: 't1', status: 'completed' },
        { id: 't2', status: 'completed' },
      ],
    );

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(1);
    expect(stories[0].status).toBe('completed');
  });

  it('should detect worktree path when worktree exists', async () => {
    setupStory(
      'implement-login',
      {
        id: 'implement-login',
        title: 'Implement Login',
        description: 'Login feature',
      },
      [],
      { withWorktree: true },
    );

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(1);
    expect(stories[0].worktreePath).toBeDefined();
    expect(stories[0].worktreePath).toContain('implement-login');
  });

  it('should not set worktreePath when worktree does not exist', async () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      description: 'Login feature',
    });

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(1);
    expect(stories[0].worktreePath).toBeUndefined();
  });

  it('should detect journal path when journal exists', async () => {
    setupStory(
      'implement-login',
      {
        id: 'implement-login',
        title: 'Implement Login',
        description: 'Login feature',
      },
      [],
      { withJournal: true },
    );

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(1);
    expect(stories[0].journalPath).toBeDefined();
    expect(stories[0].journalPath).toContain('journal.md');
  });

  it('should handle epic field being absent', async () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      description: 'Login feature',
    });

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(1);
    expect(stories[0].epicId).toBe('');
  });

  it('should scan multiple stories', async () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      description: 'Login feature',
      epic: 'auth-epic',
    });
    setupStory('implement-signup', {
      id: 'implement-signup',
      title: 'Implement Signup',
      description: 'Signup feature',
      epic: 'auth-epic',
    });

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(2);
    const ids = stories.map((s) => s.id).sort();
    expect(ids).toEqual(['implement-login', 'implement-signup']);
  });

  it('should skip non-directory entries in stories folder', async () => {
    // Create a story
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      description: 'Login feature',
    });

    // Create a stray file in the stories directory
    const sagaPaths = createSagaPaths(testDir);
    writeFileSync(join(sagaPaths.stories, 'stray-file.txt'), 'not a story');

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(1);
    expect(stories[0].id).toBe('implement-login');
  });

  it('should skip directories without story.json', async () => {
    // Create stories dir and an empty sub-dir
    const sagaPaths = createSagaPaths(testDir);
    mkdirSync(join(sagaPaths.stories, 'empty-story'), { recursive: true });

    const stories = await scanStories(testDir);

    expect(stories).toHaveLength(0);
  });
});

// ============================================================================
// scanEpics
// ============================================================================

describe('scanEpics', () => {
  it('should return empty array when epics directory does not exist', async () => {
    const epics = await scanEpics(testDir);
    expect(epics).toEqual([]);
  });

  it('should scan a single epic', async () => {
    setupEpic('auth-epic', {
      id: 'auth-epic',
      title: 'Authentication Epic',
      description: 'All auth stories',
      children: [],
    });

    const epics = await scanEpics(testDir);

    expect(epics).toHaveLength(1);
    expect(epics[0].id).toBe('auth-epic');
    expect(epics[0].title).toBe('Authentication Epic');
    expect(epics[0].epicPath).toContain('auth-epic.json');
  });

  it('should scan multiple epics', async () => {
    setupEpic('auth-epic', {
      id: 'auth-epic',
      title: 'Authentication Epic',
      description: 'Auth stories',
      children: [],
    });
    setupEpic('payment-epic', {
      id: 'payment-epic',
      title: 'Payment Epic',
      description: 'Payment stories',
      children: [],
    });

    const epics = await scanEpics(testDir);

    expect(epics).toHaveLength(2);
    const ids = epics.map((e) => e.id).sort();
    expect(ids).toEqual(['auth-epic', 'payment-epic']);
  });

  it('should skip non-json files in epics directory', async () => {
    setupEpic('auth-epic', {
      id: 'auth-epic',
      title: 'Authentication Epic',
      description: 'Auth stories',
      children: [],
    });

    const sagaPaths = createSagaPaths(testDir);
    writeFileSync(join(sagaPaths.epics, 'README.md'), '# Epics');

    const epics = await scanEpics(testDir);

    expect(epics).toHaveLength(1);
    expect(epics[0].id).toBe('auth-epic');
  });
});

// ============================================================================
// Directory existence helpers
// ============================================================================

describe('directory existence helpers', () => {
  it('storiesDirectoryExists should return false when no stories dir', () => {
    expect(storiesDirectoryExists(testDir)).toBe(false);
  });

  it('storiesDirectoryExists should return true when stories dir exists', () => {
    const sagaPaths = createSagaPaths(testDir);
    mkdirSync(sagaPaths.stories, { recursive: true });
    expect(storiesDirectoryExists(testDir)).toBe(true);
  });

  it('worktreesDirectoryExists should return false when no worktrees dir', () => {
    expect(worktreesDirectoryExists(testDir)).toBe(false);
  });

  it('worktreesDirectoryExists should return true when worktrees dir exists', () => {
    const sagaPaths = createSagaPaths(testDir);
    mkdirSync(sagaPaths.worktrees, { recursive: true });
    expect(worktreesDirectoryExists(testDir)).toBe(true);
  });

  it('epicsDirectoryExists should return false when no epics dir', () => {
    expect(epicsDirectoryExists(testDir)).toBe(false);
  });

  it('epicsDirectoryExists should return true when epics dir exists', () => {
    const sagaPaths = createSagaPaths(testDir);
    mkdirSync(sagaPaths.epics, { recursive: true });
    expect(epicsDirectoryExists(testDir)).toBe(true);
  });
});
