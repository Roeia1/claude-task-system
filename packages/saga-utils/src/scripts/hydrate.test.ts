/**
 * Tests for hydrate CLI entry point
 *
 * Tests the CLI argument parsing and JSON output format of the hydrate script.
 * The hydration service itself is tested separately in hydrate/service.test.ts.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TASK_LIST_ID_PATTERN = /^saga__test-story__\d+$/;
const EXPECTED_MULTI_TASK_COUNT = 3;

describe('hydrate CLI', () => {
  let testDir: string;
  let claudeTasksDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-hydrate-test-')));
    claudeTasksDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-claude-tasks-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    rmSync(claudeTasksDir, { recursive: true, force: true });
  });

  function runScript(
    args: string[],
    options: { projectDir?: string; claudeTasksBase?: string } = {},
  ): { stdout: string; stderr: string; exitCode: number } {
    const scriptPath = join(__dirname, 'hydrate.ts');
    const projectDir = options.projectDir ?? testDir;
    const claudeTasksBase = options.claudeTasksBase ?? claudeTasksDir;
    try {
      const stdout = execSync(`npx tsx ${scriptPath} ${args.join(' ')}`, {
        cwd: testDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          SAGA_PROJECT_DIR: projectDir,
          SAGA_CLAUDE_TASKS_BASE: claudeTasksBase,
        },
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

  /**
   * Helper to set up a valid story directory with story.json and task files.
   */
  function setupStory(
    storyId: string,
    tasks: Array<{
      id: string;
      subject: string;
      description: string;
      status: string;
      blockedBy: string[];
    }>,
  ): void {
    const storyDir = join(testDir, '.saga', 'stories', storyId);
    mkdirSync(storyDir, { recursive: true });

    // Write story.json
    writeFileSync(
      join(storyDir, 'story.json'),
      JSON.stringify({
        id: storyId,
        title: 'Test Story',
        description: 'A test story for hydration',
        guidance: 'Follow TDD',
        doneWhen: 'All tests pass',
        avoid: 'Over-engineering',
      }),
    );

    // Write task files
    for (const task of tasks) {
      writeFileSync(join(storyDir, `${task.id}.json`), JSON.stringify(task));
    }
  }

  describe('argument parsing', () => {
    it('should require storyId argument', () => {
      const result = runScript([]);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('story-id');
    });

    it('should show help with --help', () => {
      const result = runScript(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage');
      expect(result.stdout).toContain('story-id');
    });
  });

  describe('successful hydration', () => {
    it('should output valid JSON on success', () => {
      setupStory('test-story', [
        {
          id: 't1',
          subject: 'Task 1',
          description: 'First task',
          status: 'pending',
          blockedBy: [],
        },
      ]);

      const result = runScript(['test-story', '1700000000000']);
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.taskListId).toBe('saga__test-story__1700000000000');
      expect(output.taskCount).toBe(1);
      expect(output.storyMeta).toBeDefined();
      expect(output.storyMeta.title).toBe('Test Story');
    });

    it('should use default timestamp when not provided', () => {
      setupStory('test-story', [
        {
          id: 't1',
          subject: 'Task 1',
          description: 'First task',
          status: 'pending',
          blockedBy: [],
        },
      ]);

      const result = runScript(['test-story']);
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.taskListId).toMatch(TASK_LIST_ID_PATTERN);
    });

    it('should hydrate multiple tasks', () => {
      setupStory('test-story', [
        {
          id: 't1',
          subject: 'Task 1',
          description: 'First task',
          status: 'pending',
          blockedBy: [],
        },
        {
          id: 't2',
          subject: 'Task 2',
          description: 'Second task',
          status: 'pending',
          blockedBy: ['t1'],
        },
        {
          id: 't3',
          subject: 'Task 3',
          description: 'Third task',
          status: 'completed',
          blockedBy: [],
        },
      ]);

      const result = runScript(['test-story', '1700000000000']);
      expect(result.exitCode).toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.taskCount).toBe(EXPECTED_MULTI_TASK_COUNT);
    });
  });

  describe('error cases', () => {
    it('should output error JSON when story directory does not exist', () => {
      const result = runScript(['nonexistent-story', '1700000000000']);
      expect(result.exitCode).not.toBe(0);

      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toBeDefined();
    });

    it('should output error JSON when SAGA_PROJECT_DIR is not set', () => {
      const scriptPath = join(__dirname, 'hydrate.ts');
      try {
        execSync(`npx tsx ${scriptPath} test-story`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            SAGA_PROJECT_DIR: '',
            SAGA_CLAUDE_TASKS_BASE: claudeTasksDir,
          },
        });
        expect.unreachable('Should have thrown');
      } catch (error) {
        const spawnError = error as { status?: number; stdout?: Buffer };
        expect(spawnError.status).not.toBe(0);
      }
    });
  });
});
