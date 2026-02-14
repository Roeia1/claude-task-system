/**
 * Tests for worker.ts entry point - CLI argument parsing and validation
 *
 * Tests the argument parsing logic for the worker script which accepts:
 *   node worker.js <storyId> [options]
 *
 * Options:
 *   --max-cycles <n>    Maximum worker cycles (default: 10)
 *   --max-time <n>      Maximum time in minutes (default: 60)
 *   --model <model>     Model to use (default: opus)
 *   --help, -h          Show help message
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
      // The worker will fail later (no real project) but arg parsing should succeed
      // We verify by checking it does NOT print the "missing argument" error
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
  });

  describe('--max-cycles option', () => {
    it('should require a value for --max-cycles', () => {
      const result = runWorker(['my-story', '--max-cycles']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--max-cycles requires a value');
    });

    it('should reject non-numeric --max-cycles', () => {
      const result = runWorker(['my-story', '--max-cycles', 'abc']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('must be a positive integer');
    });

    it('should reject zero --max-cycles', () => {
      const result = runWorker(['my-story', '--max-cycles', '0']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('must be a positive integer');
    });

    it('should reject negative --max-cycles', () => {
      const result = runWorker(['my-story', '--max-cycles', '-5']);
      expect(result.exitCode).toBe(1);
    });
  });

  describe('--max-time option', () => {
    it('should require a value for --max-time', () => {
      const result = runWorker(['my-story', '--max-time']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--max-time requires a value');
    });

    it('should reject non-numeric --max-time', () => {
      const result = runWorker(['my-story', '--max-time', 'abc']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('must be a positive integer');
    });
  });

  describe('--model option', () => {
    it('should require a value for --model', () => {
      const result = runWorker(['my-story', '--model']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('--model requires a value');
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
  });

  describe('combined options', () => {
    it('should accept all options together', () => {
      const result = runWorker([
        'my-story',
        '--max-cycles',
        '5',
        '--max-time',
        '30',
        '--model',
        'sonnet',
      ]);
      // Should not fail on argument parsing (may fail later on pipeline execution)
      expect(result.stderr).not.toContain('Missing required argument');
      expect(result.stderr).not.toContain('Unknown option');
    });

    it('should accept options before the positional argument', () => {
      const result = runWorker(['--max-cycles', '5', 'my-story']);
      expect(result.stderr).not.toContain('Missing required argument');
      expect(result.stderr).not.toContain('Unknown option');
    });
  });
});
