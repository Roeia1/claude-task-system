/**
 * Tests for saga find command (integration tests against compiled find.js)
 */

import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSagaPaths, createStoryPaths } from '../directory.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('find command', () => {
  let testDir: string;
  // Script is built to plugin/scripts/ which is at ../../../../plugin/scripts/ from packages/saga-utils/src/scripts/
  const scriptPath = join(__dirname, '..', '..', '..', '..', 'plugin', 'scripts', 'find.js');

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-find-test-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // Helper to run the script with SAGA_PROJECT_DIR set
  function runScript(args: string[]): {
    stdout: string;
    stderr: string;
    exitCode: number;
  } {
    try {
      const stdout = execSync(`node ${scriptPath} ${args.join(' ')}`, {
        cwd: testDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, SAGA_PROJECT_DIR: testDir },
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      const spawnError = error as {
        stdout?: Buffer;
        stderr?: Buffer;
        status?: number;
      };
      return {
        stdout: spawnError.stdout?.toString() || '',
        stderr: spawnError.stderr?.toString() || '',
        exitCode: spawnError.status || 1,
      };
    }
  }

  function setupEpic(epicId: string): void {
    const { epics } = createSagaPaths(testDir);
    mkdirSync(epics, { recursive: true });
    writeFileSync(
      join(epics, `${epicId}.json`),
      JSON.stringify({
        id: epicId,
        title: epicId,
        description: `Epic ${epicId}`,
        children: [],
      }),
    );
  }

  function setupStory(
    storyId: string,
    storyData: Record<string, unknown>,
    tasks: Array<{ id: string; status: string }> = [],
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
  }

  describe('story search (default)', () => {
    it('should find story by exact ID', () => {
      setupStory('implement-login', {
        id: 'implement-login',
        title: 'Implement Login',
        description: 'Add login functionality',
        epic: 'auth-epic',
      });

      const result = runScript(['implement-login']);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(true);
      expect(output.data.storyId).toBe('implement-login');
    });

    it('should output JSON with story data', () => {
      setupStory(
        'implement-login',
        {
          id: 'implement-login',
          title: 'Implement Login Feature',
          description: 'Login context here.',
          epic: 'auth-epic',
        },
        [{ id: 't1', status: 'in_progress' }],
      );

      const result = runScript(['implement-login']);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(true);
      expect(output.data).toMatchObject({
        storyId: 'implement-login',
        title: 'Implement Login Feature',
        status: 'in_progress',
        description: 'Login context here.',
        epicId: 'auth-epic',
      });
      expect(output.data.storyPath).toContain('story.json');
    });

    it('should exit 1 when no story found', () => {
      // Create .saga/stories dir but no stories
      const { stories } = createSagaPaths(testDir);
      mkdirSync(stories, { recursive: true });

      const result = runScript(['nonexistent']);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(false);
      expect(output.error).toContain('No story found');
    });

    it('should return matches when ambiguous', () => {
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

      const result = runScript(['login']);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(false);
      expect(output.matches).toHaveLength(2);
    });
  });

  describe('epic search (--type epic)', () => {
    it('should find epic by exact ID', () => {
      setupEpic('user-authentication');

      const result = runScript(['user-authentication', '--type', 'epic']);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(true);
      expect(output.data.id).toBe('user-authentication');
    });

    it('should find epic by partial match', () => {
      setupEpic('user-authentication');

      const result = runScript(['auth', '--type', 'epic']);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(true);
      expect(output.data.id).toBe('user-authentication');
    });

    it('should exit 1 when no epic found', () => {
      // Create .saga/epics but no epics
      const { epics } = createSagaPaths(testDir);
      mkdirSync(epics, { recursive: true });

      const result = runScript(['nonexistent', '--type', 'epic']);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(false);
      expect(output.error).toContain('No epic found');
    });

    it('should return matches when ambiguous', () => {
      setupEpic('user-auth');
      setupEpic('admin-auth');

      const result = runScript(['auth', '--type', 'epic']);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(false);
      expect(output.matches).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should error when no .saga directory exists', () => {
      const result = runScript(['anything']);

      expect(result.exitCode).toBe(1);
    });

    it('should require a query argument', () => {
      const result = runScript([]);

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('help', () => {
    it('should show usage with --help', () => {
      const result = runScript(['--help']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('--type');
      expect(result.stdout).toContain('--status');
      expect(result.stdout).toContain('SAGA_PROJECT_DIR');
    });
  });
});
