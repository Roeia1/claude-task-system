/**
 * Tests for saga find command
 */

import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('find command', () => {
  let testDir: string;
  // Script is built to plugin/scripts/ which is at ../../plugin/scripts/ from packages/plugin-scripts/src/
  const scriptPath = join(__dirname, '..', '..', '..', 'plugin', 'scripts', 'find.js');

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-find-test-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // Helper to run the script
  function runScript(args: string[]): { stdout: string; stderr: string; exitCode: number } {
    try {
      const stdout = execSync(`node ${scriptPath} ${args.join(' ')}`, {
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

  function setupEpic(slug: string): void {
    const epicsDir = join(testDir, '.saga', 'epics');
    mkdirSync(join(epicsDir, slug), { recursive: true });
  }

  function setupStory(
    epicSlug: string,
    storySlug: string,
    frontmatter: Record<string, string>,
    body = '',
  ): void {
    const storyDir = join(
      testDir,
      '.saga',
      'worktrees',
      epicSlug,
      storySlug,
      '.saga',
      'epics',
      epicSlug,
      'stories',
      storySlug,
    );
    mkdirSync(storyDir, { recursive: true });

    const frontmatterStr = Object.entries(frontmatter)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const content = `---\n${frontmatterStr}\n---\n${body}`;
    writeFileSync(join(storyDir, 'story.md'), content);
  }

  describe('story search (default)', () => {
    it('should find story by exact slug', () => {
      setupStory('auth-epic', 'implement-login', {
        id: 'implement-login',
        title: 'Implement Login',
        status: 'draft',
      });

      const result = runScript(['implement-login', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(true);
      expect(output.data.slug).toBe('implement-login');
    });

    it('should output JSON with story data', () => {
      setupStory(
        'auth-epic',
        'implement-login',
        {
          id: 'implement-login',
          title: 'Implement Login Feature',
          status: 'in-progress',
        },
        '## Context\n\nLogin context here.',
      );

      const result = runScript(['implement-login', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(true);
      expect(output.data).toMatchObject({
        slug: 'implement-login',
        title: 'Implement Login Feature',
        status: 'in-progress',
        context: 'Login context here.',
        epicSlug: 'auth-epic',
      });
      expect(output.data.storyPath).toContain('story.md');
      expect(output.data.worktreePath).toContain('implement-login');
    });

    it('should exit 1 when no story found', () => {
      // Create .saga/worktrees dir but no stories
      mkdirSync(join(testDir, '.saga', 'worktrees'), { recursive: true });

      const result = runScript(['nonexistent', '--path', testDir]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(false);
      expect(output.error).toContain('No story found');
    });

    it('should return matches when ambiguous', () => {
      setupStory('auth-epic', 'login-ui', {
        id: 'login-ui',
        title: 'Login UI',
        status: 'draft',
      });
      setupStory('auth-epic', 'login-api', {
        id: 'login-api',
        title: 'Login API',
        status: 'draft',
      });

      const result = runScript(['login', '--path', testDir]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(false);
      expect(output.matches).toHaveLength(2);
    });
  });

  describe('epic search (--type epic)', () => {
    it('should find epic by exact slug', () => {
      setupEpic('user-authentication');

      const result = runScript(['user-authentication', '--type', 'epic', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(true);
      expect(output.data.slug).toBe('user-authentication');
    });

    it('should find epic by partial match', () => {
      setupEpic('user-authentication');

      const result = runScript(['auth', '--type', 'epic', '--path', testDir]);

      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(true);
      expect(output.data.slug).toBe('user-authentication');
    });

    it('should exit 1 when no epic found', () => {
      // Create .saga/epics but no epics
      mkdirSync(join(testDir, '.saga', 'epics'), { recursive: true });

      const result = runScript(['nonexistent', '--type', 'epic', '--path', testDir]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(false);
      expect(output.error).toContain('No epic found');
    });

    it('should return matches when ambiguous', () => {
      setupEpic('user-auth');
      setupEpic('admin-auth');

      const result = runScript(['auth', '--type', 'epic', '--path', testDir]);

      expect(result.exitCode).toBe(1);
      const output = JSON.parse(result.stdout);
      expect(output.found).toBe(false);
      expect(output.matches).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should error when no .saga directory exists', () => {
      const result = runScript(['anything', '--path', testDir]);

      expect(result.exitCode).toBe(1);
    });

    it('should require a query argument', () => {
      const result = runScript(['--path', testDir]);

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
      expect(result.stdout).toContain('--path');
    });
  });
});
