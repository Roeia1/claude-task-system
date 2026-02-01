/**
 * Tests for saga worktree command
 *
 * Note: These tests perform real git operations (init, clone, worktree add, etc.)
 * and are expected to take 300-800ms each. This is intentional as we're testing
 * actual git worktree functionality, not mocked operations.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('worktree command', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temp directory for each test
    // Use realpath to resolve macOS /private/var symlinks
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-worktree-test-')));

    // Initialize as a git repository with an initial commit
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', {
      cwd: testDir,
      stdio: 'pipe',
    });
    execSync('git config user.name "Test User"', {
      cwd: testDir,
      stdio: 'pipe',
    });

    // Create initial commit (required for worktrees)
    writeFileSync(join(testDir, 'README.md'), '# Test Project\n');
    execSync('git add README.md', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

    // Create a fake remote to simulate origin/main
    // We'll use a bare repo as the "remote"
    const bareDir = join(testDir, '.bare-remote');
    execSync(`git clone --bare . "${bareDir}"`, { cwd: testDir, stdio: 'pipe' });
    execSync(`git remote add origin "${bareDir}"`, {
      cwd: testDir,
      stdio: 'pipe',
    });
    execSync('git fetch origin', { cwd: testDir, stdio: 'pipe' });

    // Set up origin/HEAD to point to main (or master)
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim();
    execSync(`git remote set-head origin ${branch}`, {
      cwd: testDir,
      stdio: 'pipe',
    });

    // Initialize .saga directory
    mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });
    mkdirSync(join(testDir, '.saga', 'worktrees'), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // Helper to run the CLI
  function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
    const cliPath = join(__dirname, '../../dist/cli.cjs');
    try {
      const stdout = execSync(`node ${cliPath} ${args.join(' ')}`, {
        cwd: testDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      const spawnError = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
      return {
        stdout: spawnError.stdout?.toString() || '',
        stderr: spawnError.stderr?.toString() || '',
        exitCode: spawnError.status || 1,
      };
    }
  }

  describe('successful worktree creation', () => {
    it('should create worktree and branch', () => {
      const result = runCli(['worktree', 'my-epic', 'my-story', '--path', testDir]);

      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.branch).toBe('story-my-story-epic-my-epic');
      expect(output.worktreePath).toContain('.saga/worktrees/my-epic/my-story');
    });

    it('should create worktree directory on disk', () => {
      runCli(['worktree', 'my-epic', 'my-story', '--path', testDir]);

      const worktreePath = join(testDir, '.saga', 'worktrees', 'my-epic', 'my-story');
      expect(existsSync(worktreePath)).toBe(true);
      expect(existsSync(join(worktreePath, '.git'))).toBe(true);
    });

    it('should create git branch', () => {
      runCli(['worktree', 'my-epic', 'my-story', '--path', testDir]);

      // Check branch exists
      const branches = execSync('git branch --list', {
        cwd: testDir,
        encoding: 'utf-8',
      });
      expect(branches).toContain('story-my-story-epic-my-epic');
    });

    it('should output valid JSON', () => {
      const result = runCli(['worktree', 'my-epic', 'my-story', '--path', testDir]);

      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should fail if branch already exists', () => {
      // Create the branch first
      execSync('git branch story-my-story-epic-my-epic', {
        cwd: testDir,
        stdio: 'pipe',
      });

      const result = runCli(['worktree', 'my-epic', 'my-story', '--path', testDir]);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('Branch already exists');
    });

    it('should fail if worktree directory already exists', () => {
      // Create the worktree directory first
      const worktreePath = join(testDir, '.saga', 'worktrees', 'my-epic', 'my-story');
      mkdirSync(worktreePath, { recursive: true });

      const result = runCli(['worktree', 'my-epic', 'my-story', '--path', testDir]);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('Worktree directory already exists');
    });

    it('should fail if .saga directory does not exist', () => {
      // Remove .saga directory
      rmSync(join(testDir, '.saga'), { recursive: true, force: true });

      const result = runCli(['worktree', 'my-epic', 'my-story', '--path', testDir]);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('.saga');
    });

    it('should fail with non-existent path', () => {
      const nonExistent = join(testDir, 'does-not-exist');
      const result = runCli(['worktree', 'my-epic', 'my-story', '--path', nonExistent]);

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('branch naming', () => {
    it('should use correct branch naming convention', () => {
      const result = runCli(['worktree', 'auth-system', 'login-form', '--path', testDir]);

      const output = JSON.parse(result.stdout);
      expect(output.branch).toBe('story-login-form-epic-auth-system');
    });

    it('should handle slugs with hyphens', () => {
      const result = runCli(['worktree', 'my-complex-epic', 'my-complex-story', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.branch).toBe('story-my-complex-story-epic-my-complex-epic');
    });
  });

  describe('worktree path', () => {
    it('should create worktree at correct location', () => {
      const result = runCli(['worktree', 'auth', 'login', '--path', testDir]);

      const output = JSON.parse(result.stdout);
      expect(output.worktreePath).toBe(join(testDir, '.saga', 'worktrees', 'auth', 'login'));
    });

    it('should create parent directories if needed', () => {
      // Worktrees dir exists but epic subdir doesn't
      const result = runCli(['worktree', 'new-epic', 'new-story', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      expect(existsSync(join(testDir, '.saga', 'worktrees', 'new-epic', 'new-story'))).toBe(true);
    });
  });

  describe('multiple worktrees', () => {
    it('should allow creating multiple worktrees for same epic', () => {
      const result1 = runCli(['worktree', 'my-epic', 'story-1', '--path', testDir]);
      const result2 = runCli(['worktree', 'my-epic', 'story-2', '--path', testDir]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);

      const output1 = JSON.parse(result1.stdout);
      const output2 = JSON.parse(result2.stdout);

      expect(output1.branch).toBe('story-story-1-epic-my-epic');
      expect(output2.branch).toBe('story-story-2-epic-my-epic');
    });

    it('should allow creating worktrees for different epics', () => {
      const result1 = runCli(['worktree', 'epic-1', 'story-a', '--path', testDir]);
      const result2 = runCli(['worktree', 'epic-2', 'story-b', '--path', testDir]);

      expect(result1.exitCode).toBe(0);
      expect(result2.exitCode).toBe(0);
    });
  });
});
