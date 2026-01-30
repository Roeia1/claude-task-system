/**
 * Tests for saga init command
 */

import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('init command', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temp directory for each test
    // Use realpath to resolve macOS /private/var symlinks
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-init-test-')));
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

  describe('with --path option', () => {
    it('should initialize .saga/ structure at specified path', () => {
      const result = runCli(['init', '--path', testDir]);

      // Check that .saga structure was created
      const sagaDir = join(testDir, '.saga');
      const epicsDir = join(sagaDir, 'epics');
      const archiveDir = join(sagaDir, 'archive');
      const worktreesDir = join(sagaDir, 'worktrees');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('.saga');
      expect(require('node:fs').existsSync(epicsDir)).toBe(true);
      expect(require('node:fs').existsSync(archiveDir)).toBe(true);
      expect(require('node:fs').existsSync(worktreesDir)).toBe(true);
    });

    it('should update .gitignore with worktrees pattern', () => {
      // Create an existing .gitignore
      writeFileSync(join(testDir, '.gitignore'), 'node_modules/\n');

      const result = runCli(['init', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      const gitignore = readFileSync(join(testDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.saga/worktrees/');
    });

    it('should create .gitignore if it does not exist', () => {
      const result = runCli(['init', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      const gitignore = readFileSync(join(testDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.saga/worktrees/');
    });

    it('should not duplicate worktrees pattern if already present', () => {
      // Create a .gitignore that already has the pattern
      writeFileSync(join(testDir, '.gitignore'), '.saga/worktrees/\n');

      const result = runCli(['init', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      const gitignore = readFileSync(join(testDir, '.gitignore'), 'utf-8');
      // Count occurrences
      const matches = gitignore.match(/\.saga\/worktrees\//g);
      expect(matches?.length).toBe(1);
    });

    it('should fail with non-existent path', () => {
      const nonExistent = join(testDir, 'does-not-exist');
      const result = runCli(['init', '--path', nonExistent]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('does not exist');
    });
  });

  describe('with project discovery', () => {
    it('should initialize when run from project root without .saga/', () => {
      // testDir is the project root, no .saga yet
      const result = runCli(['init']);

      expect(result.exitCode).toBe(0);
      expect(require('node:fs').existsSync(join(testDir, '.saga', 'epics'))).toBe(true);
    });

    it('should initialize from subdirectory when no .saga/ exists yet', () => {
      // Create a subdirectory
      const subDir = join(testDir, 'src', 'components');
      mkdirSync(subDir, { recursive: true });

      // For init without existing .saga/, it should initialize at cwd
      // (since there's no .saga to discover, it uses current dir)
      const cliPath = join(__dirname, '../../dist/cli.cjs');
      try {
        const _stdout = execSync(`node ${cliPath} init`, {
          cwd: subDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        // It should initialize at the subDir since no parent .saga exists
        expect(require('node:fs').existsSync(join(subDir, '.saga', 'epics'))).toBe(true);
      } catch (error) {
        // If it fails, check why
        const execError = error as { status?: number };
        expect(execError.status).toBe(0);
      }
    });

    it('should find existing .saga/ from subdirectory and report it', () => {
      // Initialize first
      runCli(['init', '--path', testDir]);

      // Create a subdirectory
      const subDir = join(testDir, 'src', 'components');
      mkdirSync(subDir, { recursive: true });

      // Run init from subdirectory - should find existing .saga
      const cliPath = join(__dirname, '../../dist/cli.cjs');
      const result = execSync(`node ${cliPath} init`, {
        cwd: subDir,
        encoding: 'utf-8',
      });

      expect(result).toContain('.saga');
    });
  });

  describe('output and error handling', () => {
    it('should display script output to user', () => {
      const result = runCli(['init', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Created');
    });

    it('should report errors with helpful messages', () => {
      // Try to initialize at a file instead of directory
      const filePath = join(testDir, 'not-a-dir.txt');
      writeFileSync(filePath, 'content');

      const result = runCli(['init', '--path', filePath]);

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('dry-run mode', () => {
    it('should accept --dry-run option', () => {
      const result = runCli(['init', '--dry-run', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toContain('unknown option');
      expect(result.stdout).toContain('Dry Run');
    });

    it('should not create directories in dry-run mode', () => {
      const result = runCli(['init', '--dry-run', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      // Directories should NOT exist
      expect(require('node:fs').existsSync(join(testDir, '.saga'))).toBe(false);
    });

    it('should show what directories would be created', () => {
      const result = runCli(['init', '--dry-run', '--path', testDir]);

      expect(result.stdout).toContain('epics');
      expect(result.stdout).toContain('archive');
      expect(result.stdout).toContain('worktrees');
      expect(result.stdout).toContain('will create');
    });

    it('should show existing directories as skip', () => {
      // Create .saga structure first
      mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });

      const result = runCli(['init', '--dry-run', '--path', testDir]);

      expect(result.stdout).toContain('epics');
      expect(result.stdout).toMatch(/exists.*skip/i);
    });

    it('should show gitignore action', () => {
      const result = runCli(['init', '--dry-run', '--path', testDir]);

      expect(result.stdout).toContain('.gitignore');
      expect(result.stdout).toContain('worktrees pattern');
    });

    it('should indicate when gitignore already has pattern', () => {
      // Create .gitignore with pattern
      writeFileSync(join(testDir, '.gitignore'), '.saga/worktrees/\n');

      const result = runCli(['init', '--dry-run', '--path', testDir]);

      expect(result.stdout).toContain('already has pattern');
    });

    it('should show no changes made message', () => {
      const result = runCli(['init', '--dry-run', '--path', testDir]);

      expect(result.stdout).toContain('No changes made');
    });
  });
});
