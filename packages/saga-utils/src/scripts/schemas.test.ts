/**
 * Tests for schemas script - LLM-readable schema documentation
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = join(__dirname, '../../../../plugin/scripts/schemas.js');

const JSON_BLOCK_PATTERN = /```json\n([\s\S]*?)```/;
const EPIC_OPTIONAL_PATTERN = /`epic`\s*\|[^|]+\|\s*no/;

function runScript(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('node', [scriptPath, ...args], { encoding: 'utf-8' });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

describe('schemas script', () => {
  describe('--help', () => {
    it('should show usage with --help', () => {
      const result = runScript(['--help']);
      expect(result.stdout).toContain('Usage:');
      expect(result.stdout).toContain('epic');
      expect(result.stdout).toContain('story');
      expect(result.stdout).toContain('task');
      expect(result.status).toBe(0);
    });

    it('should show usage when no args given', () => {
      const result = runScript([]);
      expect(result.stdout).toContain('Usage:');
      expect(result.status).toBe(0);
    });
  });

  describe('epic schema', () => {
    it('should output markdown with fields table', () => {
      const result = runScript(['epic']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Epic Schema');
      expect(result.stdout).toContain('| Field | Type | Required | Description |');
      expect(result.stdout).toContain('`id`');
      expect(result.stdout).toContain('`title`');
      expect(result.stdout).toContain('`description`');
      expect(result.stdout).toContain('`children`');
    });

    it('should include nested children schema', () => {
      const result = runScript(['epic']);
      expect(result.stdout).toContain('### children[]');
      expect(result.stdout).toContain('`blockedBy`');
    });

    it('should include JSON example', () => {
      const result = runScript(['epic']);
      expect(result.stdout).toContain('## Example');
      expect(result.stdout).toContain('```json');
      const jsonMatch = result.stdout.match(JSON_BLOCK_PATTERN);
      expect(jsonMatch).toBeTruthy();
      const parsed = JSON.parse(jsonMatch?.[1] ?? '{}');
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('title');
      expect(parsed).toHaveProperty('children');
    });
  });

  describe('story schema', () => {
    it('should output markdown with all fields', () => {
      const result = runScript(['story']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Story Schema');
      expect(result.stdout).toContain('`id`');
      expect(result.stdout).toContain('`epic`');
      expect(result.stdout).toContain('`guidance`');
      expect(result.stdout).toContain('`doneWhen`');
    });

    it('should mark optional fields correctly', () => {
      const result = runScript(['story']);
      // epic, guidance, doneWhen, avoid, branch, pr, worktree are optional
      expect(result.stdout).toMatch(EPIC_OPTIONAL_PATTERN);
    });
  });

  describe('task schema', () => {
    it('should output markdown with status enum values', () => {
      const result = runScript(['task']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('# Task Schema');
      expect(result.stdout).toContain('`pending`');
      expect(result.stdout).toContain('`in_progress`');
      expect(result.stdout).toContain('`completed`');
    });

    it('should include JSON example with all fields', () => {
      const result = runScript(['task']);
      const jsonMatch = result.stdout.match(JSON_BLOCK_PATTERN);
      expect(jsonMatch).toBeTruthy();
      const parsed = JSON.parse(jsonMatch?.[1] ?? '{}');
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('subject');
      expect(parsed).toHaveProperty('status');
      expect(parsed).toHaveProperty('blockedBy');
    });
  });

  describe('error handling', () => {
    it('should exit 1 for unknown schema', () => {
      const result = runScript(['unknown']);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Unknown schema');
    });
  });
});
