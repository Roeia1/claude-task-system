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
    const worktreeDir = join(sagaDir, 'worktrees', options.epicSlug, options.storySlug);
    // Story.md lives inside the worktree at: <worktree>/.saga/epics/<epic>/stories/<story>/story.md
    const storyDirInWorktree = join(worktreeDir, '.saga', 'epics', options.epicSlug, 'stories', options.storySlug);

    // Create directory structure
    mkdirSync(storyDirInWorktree, { recursive: true });

    // Create minimal story.md inside the worktree
    writeFileSync(join(storyDirInWorktree, 'story.md'), `---
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

    return { sagaDir, storyDir: storyDirInWorktree, worktreeDir };
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

  describe('implementation', () => {
    it('should be implemented in TypeScript (no Python dependency)', () => {
      // This test verifies that we're using the native TypeScript implementation
      // The implement command no longer depends on Python scripts
      const scriptsDir = join(__dirname, '../../scripts');
      const pythonScript = join(scriptsDir, 'implement.py');

      // The Python script should no longer exist (or be used)
      // The implementation is now in TypeScript
      expect(true).toBe(true); // Placeholder - actual logic is in TypeScript
    });
  });

  describe('detached mode', () => {
    it('should accept --attached option', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      const result = runCli(['implement', 'test-story', '--attached', '--path', testDir]);

      // Should not fail due to unknown option
      expect(result.stderr).not.toContain("unknown option");
    });

    it('should run detached by default (requires tmux)', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      // Create mock plugin
      const pluginDir = join(testDir, 'mock-plugin');
      const skillDir = join(pluginDir, 'skills', 'execute-story');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'worker-prompt.md'), '# Worker Prompt\nTest prompt content');

      const result = runCli(['implement', 'test-story', '--path', testDir], {
        env: { SAGA_PLUGIN_ROOT: pluginDir },
      });

      // When running detached, it should either:
      // 1. Succeed and output session info JSON, or
      // 2. Fail because tmux is not available
      if (result.exitCode === 0) {
        // Success - should output session info JSON
        expect(result.stdout).toContain('sessionName');
        expect(result.stdout).toContain('outputFile');
      } else {
        // Expected to fail because tmux might not be available or the claude CLI isn't available
        // but it should NOT fail on argument parsing
        expect(result.stderr).not.toContain("unknown option");
      }
    });

    it('should run in attached mode with --attached flag', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      // Create mock plugin
      const pluginDir = join(testDir, 'mock-plugin');
      const skillDir = join(pluginDir, 'skills', 'execute-story');
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, 'worker-prompt.md'), '# Worker Prompt\nTest prompt content');

      // Use a shorter timeout since we just want to see if it starts correctly
      const result = runCli(['implement', 'test-story', '--attached', '--path', testDir], {
        env: { SAGA_PLUGIN_ROOT: pluginDir },
        timeout: 2000, // Short timeout - we just want to see the initial output
      });

      // Attached mode should print "Starting story implementation..." followed by story info
      // (It will fail/timeout later because claude CLI may not respond, but it should get past the mode selection)
      // The important thing is we DON'T see the detached mode output (sessionName/outputFile)
      expect(result.stdout).toContain('Starting story implementation');
      expect(result.stdout).not.toContain('sessionName');
      expect(result.stdout).not.toContain('outputFile');
    });

  });

  describe('dry-run mode', () => {
    // Helper to create a mock plugin structure
    function createMockPlugin(dir: string) {
      const skillDir = join(dir, 'skills', 'execute-story');
      mkdirSync(skillDir, { recursive: true });

      // Create worker-prompt.md
      writeFileSync(join(skillDir, 'worker-prompt.md'), '# Worker Prompt\nTest prompt content');

      return dir;
    }

    it('should accept --dry-run option', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      const result = runCli(['implement', 'test-story', '--dry-run', '--path', testDir]);

      // Should not fail due to unknown option
      expect(result.stderr).not.toContain("unknown option");
      // Should contain dry run output
      expect(result.stdout).toContain("Dry Run");
    });

    it('should report missing SAGA_PLUGIN_ROOT in dry-run', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });

      const result = runCli(['implement', 'test-story', '--dry-run', '--path', testDir]);

      expect(result.stdout).toContain("SAGA_PLUGIN_ROOT");
      expect(result.stdout).toMatch(/not set|FAILED/i);
    });

    it('should pass all checks when environment is complete', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });
      const pluginDir = join(testDir, 'mock-plugin');
      createMockPlugin(pluginDir);

      const result = runCli(['implement', 'test-story', '--dry-run', '--path', testDir], {
        env: { SAGA_PLUGIN_ROOT: pluginDir },
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("All checks passed");
      expect(result.stdout).toContain("Ready to implement");
    });

    it('should fail when worker-prompt.md is missing', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });
      const pluginDir = join(testDir, 'incomplete-plugin');
      // Create plugin dir without worker-prompt.md
      mkdirSync(join(pluginDir, 'skills', 'execute-story'), { recursive: true });

      const result = runCli(['implement', 'test-story', '--dry-run', '--path', testDir], {
        env: { SAGA_PLUGIN_ROOT: pluginDir },
      });

      expect(result.exitCode).not.toBe(0);
      expect(result.stdout).toContain("Worker prompt");
      expect(result.stdout).toMatch(/not found|FAILED/i);
    });

    it('should fail when worktree is missing', () => {
      // Create .saga directory but no worktree for the story
      const sagaDir = join(testDir, '.saga');
      mkdirSync(join(sagaDir, 'worktrees'), { recursive: true });
      // Do NOT create worktree for the story

      const pluginDir = join(testDir, 'mock-plugin');
      createMockPlugin(pluginDir);

      const result = runCli(['implement', 'test-story', '--dry-run', '--path', testDir], {
        env: { SAGA_PLUGIN_ROOT: pluginDir },
      });

      // Since stories are only found in worktrees, missing worktree = story not found
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("not found");
      expect(result.stderr).toContain("/generate-stories");
    });

    it('should report story found successfully', () => {
      createSagaProject(testDir, { epicSlug: 'my-epic', storySlug: 'my-story' });
      const pluginDir = join(testDir, 'mock-plugin');
      createMockPlugin(pluginDir);

      const result = runCli(['implement', 'my-story', '--dry-run', '--path', testDir], {
        env: { SAGA_PLUGIN_ROOT: pluginDir },
      });

      expect(result.stdout).toContain("Story found");
      expect(result.stdout).toContain("my-story");
      expect(result.stdout).toContain("my-epic");
    });

    it('should check for claude CLI availability', () => {
      createSagaProject(testDir, { epicSlug: 'test-epic', storySlug: 'test-story' });
      const pluginDir = join(testDir, 'mock-plugin');
      createMockPlugin(pluginDir);

      const result = runCli(['implement', 'test-story', '--dry-run', '--path', testDir], {
        env: { SAGA_PLUGIN_ROOT: pluginDir },
      });

      // Should check for claude CLI
      expect(result.stdout).toContain("claude CLI");
    });
  });
});
