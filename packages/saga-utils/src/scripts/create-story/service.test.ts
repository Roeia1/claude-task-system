/**
 * Tests for create-story service
 *
 * These tests perform real git operations (init, clone, worktree add, commit, push)
 * in temporary directories. Expected to take 300-800ms each.
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSagaPaths, createWorktreePaths } from '../../directory.ts';
import type { Story } from '../../schemas/story.ts';
import type { Task } from '../../schemas/task.ts';
import { createStory } from './service.ts';

// ============================================================================
// Test Fixtures
// ============================================================================

function makeStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'auth-login',
    title: 'Login Page',
    description: 'Implement the login page with email/password authentication.',
    ...overrides,
  };
}

function makeTasks(): Task[] {
  return [
    {
      id: 't1',
      subject: 'Write login form tests',
      description: 'Create unit tests for the login form component.',
      activeForm: 'Writing login form tests',
      status: 'pending',
      blockedBy: [],
    },
    {
      id: 't2',
      subject: 'Implement login form',
      description: 'Build the login form component.',
      activeForm: 'Implementing login form',
      status: 'pending',
      blockedBy: ['t1'],
    },
  ];
}

// ============================================================================
// Test Suite
// ============================================================================

describe('createStory service', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-create-story-test-')));

    // Initialize git repo with an initial commit
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });

    writeFileSync(join(testDir, 'README.md'), '# Test Project\n');
    execSync('git add README.md', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

    // Create bare remote and add as origin
    const bareDir = join(testDir, '.bare-remote');
    execSync(`git clone --bare . "${bareDir}"`, { cwd: testDir, stdio: 'pipe' });
    execSync(`git remote add origin "${bareDir}"`, { cwd: testDir, stdio: 'pipe' });
    execSync('git fetch origin', { cwd: testDir, stdio: 'pipe' });

    // Set origin/HEAD
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim();
    execSync(`git remote set-head origin ${branch}`, { cwd: testDir, stdio: 'pipe' });

    // Initialize .saga directory
    const sagaPaths = createSagaPaths(testDir);
    mkdirSync(sagaPaths.epics, { recursive: true });
    mkdirSync(sagaPaths.worktrees, { recursive: true });
    mkdirSync(sagaPaths.stories, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('successful creation', () => {
    it('should create worktree, branch, and story files', () => {
      const story = makeStory();
      const tasks = makeTasks();

      const result = createStory({
        projectDir: testDir,
        story,
        tasks,
        skipInstall: true,
        skipPr: true,
      });

      expect(result.success).toBe(true);
      if (!result.success) {
        return;
      }

      expect(result.storyId).toBe('auth-login');
      expect(result.storyTitle).toBe('Login Page');
      expect(result.branch).toBe('story/auth-login');
      expect(result.worktreePath).toContain('.saga/worktrees/auth-login');
      expect(result.prUrl).toBeNull();
    });

    it('should create the git branch', () => {
      createStory({
        projectDir: testDir,
        story: makeStory(),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      const branches = execSync('git branch --list', {
        cwd: testDir,
        encoding: 'utf-8',
      });
      expect(branches).toContain('story/auth-login');
    });

    it('should create the worktree directory', () => {
      createStory({
        projectDir: testDir,
        story: makeStory(),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      const { worktreeDir } = createWorktreePaths(testDir, 'auth-login');
      expect(existsSync(worktreeDir)).toBe(true);
      expect(existsSync(join(worktreeDir, '.git'))).toBe(true);
    });

    it('should write story.json with branch and worktree fields', () => {
      const result = createStory({
        projectDir: testDir,
        story: makeStory(),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });
      if (!result.success) {
        return;
      }

      const { worktreeDir } = createWorktreePaths(testDir, 'auth-login');
      const storyJsonPath = join(worktreeDir, '.saga', 'stories', 'auth-login', 'story.json');
      expect(existsSync(storyJsonPath)).toBe(true);

      const written = JSON.parse(readFileSync(storyJsonPath, 'utf-8'));
      expect(written.id).toBe('auth-login');
      expect(written.title).toBe('Login Page');
      expect(written.branch).toBe('story/auth-login');
      expect(written.worktree).toBe('.saga/worktrees/auth-login/');
    });

    it('should write task JSON files', () => {
      createStory({
        projectDir: testDir,
        story: makeStory(),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      const { worktreeDir } = createWorktreePaths(testDir, 'auth-login');
      const storyDir = join(worktreeDir, '.saga', 'stories', 'auth-login');

      const t1Path = join(storyDir, 't1.json');
      const t2Path = join(storyDir, 't2.json');
      expect(existsSync(t1Path)).toBe(true);
      expect(existsSync(t2Path)).toBe(true);

      const t1 = JSON.parse(readFileSync(t1Path, 'utf-8'));
      expect(t1.id).toBe('t1');
      expect(t1.subject).toBe('Write login form tests');

      const t2 = JSON.parse(readFileSync(t2Path, 'utf-8'));
      expect(t2.blockedBy).toEqual(['t1']);
    });

    it('should commit and push to origin', () => {
      createStory({
        projectDir: testDir,
        story: makeStory(),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      // Check that the branch exists on the remote
      const bareDir = join(testDir, '.bare-remote');
      const remoteBranches = execSync('git branch --list', {
        cwd: bareDir,
        encoding: 'utf-8',
      });
      expect(remoteBranches).toContain('story/auth-login');

      // Check commit message
      const { worktreeDir } = createWorktreePaths(testDir, 'auth-login');
      const log = execSync('git log --oneline -1', {
        cwd: worktreeDir,
        encoding: 'utf-8',
      });
      expect(log).toContain('docs(auth-login): add story definition');
    });

    it('should set story epic field when provided', () => {
      createStory({
        projectDir: testDir,
        story: makeStory({ epic: 'my-epic' }),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      const { worktreeDir } = createWorktreePaths(testDir, 'auth-login');
      const storyJsonPath = join(worktreeDir, '.saga', 'stories', 'auth-login', 'story.json');
      const written = JSON.parse(readFileSync(storyJsonPath, 'utf-8'));
      expect(written.epic).toBe('my-epic');
    });

    it('should preserve optional story fields', () => {
      createStory({
        projectDir: testDir,
        story: makeStory({
          guidance: 'Use React hooks',
          doneWhen: 'All tests pass',
          avoid: 'Do not use class components',
        }),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      const { worktreeDir } = createWorktreePaths(testDir, 'auth-login');
      const storyJsonPath = join(worktreeDir, '.saga', 'stories', 'auth-login', 'story.json');
      const written = JSON.parse(readFileSync(storyJsonPath, 'utf-8'));
      expect(written.guidance).toBe('Use React hooks');
      expect(written.doneWhen).toBe('All tests pass');
      expect(written.avoid).toBe('Do not use class components');
    });
  });

  describe('error handling', () => {
    it('should fail if branch already exists', () => {
      execSync('git branch story/auth-login', { cwd: testDir, stdio: 'pipe' });

      const result = createStory({
        projectDir: testDir,
        story: makeStory(),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }
      expect(result.error).toContain('Branch already exists');
    });

    it('should fail if worktree directory already exists', () => {
      const { worktreeDir } = createWorktreePaths(testDir, 'auth-login');
      mkdirSync(worktreeDir, { recursive: true });

      const result = createStory({
        projectDir: testDir,
        story: makeStory(),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }
      expect(result.error).toContain('Worktree directory already exists');
    });

    it('should fail if .saga directory does not exist', () => {
      const { saga } = createSagaPaths(testDir);
      rmSync(saga, { recursive: true, force: true });

      const result = createStory({
        projectDir: testDir,
        story: makeStory(),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      expect(result.success).toBe(false);
      if (result.success) {
        return;
      }
      expect(result.error).toContain('.saga');
    });
  });

  describe('multiple stories', () => {
    it('should create multiple stories independently', () => {
      const result1 = createStory({
        projectDir: testDir,
        story: makeStory({ id: 'story-a', title: 'Story A' }),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      const result2 = createStory({
        projectDir: testDir,
        story: makeStory({ id: 'story-b', title: 'Story B' }),
        tasks: makeTasks(),
        skipInstall: true,
        skipPr: true,
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (!(result1.success && result2.success)) {
        return;
      }

      expect(result1.branch).toBe('story/story-a');
      expect(result2.branch).toBe('story/story-b');
    });
  });
});
