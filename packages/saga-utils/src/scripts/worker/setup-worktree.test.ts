/**
 * Tests for worker/setup-worktree.ts - Worktree and branch setup (idempotent)
 *
 * Tests the setupWorktree function which:
 *   - Creates a branch: story/<storyId>
 *   - Creates a worktree: .saga/worktrees/<storyId>/
 *   - Is idempotent: skips if worktree already exists
 *   - Re-creates worktree from existing branch if worktree is missing
 *
 * These tests use real git operations (not mocked).
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setupWorktree } from './setup-worktree.ts';

describe('setupWorktree', () => {
  let testDir: string;

  /**
   * Create a fully initialized git repo with:
   * - An initial commit
   * - A bare remote at .bare-remote
   * - origin pointing at the bare remote
   * - origin/HEAD set
   * - .saga/ directory structure
   */
  function createTestRepo(): string {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-worker-wt-')));

    execSync('git init', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: dir, stdio: 'pipe' });

    writeFileSync(join(dir, 'README.md'), '# Test\n');
    execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: dir, stdio: 'pipe' });

    const bareDir = join(dir, '.bare-remote');
    execSync(`git clone --bare . "${bareDir}"`, { cwd: dir, stdio: 'pipe' });
    execSync(`git remote add origin "${bareDir}"`, { cwd: dir, stdio: 'pipe' });
    execSync('git fetch origin', { cwd: dir, stdio: 'pipe' });

    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: dir,
      encoding: 'utf-8',
    }).trim();
    execSync(`git remote set-head origin ${branch}`, { cwd: dir, stdio: 'pipe' });

    // Create .saga directory structure
    mkdirSync(join(dir, '.saga', 'worktrees'), { recursive: true });
    mkdirSync(join(dir, '.saga', 'stories'), { recursive: true });

    return dir;
  }

  beforeEach(() => {
    testDir = createTestRepo();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should create worktree and branch for a story', () => {
    const result = setupWorktree('auth-setup-db', testDir);

    expect(result.worktreePath).toBe(join(testDir, '.saga', 'worktrees', 'auth-setup-db'));
    expect(result.branch).toBe('story/auth-setup-db');
    expect(result.alreadyExisted).toBe(false);

    // Verify worktree exists on disk
    expect(existsSync(result.worktreePath)).toBe(true);
    expect(existsSync(join(result.worktreePath, '.git'))).toBe(true);

    // Verify branch was created
    const branches = execSync('git branch --list', { cwd: testDir, encoding: 'utf-8' });
    expect(branches).toContain('story/auth-setup-db');
  });

  it('should be idempotent - skip when worktree already exists', () => {
    // First call creates it
    const result1 = setupWorktree('my-story', testDir);
    expect(result1.alreadyExisted).toBe(false);

    // Second call skips creation
    const result2 = setupWorktree('my-story', testDir);
    expect(result2.alreadyExisted).toBe(true);
    expect(result2.worktreePath).toBe(result1.worktreePath);
    expect(result2.branch).toBe(result1.branch);
  });

  it('should re-create worktree from existing branch when worktree is missing', () => {
    // Create the worktree first
    const result1 = setupWorktree('recover-story', testDir);
    expect(result1.alreadyExisted).toBe(false);

    // Remove the worktree directory but keep the branch
    execSync(`git worktree remove "${result1.worktreePath}" --force`, {
      cwd: testDir,
      stdio: 'pipe',
    });
    expect(existsSync(result1.worktreePath)).toBe(false);

    // Verify branch still exists
    const branches = execSync('git branch --list', { cwd: testDir, encoding: 'utf-8' });
    expect(branches).toContain('story/recover-story');

    // Re-create should work and use existing branch
    const result2 = setupWorktree('recover-story', testDir);
    expect(result2.alreadyExisted).toBe(false);
    expect(existsSync(result2.worktreePath)).toBe(true);
  });

  it('should use story/<storyId> branch naming', () => {
    const result = setupWorktree('my-complex-story', testDir);
    expect(result.branch).toBe('story/my-complex-story');
  });

  it('should place worktree at .saga/worktrees/<storyId>/', () => {
    const result = setupWorktree('flat-layout', testDir);
    const expected = join(testDir, '.saga', 'worktrees', 'flat-layout');
    expect(result.worktreePath).toBe(expected);
    expect(existsSync(expected)).toBe(true);
  });

  it('should create parent directories if needed', () => {
    // Remove worktrees dir to test recursive creation
    rmSync(join(testDir, '.saga', 'worktrees'), { recursive: true, force: true });

    const result = setupWorktree('needs-parent', testDir);
    expect(existsSync(result.worktreePath)).toBe(true);
  });

  it('should detect and recreate broken worktree', () => {
    // Create a valid worktree first
    const result1 = setupWorktree('broken-wt', testDir);
    expect(result1.alreadyExisted).toBe(false);

    // Break the worktree by removing it via git and re-creating a plain directory
    execSync(`git worktree remove "${result1.worktreePath}" --force`, {
      cwd: testDir,
      stdio: 'pipe',
    });
    mkdirSync(result1.worktreePath, { recursive: true });
    // Write a broken .git file (not a valid gitdir reference)
    writeFileSync(join(result1.worktreePath, '.git'), 'gitdir: /nonexistent/path');

    // setupWorktree should detect the broken worktree and recreate it
    const result2 = setupWorktree('broken-wt', testDir);
    expect(result2.alreadyExisted).toBe(false);
    expect(existsSync(result2.worktreePath)).toBe(true);

    // Verify the worktree is now valid
    const gitDir = execSync('git rev-parse --git-dir', {
      cwd: result2.worktreePath,
      encoding: 'utf-8',
    }).trim();
    expect(gitDir).toBeTruthy();
  });

  it('should handle multiple worktrees for different stories', () => {
    const result1 = setupWorktree('story-a', testDir);
    const result2 = setupWorktree('story-b', testDir);

    expect(result1.worktreePath).not.toBe(result2.worktreePath);
    expect(result1.branch).toBe('story/story-a');
    expect(result2.branch).toBe('story/story-b');
    expect(existsSync(result1.worktreePath)).toBe(true);
    expect(existsSync(result2.worktreePath)).toBe(true);
  });
});
