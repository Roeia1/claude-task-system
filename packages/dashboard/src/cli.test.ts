/**
 * Tests for CLI entry point
 * Verifies that the CLI correctly parses arguments and routes to commands
 */

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CLI_PATH = join(import.meta.dirname, '..', 'dist', 'cli.cjs');

/** Regex pattern for semantic version (e.g., 0.1.0) */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * Run the CLI with given arguments and return stdout
 */
function runCli(args: string[]): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    encoding: 'utf-8',
    timeout: 5000,
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status ?? 1,
  };
}

describe('CLI entry point', () => {
  describe('--help', () => {
    it('shows help with available commands', () => {
      const { stdout, exitCode } = runCli(['--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('dashboard');
      expect(stdout).toContain('sessions');
    });

    it('shows global --path option', () => {
      const { stdout } = runCli(['--help']);
      expect(stdout).toContain('--path');
    });

    it('shows --version option', () => {
      const { stdout } = runCli(['--help']);
      expect(stdout).toContain('--version');
    });

    it('does not show removed commands', () => {
      const { stdout } = runCli(['--help']);
      expect(stdout).not.toContain('init');
      expect(stdout).not.toContain('implement');
      expect(stdout).not.toContain('find');
      expect(stdout).not.toContain('worktree');
      expect(stdout).not.toContain('scope-validator');
    });
  });

  describe('--version', () => {
    it('shows version number', () => {
      const { stdout, exitCode } = runCli(['--version']);
      expect(exitCode).toBe(0);
      // Should be semantic version like 0.1.0
      expect(stdout.trim()).toMatch(SEMVER_PATTERN);
    });
  });

  describe('help command', () => {
    it('saga help shows main help', () => {
      const { stdout, exitCode } = runCli(['help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('dashboard');
      expect(stdout).toContain('sessions');
    });

    it('saga help dashboard shows dashboard command help', () => {
      const { stdout, exitCode } = runCli(['help', 'dashboard']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('dashboard');
      expect(stdout).toContain('--port');
    });

    it('saga help sessions shows sessions command help', () => {
      const { stdout, exitCode } = runCli(['help', 'sessions']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('sessions');
      expect(stdout).toContain('list');
      expect(stdout).toContain('status');
      expect(stdout).toContain('logs');
    });
  });

  describe('dashboard command', () => {
    it('has dashboard subcommand', () => {
      const { stdout, exitCode } = runCli(['dashboard', '--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('dashboard');
    });

    it('dashboard --help shows port option', () => {
      const { stdout } = runCli(['dashboard', '--help']);
      expect(stdout).toContain('--port');
    });

    it('dashboard uses global --path option', () => {
      // --path is a global option shown in main help
      const { stdout } = runCli(['--help']);
      expect(stdout).toContain('--path');
    });
  });

  describe('sessions command', () => {
    it('has sessions subcommand', () => {
      const { stdout, exitCode } = runCli(['sessions', '--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('sessions');
    });

    it('sessions --help shows list, status, logs subcommands', () => {
      const { stdout } = runCli(['sessions', '--help']);
      expect(stdout).toContain('list');
      expect(stdout).toContain('status');
      expect(stdout).toContain('logs');
    });

    it('sessions --help does not show kill subcommand', () => {
      const { stdout } = runCli(['sessions', '--help']);
      expect(stdout).not.toContain('kill');
    });
  });

  describe('removed commands', () => {
    it('shows error for removed init command', () => {
      const { stderr, exitCode } = runCli(['init']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown command');
    });

    it('shows error for removed implement command', () => {
      const { stderr, exitCode } = runCli(['implement']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown command');
    });

    it('shows error for removed find command', () => {
      const { stderr, exitCode } = runCli(['find']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown command');
    });

    it('shows error for removed worktree command', () => {
      const { stderr, exitCode } = runCli(['worktree']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown command');
    });

    it('shows error for removed scope-validator command', () => {
      const { stderr, exitCode } = runCli(['scope-validator']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown command');
    });
  });

  describe('unknown commands', () => {
    it('shows error for unknown command', () => {
      const { stderr, exitCode } = runCli(['unknowncommand']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown command');
    });
  });
});
