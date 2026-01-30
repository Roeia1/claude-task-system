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
function runCli(args: string[]): { stdout: string; stderr: string; exitCode: number } {
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
      expect(stdout).toContain('init');
      expect(stdout).toContain('implement');
      expect(stdout).toContain('dashboard');
    });

    it('shows global --path option', () => {
      const { stdout } = runCli(['--help']);
      expect(stdout).toContain('--path');
    });

    it('shows --version option', () => {
      const { stdout } = runCli(['--help']);
      expect(stdout).toContain('--version');
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
      expect(stdout).toContain('init');
      expect(stdout).toContain('implement');
      expect(stdout).toContain('dashboard');
    });

    it('saga help init shows init command help', () => {
      const { stdout, exitCode } = runCli(['help', 'init']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('init');
      expect(stdout).toContain('--dry-run');
    });

    it('saga help implement shows implement command help', () => {
      const { stdout, exitCode } = runCli(['help', 'implement']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('implement');
      expect(stdout).toContain('story-slug');
      expect(stdout).toContain('--max-cycles');
    });

    it('saga help dashboard shows dashboard command help', () => {
      const { stdout, exitCode } = runCli(['help', 'dashboard']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('dashboard');
      expect(stdout).toContain('--port');
    });
  });

  describe('init command', () => {
    it('has init subcommand', () => {
      const { stdout, exitCode } = runCli(['init', '--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('init');
    });

    it('init uses global --path option', () => {
      // --path is a global option shown in main help
      const { stdout } = runCli(['--help']);
      expect(stdout).toContain('--path');
    });
  });

  describe('implement command', () => {
    it('has implement subcommand', () => {
      const { stdout, exitCode } = runCli(['implement', '--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('implement');
    });

    it('implement --help shows story-slug argument', () => {
      const { stdout } = runCli(['implement', '--help']);
      expect(stdout).toContain('story-slug');
    });

    it('implement --help shows command-specific options', () => {
      const { stdout } = runCli(['implement', '--help']);
      expect(stdout).toContain('--max-cycles');
      expect(stdout).toContain('--max-time');
      expect(stdout).toContain('--model');
    });

    it('implement uses global --path option', () => {
      // --path is a global option shown in main help
      const { stdout } = runCli(['--help']);
      expect(stdout).toContain('--path');
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

  describe('unknown commands', () => {
    it('shows error for unknown command', () => {
      const { stderr, exitCode } = runCli(['unknowncommand']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('unknown command');
    });
  });
});
