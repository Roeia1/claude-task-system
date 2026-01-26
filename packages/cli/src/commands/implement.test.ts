/**
 * Tests for saga implement command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, realpathSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

describe('implement command', () => {
  let testDir: string;
  let cliPath: string;

  beforeEach(() => {
    // Create a temp directory for each test
    // Use realpath to resolve macOS /private/var symlinks
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-implement-test-')));
    cliPath = join(__dirname, '../../dist/cli.cjs');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // Helper to run the CLI
  // Note: We unset SAGA_PLUGIN_ROOT by default to prevent the script from actually running
  // (the implement.py script would try to spawn claude which we don't want in tests)
  function runCli(args: string[], options: { env?: Record<string, string>; timeout?: number } = {}): { stdout: string; stderr: string; exitCode: number } {
    // Create a clean env without SAGA_PLUGIN_ROOT (unless explicitly provided)
    const cleanEnv = { ...process.env };
    delete cleanEnv.SAGA_PLUGIN_ROOT;

    try {
      const stdout = execSync(`node ${cliPath} ${args.join(' ')}`, {
        cwd: testDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...cleanEnv, ...options.env },
        timeout: options.timeout ?? 5000, // 5 second timeout by default
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || '',
        exitCode: error.status || 1,
      };
    }
  }

  // Helper to create a minimal SAGA project structure
  function createSagaProject(dir: string, options: { epicSlug: string; storySlug: string }) {
    const sagaDir = join(dir, '.saga');
    const epicDir = join(sagaDir, 'epics', options.epicSlug);
    const storyDir = join(epicDir, 'stories', options.storySlug);
    const worktreeDir = join(sagaDir, 'worktrees', options.epicSlug, options.storySlug);

    // Create directory structure
    mkdirSync(storyDir, { recursive: true });
    mkdirSync(worktreeDir, { recursive: true });

    // Create minimal story.md
    writeFileSync(join(storyDir, 'story.md'), `---
id: ${options.storySlug}
title: Test Story
status: ready
epic: ${options.epicSlug}
tasks:
  - id: t1
    title: Test Task
    status: pending
---

## Context
Test story for implement command testing.
`);

    // Create story.md in worktree too (mirroring the project structure)
    const worktreeStoryDir = join(worktreeDir, '.saga', 'epics', options.epicSlug, 'stories', options.storySlug);
    mkdirSync(worktreeStoryDir, { recursive: true });
    writeFileSync(join(worktreeStoryDir, 'story.md'), readFileSync(join(storyDir, 'story.md')));

    return { sagaDir, storyDir, worktreeDir };
  }

  describe('argument validation', () => {
    it('should require story-slug argument', () => {
      const result = runCli(['implement']);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("required");
    });

    it('should accept story-slug as positional argument', () => {
      // Create a SAGA project
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      // This will fail because SAGA_PLUGIN_ROOT is not set,
      // but it should get past argument parsing
      const result = runCli(['implement', 'test-story', '--path', testDir]);

      // It should fail on missing SAGA_PLUGIN_ROOT, not argument parsing
      // The error should NOT be about missing required command-line argument
      expect(result.stderr).not.toContain("missing required argument");
      expect(result.stderr).not.toContain("error: required");
      // But it WILL contain "required" in the context of SAGA_PLUGIN_ROOT which is fine
      expect(result.stderr).toContain("SAGA_PLUGIN_ROOT");
    });
  });

  describe('option parsing', () => {
    it('should accept --max-cycles option', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      const result = runCli(['implement', 'test-story', '--max-cycles', '5', '--path', testDir]);

      // Should not fail due to option parsing
      expect(result.stderr).not.toContain("unknown option");
    });

    it('should accept --max-time option', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      const result = runCli(['implement', 'test-story', '--max-time', '30', '--path', testDir]);

      expect(result.stderr).not.toContain("unknown option");
    });

    it('should accept --model option', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      const result = runCli(['implement', 'test-story', '--model', 'sonnet', '--path', testDir]);

      expect(result.stderr).not.toContain("unknown option");
    });
  });

  describe('project discovery', () => {
    it('should fail gracefully when no SAGA project found', () => {
      // testDir has no .saga/ directory
      const result = runCli(['implement', 'some-story']);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toMatch(/not found|does not exist|saga init/i);
    });

    it('should find project using --path option', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      // Create a subdirectory to run from
      const subDir = join(testDir, 'src');
      mkdirSync(subDir, { recursive: true });

      // Run from subDir but specify --path to testDir
      // Note: We unset SAGA_PLUGIN_ROOT to prevent actual script execution
      const cleanEnv = { ...process.env };
      delete cleanEnv.SAGA_PLUGIN_ROOT;

      const result = (() => {
        try {
          const stdout = execSync(`node ${cliPath} implement test-story --path ${testDir}`, {
            cwd: subDir,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 5000,
            env: cleanEnv,
          });
          return { stdout, stderr: '', exitCode: 0 };
        } catch (error: any) {
          return {
            stdout: error.stdout?.toString() || '',
            stderr: error.stderr?.toString() || '',
            exitCode: error.status || 1,
          };
        }
      })();

      // Should not fail on project discovery
      expect(result.stderr).not.toContain("SAGA project not found");
    });
  });

  describe('story resolution', () => {
    it('should report error when story does not exist', () => {
      // Create SAGA structure but no matching story
      mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });

      const result = runCli(['implement', 'non-existent-story', '--path', testDir]);

      expect(result.exitCode).not.toBe(0);
      // Should report story not found
      expect(result.stderr + result.stdout).toMatch(/not found|does not exist|no.*story/i);
    });
  });

  describe('script execution', () => {
    it('should verify implement.py script exists', () => {
      const scriptsDir = join(__dirname, '../../scripts');
      const scriptPath = join(scriptsDir, 'implement.py');

      expect(existsSync(scriptPath)).toBe(true);
    });
  });
});
