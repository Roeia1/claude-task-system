/**
 * CLI integration tests for create-story script
 *
 * Tests stdin piping, flag parsing, error cases, and end-to-end execution.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSagaPaths } from '../directory.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('create-story CLI', () => {
  let testDir: string;
  const scriptPath = join(__dirname, 'create-story.ts');

  const validInput = JSON.stringify({
    story: {
      id: 'test-story',
      title: 'Test Story',
      description: 'A test story.',
    },
    tasks: [
      {
        id: 't1',
        subject: 'First task',
        description: 'Do something.',
        status: 'pending',
        blockedBy: [],
      },
    ],
  });

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-create-story-cli-')));

    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });

    writeFileSync(join(testDir, 'README.md'), '# Test\n');
    execSync('git add README.md', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

    const bareDir = join(testDir, '.bare-remote');
    execSync(`git clone --bare . "${bareDir}"`, { cwd: testDir, stdio: 'pipe' });
    execSync(`git remote add origin "${bareDir}"`, { cwd: testDir, stdio: 'pipe' });
    execSync('git fetch origin', { cwd: testDir, stdio: 'pipe' });

    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: testDir,
      encoding: 'utf-8',
    }).trim();
    execSync(`git remote set-head origin ${branch}`, { cwd: testDir, stdio: 'pipe' });

    const sagaPaths = createSagaPaths(testDir);
    mkdirSync(sagaPaths.epics, { recursive: true });
    mkdirSync(sagaPaths.worktrees, { recursive: true });
    mkdirSync(sagaPaths.stories, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function runScript(
    input: string,
    flags: string[] = [],
    opts: { projectDir?: string } = {},
  ): { stdout: string; stderr: string; exitCode: number } {
    const projectDir = opts.projectDir ?? testDir;
    const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';
    const cmd = `echo '${input.replace(/'/g, "'\\''")}' | npx tsx ${scriptPath}${flagStr}`;
    try {
      const stdout = execSync(cmd, {
        cwd: testDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, SAGA_PROJECT_DIR: projectDir },
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      const e = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
      return {
        stdout: e.stdout?.toString() || '',
        stderr: e.stderr?.toString() || '',
        exitCode: e.status || 1,
      };
    }
  }

  function runScriptFromFile(
    inputFilePath: string,
    flags: string[] = [],
    opts: { projectDir?: string } = {},
  ): { stdout: string; stderr: string; exitCode: number } {
    const projectDir = opts.projectDir ?? testDir;
    const allFlags = ['--input', inputFilePath, ...flags];
    const flagStr = allFlags.join(' ');
    const cmd = `npx tsx ${scriptPath} ${flagStr}`;
    try {
      const stdout = execSync(cmd, {
        cwd: testDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, SAGA_PROJECT_DIR: projectDir },
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error) {
      const e = error as { stdout?: Buffer; stderr?: Buffer; status?: number };
      return {
        stdout: e.stdout?.toString() || '',
        stderr: e.stderr?.toString() || '',
        exitCode: e.status || 1,
      };
    }
  }

  describe('successful execution', () => {
    it('should create story from valid stdin JSON', () => {
      const result = runScript(validInput, ['--skip-install', '--skip-pr']);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.storyId).toBe('test-story');
      expect(output.branch).toBe('story/test-story');
      expect(output.prUrl).toBeNull();
    });

    it('should output valid JSON', () => {
      const result = runScript(validInput, ['--skip-install', '--skip-pr']);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });
  });

  describe('flag parsing', () => {
    it('should show help with --help', () => {
      const cmd = `echo '' | npx tsx ${scriptPath} --help`;
      const stdout = execSync(cmd, {
        cwd: testDir,
        encoding: 'utf-8',
        env: { ...process.env, SAGA_PROJECT_DIR: testDir },
      });
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('--skip-install');
      expect(stdout).toContain('--skip-pr');
    });
  });

  describe('error handling', () => {
    it('should fail with invalid JSON on stdin', () => {
      const result = runScript('not json', ['--skip-install', '--skip-pr']);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('Invalid JSON');
    });

    it('should fail when story field is missing', () => {
      const input = JSON.stringify({ tasks: [] });
      const result = runScript(input, ['--skip-install', '--skip-pr']);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('story');
    });

    it('should fail when tasks field is missing', () => {
      const input = JSON.stringify({
        story: { id: 'x', title: 'X', description: 'X' },
      });
      const result = runScript(input, ['--skip-install', '--skip-pr']);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('tasks');
    });

    it('should fail when SAGA_PROJECT_DIR is not set', () => {
      const cmd = `echo '${validInput}' | npx tsx ${scriptPath} --skip-install --skip-pr`;
      try {
        execSync(cmd, {
          cwd: testDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, SAGA_PROJECT_DIR: '' },
        });
        expect.fail('Should have thrown');
      } catch (error) {
        const e = error as { stdout?: Buffer; status?: number };
        const stdout = e.stdout?.toString() || '';
        expect(e.status).not.toBe(0);
        const output = JSON.parse(stdout);
        expect(output.success).toBe(false);
        expect(output.error).toContain('SAGA_PROJECT_DIR');
      }
    });

    it('should fail with invalid story schema', () => {
      const input = JSON.stringify({
        story: { id: 'x' }, // missing title and description
        tasks: [],
      });
      const result = runScript(input, ['--skip-install', '--skip-pr']);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('Invalid story');
    });
  });

  describe('--input flag', () => {
    it('should create story from a JSON file', () => {
      const inputFile = join(testDir, 'story-input.json');
      writeFileSync(inputFile, validInput);

      const result = runScriptFromFile(inputFile, ['--skip-install', '--skip-pr']);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.storyId).toBe('test-story');
      expect(output.branch).toBe('story/test-story');
    });

    it('should handle markdown-heavy descriptions in file input', () => {
      const richInput = JSON.stringify({
        story: {
          id: 'rich-story',
          title: 'Rich Markdown Story',
          description:
            '## Overview\n\nThis story has `backticks`, "quotes", and \'single quotes\'.\n\n```js\nconst x = 1;\n```\n\n- Bullet 1\n- Bullet 2\n',
        },
        tasks: [
          {
            id: 't1',
            subject: 'Task with special chars',
            description: 'Contains $variables and `code blocks`\nand newlines.',
            status: 'pending',
            blockedBy: [],
          },
        ],
      });
      const inputFile = join(testDir, 'rich-input.json');
      writeFileSync(inputFile, richInput);

      const result = runScriptFromFile(inputFile, ['--skip-install', '--skip-pr']);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(true);
      expect(output.storyId).toBe('rich-story');
    });

    it('should fail when input file does not exist', () => {
      const result = runScriptFromFile('/nonexistent/path.json', ['--skip-install', '--skip-pr']);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('Failed to read input file');
    });

    it('should fail with invalid JSON in file', () => {
      const inputFile = join(testDir, 'bad-input.json');
      writeFileSync(inputFile, 'not valid json');

      const result = runScriptFromFile(inputFile, ['--skip-install', '--skip-pr']);

      expect(result.exitCode).not.toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.success).toBe(false);
      expect(output.error).toContain('Invalid JSON in file');
    });
  });
});
