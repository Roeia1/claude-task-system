/**
 * Tests for sessions-kill script
 *
 * Tests the CLI interface. The script terminates tmux sessions.
 * Unit tests for the killSession function are tested via CLI integration
 * since the script runs main() on import.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, '../../../../plugin/scripts/sessions-kill.js');

describe('sessions-kill CLI', () => {
  describe('--help', () => {
    it('should show usage with --help', () => {
      const result = spawnSync('node', [scriptPath, '--help'], {
        encoding: 'utf-8',
      });

      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('sessions-kill');
      expect(result.stdout).toContain('session-name');
      expect(result.status).toBe(0);
    });

    it('should show usage with -h', () => {
      const result = spawnSync('node', [scriptPath, '-h'], {
        encoding: 'utf-8',
      });

      expect(result.stdout).toContain('Usage:');
      expect(result.status).toBe(0);
    });
  });

  describe('argument validation', () => {
    it('should show error when no session name provided', () => {
      const result = spawnSync('node', [scriptPath], {
        encoding: 'utf-8',
      });

      expect(result.stderr).toContain('Error');
      expect(result.stderr).toContain('session-name');
      expect(result.status).toBe(1);
    });
  });

  describe('kill functionality', () => {
    it('should output JSON result when killing non-existent session', () => {
      // Use a fake session name that won't exist
      const result = spawnSync('node', [scriptPath, 'saga__fake-epic__fake-story__9999999999'], {
        encoding: 'utf-8',
      });

      // Parse the output - should be valid JSON
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('killed');
      expect(typeof output.killed).toBe('boolean');
      // The session doesn't exist, so killed should be false
      expect(output.killed).toBe(false);
      expect(result.status).toBe(0);
    });

    it('should handle session names with hyphens', () => {
      const result = spawnSync(
        'node',
        [scriptPath, 'saga__my-epic-name__my-story-name__1234567890'],
        {
          encoding: 'utf-8',
        },
      );

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('killed');
      expect(output.killed).toBe(false); // Session doesn't exist
      expect(result.status).toBe(0);
    });

    it('should handle simple session names', () => {
      const result = spawnSync('node', [scriptPath, 'saga__test-session'], {
        encoding: 'utf-8',
      });

      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty('killed');
      expect(output.killed).toBe(false); // Session doesn't exist
      expect(result.status).toBe(0);
    });
  });

  describe('JSON output format', () => {
    it('should output formatted JSON with indentation', () => {
      const result = spawnSync('node', [scriptPath, 'saga__test__test__1234'], {
        encoding: 'utf-8',
      });

      // Should be formatted with newlines and indentation
      expect(result.stdout).toContain('{\n');
      expect(result.stdout).toContain('"killed"');
    });

    it('should only contain killed property', () => {
      const result = spawnSync('node', [scriptPath, 'saga__test__test__1234'], {
        encoding: 'utf-8',
      });

      const output = JSON.parse(result.stdout);
      const keys = Object.keys(output);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe('killed');
    });
  });
});
