/**
 * Tests for finder utility - JSON-based story and epic resolution
 */

import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSagaPaths, createStoryPaths, createWorktreePaths } from '../../directory.ts';
import { findEpic, findStory } from './finder.ts';

// ============================================================================
// Test Constants
// ============================================================================

/** Regex pattern for error message matching in findStory tests */
const STORIES_ERROR_REGEX = /stories/;

describe('findEpic', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-finder-epic-test-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function setupEpics(ids: string[]): void {
    const { epics } = createSagaPaths(testDir);
    mkdirSync(epics, { recursive: true });
    for (const id of ids) {
      writeFileSync(
        join(epics, `${id}.json`),
        JSON.stringify({
          id,
          title: id,
          description: `Epic ${id}`,
          children: [],
        }),
      );
    }
  }

  it('should find epic by exact ID match', () => {
    setupEpics(['user-authentication', 'payment-processing']);

    const result = findEpic(testDir, 'user-authentication');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.id).toBe('user-authentication');
    }
  });

  it('should find epic with case-insensitive match', () => {
    setupEpics(['user-authentication']);

    const result = findEpic(testDir, 'User-Authentication');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.id).toBe('user-authentication');
    }
  });

  it('should normalize underscore to hyphen in query', () => {
    setupEpics(['user-authentication']);

    const result = findEpic(testDir, 'user_authentication');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.id).toBe('user-authentication');
    }
  });

  it('should return single partial match', () => {
    setupEpics(['user-authentication', 'payment-processing']);

    const result = findEpic(testDir, 'auth');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.id).toBe('user-authentication');
    }
  });

  it('should return multiple matches when ambiguous', () => {
    setupEpics(['user-auth', 'admin-auth', 'payment-processing']);

    const result = findEpic(testDir, 'auth');

    expect(result.found).toBe(false);
    if (!result.found && 'matches' in result) {
      expect(result.matches).toHaveLength(2);
      expect(result.matches.map((m) => m.id)).toContain('user-auth');
      expect(result.matches.map((m) => m.id)).toContain('admin-auth');
    }
  });

  it('should return error when no epics directory', () => {
    // Don't create any .saga directory
    const result = findEpic(testDir, 'anything');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toContain('.saga/epics/');
    }
  });

  it('should return error when no match found', () => {
    setupEpics(['user-authentication']);

    const result = findEpic(testDir, 'nonexistent');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toContain('No epic found');
    }
  });

  it('should find epic with typo using fuzzy matching', () => {
    setupEpics(['user-authentication']);

    // "authentcation" has a typo (missing 'i')
    const result = findEpic(testDir, 'user-authentcation');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.id).toBe('user-authentication');
    }
  });
});

describe('findStory', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-finder-story-test-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * Create a story in .saga/stories/{storyId}/story.json with optional tasks
   */
  function setupStory(
    storyId: string,
    storyData: Record<string, unknown>,
    tasks: Array<{ id: string; status: string }> = [],
    options: { withWorktree?: boolean } = {},
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
  }

  it('should find story by exact ID match', () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      description: 'Add login functionality',
      epic: 'auth-epic',
    });

    const result = findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.storyId).toBe('implement-login');
      expect(result.data.title).toBe('Implement Login Feature');
      expect(result.data.status).toBe('pending'); // no tasks = pending
      expect(result.data.epicId).toBe('auth-epic');
    }
  });

  it('should find story by title match', () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      description: 'Add login functionality',
      epic: 'auth-epic',
    });

    const result = findStory(testDir, 'login feature');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.storyId).toBe('implement-login');
    }
  });

  it('should find story with case-insensitive match', () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      description: 'Add login functionality',
      epic: 'auth-epic',
    });

    const result = findStory(testDir, 'IMPLEMENT-LOGIN');

    expect(result.found).toBe(true);
  });

  it('should normalize underscore to space in query', () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      description: 'Add login functionality',
      epic: 'auth-epic',
    });

    const result = findStory(testDir, 'implement_login');

    expect(result.found).toBe(true);
  });

  it('should include description from story.json', () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      description: 'This story implements the login feature for the application.',
      epic: 'auth-epic',
    });

    const result = findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.description).toBe(
        'This story implements the login feature for the application.',
      );
    }
  });

  it('should return storyPath and worktreePath', () => {
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

    const result = findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.storyPath).toContain('story.json');
      expect(result.data.worktreePath).toContain('implement-login');
    }
  });

  it('should return multiple matches when ambiguous', () => {
    setupStory('login-ui', {
      id: 'login-ui',
      title: 'Login UI',
      description: 'UI for login',
      epic: 'auth-epic',
    });
    setupStory('login-api', {
      id: 'login-api',
      title: 'Login API',
      description: 'API for login',
      epic: 'auth-epic',
    });

    const result = findStory(testDir, 'login');

    expect(result.found).toBe(false);
    if (!result.found && 'matches' in result) {
      expect(result.matches).toHaveLength(2);
    }
  });

  it('should return error when no stories directory', () => {
    const result = findStory(testDir, 'anything');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toMatch(STORIES_ERROR_REGEX);
    }
  });

  it('should return error when no match found', () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      description: 'Login feature',
      epic: 'auth-epic',
    });

    const result = findStory(testDir, 'nonexistent');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toContain('No story found');
    }
  });

  it('should skip stories with invalid story.json (missing id)', () => {
    setupStory('implement-login', {
      title: 'Implement Login',
      description: 'Login feature',
    });

    const result = findStory(testDir, 'implement-login');

    // Story without id fails schema validation and is skipped
    expect(result.found).toBe(false);
  });

  it('should find story with typo using fuzzy matching', () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      description: 'Login feature',
      epic: 'auth-epic',
    });

    // "implment" has a typo (missing 'e')
    const result = findStory(testDir, 'implment-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.storyId).toBe('implement-login');
    }
  });

  it('should find story by fuzzy title match', () => {
    setupStory('implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      description: 'Login feature',
      epic: 'auth-epic',
    });

    // Fuzzy match on title
    const result = findStory(testDir, 'Login Feture');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.storyId).toBe('implement-login');
    }
  });

  it('should filter stories by status', () => {
    setupStory(
      'story-a',
      {
        id: 'story-a',
        title: 'Story A',
        description: 'First story',
        epic: 'test-epic',
      },
      [
        { id: 't1', status: 'completed' },
        { id: 't2', status: 'completed' },
      ],
    );
    setupStory(
      'story-b',
      {
        id: 'story-b',
        title: 'Story B',
        description: 'Second story',
        epic: 'test-epic',
      },
      [{ id: 't1', status: 'in_progress' }],
    );

    const resultCompleted = findStory(testDir, 'story', { status: 'completed' });
    expect(resultCompleted.found).toBe(true);
    if (resultCompleted.found) {
      expect(resultCompleted.data.storyId).toBe('story-a');
    }

    const resultInProgress = findStory(testDir, 'story', { status: 'in_progress' });
    expect(resultInProgress.found).toBe(true);
    if (resultInProgress.found) {
      expect(resultInProgress.data.storyId).toBe('story-b');
    }
  });
});
