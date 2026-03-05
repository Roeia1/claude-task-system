/**
 * Tests for worker.ts entry point - CLI argument parsing and validation
 *
 * Tests the argument parsing logic for the worker script which accepts:
 *   node worker.js <storyId> [options]
 *
 * Options:
 *   --messages-file <path>  Write JSONL message stream to file
 *   --help, -h              Show help message
 *
 * Worker configuration (maxCycles, maxTime, model, etc.) is read from
 * .saga/config.json, not CLI flags.
 */

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Helper to run the worker script with tsx
function runWorker(
  args: string[],
  env: Record<string, string> = {},
): { stdout: string; stderr: string; exitCode: number } {
  const scriptPath = join(__dirname, 'worker.ts');
  try {
    const stdout = execSync(`npx tsx ${scriptPath} ${args.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...env,
        // Set required env vars to avoid early failures unrelated to arg parsing
        SAGA_PROJECT_DIR: '/tmp/fake-project',
        SAGA_PLUGIN_ROOT: '/tmp/fake-plugin',
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

describe('worker CLI', () => {
  describe('help output', () => {
    it('should show usage with --help', () => {
      const result = runWorker(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('story-id');
    });

    it('should show usage with -h', () => {
      const result = runWorker(['-h']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Usage:');
    });
  });

  describe('missing arguments', () => {
    it('should print usage and exit 1 when no arguments provided', () => {
      const result = runWorker([]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Missing required argument');
    });
  });

  describe('argument parsing', () => {
    it('should accept a story ID as positional argument', () => {
      const result = runWorker(['auth-setup-db']);
      expect(result.stderr).not.toContain('Missing required argument');
    });

    it('should reject unknown options', () => {
      const result = runWorker(['auth-setup', '--unknown-flag']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown option');
    });

    it('should reject extra positional arguments', () => {
      const result = runWorker(['auth-setup', 'extra-arg']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unexpected argument');
    });

    it('should reject removed CLI flags', () => {
      const removedFlags = [
        '--max-cycles',
        '--max-time',
        '--model',
        '--max-tasks-per-session',
        '--max-tokens-per-session',
      ];
      for (const flag of removedFlags) {
        const result = runWorker(['my-story', flag, '5']);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Unknown option');
      }
    });
  });

  describe('--messages-file option', () => {
    it('should require a value for --messages-file', () => {
      const result = runWorker(['my-story', '--messages-file']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--messages-file requires a value');
    });

    it('should accept --messages-file with a path', () => {
      const result = runWorker(['my-story', '--messages-file', '/tmp/messages.jsonl']);
      expect(result.stderr).not.toContain('--messages-file requires a value');
      expect(result.stderr).not.toContain('Unknown option');
    });

    it('should accept --messages-file before the positional argument', () => {
      const result = runWorker(['--messages-file', '/tmp/out.jsonl', 'my-story']);
      expect(result.stderr).not.toContain('Missing required argument');
      expect(result.stderr).not.toContain('Unknown option');
    });
  });
});
