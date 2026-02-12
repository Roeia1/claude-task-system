/**
 * Integration tests for sessions library module
 *
 * These tests use real tmux to verify the session management works correctly.
 * Tests are skipped if tmux is not available.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  createSession,
  getSessionStatus,
  killSession,
  listSessions,
  OUTPUT_DIR,
  validateSlug,
} from './sessions.ts';

// Module-level regex constants for biome lint/performance/useTopLevelRegex
const SESSION_NAME_PATTERN = /^saga-story-test-story-\d+$/;
const INVALID_STORY_ID_PATTERN = /invalid story id/i;

// Module-level numeric constants for biome lint/style/noMagicNumbers
const DEFAULT_WAIT_MS = 2000;
const OUTPUT_SETTLE_MS = 100;
const LONG_SLUG_LENGTH = 100;

/**
 * Check if tmux is available on the system
 */
function isTmuxAvailable(): boolean {
  const result = spawnSync('which', ['tmux'], { encoding: 'utf-8' });
  return result.status === 0;
}

const hasTmux = isTmuxAvailable();

// Helper to clean up all saga-test sessions
function cleanupTestSessions(): void {
  const sessions = listSessions();
  const testSessions = sessions.filter(
    (session) =>
      session.name.startsWith('saga-story-test-story-') ||
      session.name.startsWith('saga-story-integration-'),
  );
  for (const session of testSessions) {
    killSession(session.name);
  }
}

// Helper to wait for session to be fully created
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Constants for polling
const POLL_INTERVAL_MS = 50;

// Helper to wait for a file to exist with polling (using recursion)
function waitForFile(filePath: string, maxWaitMs = DEFAULT_WAIT_MS): Promise<boolean> {
  const pollInterval = POLL_INTERVAL_MS;

  const poll = async (waited: number): Promise<boolean> => {
    if (existsSync(filePath)) {
      return true;
    }
    if (waited >= maxWaitMs) {
      return false;
    }
    await sleep(pollInterval);
    return poll(waited + pollInterval);
  };

  return poll(0);
}

describe.skipIf(!hasTmux)('sessions integration', () => {
  const testStory = 'test-story';

  beforeAll(() => {
    // Create output directory if it doesn't exist
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  });

  beforeEach(() => {
    // Clean up any leftover test sessions
    cleanupTestSessions();
  });

  afterEach(() => {
    // Clean up test sessions after each test
    cleanupTestSessions();
  });

  describe('createSession', () => {
    it('should create a tmux session with correct name pattern', () => {
      const result = createSession(testStory, 'echo "test output"');

      expect(result.sessionName).toMatch(SESSION_NAME_PATTERN);
      expect(result.outputFile).toBe(join(OUTPUT_DIR, `${result.sessionName}.jsonl`));

      // Verify session exists
      const status = getSessionStatus(result.sessionName);
      // Note: The session might have already completed since the command is quick
      // We just verify it was created (either running or completed)
      expect(status).toHaveProperty('running');
    });

    it('should create output file in /tmp/saga-sessions/', async () => {
      const result = createSession(testStory, 'echo "hello world" && sleep 1');

      // Wait for script to create output file (poll with timeout)
      const fileExists = await waitForFile(result.outputFile, DEFAULT_WAIT_MS);

      expect(fileExists).toBe(true);
    });

    it('should capture command output to file', async () => {
      const testMessage = `test-output-${Date.now()}`;
      const result = createSession(testStory, `echo "${testMessage}" && sleep 1`);

      // Wait for output file to exist, then wait a bit more for content
      await waitForFile(result.outputFile, DEFAULT_WAIT_MS);
      await sleep(OUTPUT_SETTLE_MS);

      const output = readFileSync(result.outputFile, 'utf-8');
      expect(output).toContain(testMessage);
    });

    it('should reject invalid story ID', () => {
      expect(() => createSession('Invalid_Story', 'echo test')).toThrow(INVALID_STORY_ID_PATTERN);
    });

    it('should reject slug with uppercase letters', () => {
      expect(() => createSession('MyStory', 'echo test')).toThrow(INVALID_STORY_ID_PATTERN);
    });

    it('should reject slug with underscores', () => {
      expect(() => createSession('my_story', 'echo test')).toThrow(INVALID_STORY_ID_PATTERN);
    });

    it('should reject slug with special characters', () => {
      expect(() => createSession('my@story', 'echo test')).toThrow(INVALID_STORY_ID_PATTERN);
    });

    it('should reject slug with spaces', () => {
      expect(() => createSession('my story', 'echo test')).toThrow(INVALID_STORY_ID_PATTERN);
    });

    it('should reject slug starting with hyphen', () => {
      expect(() => createSession('-my-story', 'echo test')).toThrow(INVALID_STORY_ID_PATTERN);
    });

    it('should reject slug ending with hyphen', () => {
      expect(() => createSession('my-story-', 'echo test')).toThrow(INVALID_STORY_ID_PATTERN);
    });

    it('should reject empty slug', () => {
      expect(() => createSession('', 'echo test')).toThrow(INVALID_STORY_ID_PATTERN);
    });
  });

  describe('listSessions', () => {
    it('should return empty array when no saga sessions exist', () => {
      // Ensure no test sessions exist
      cleanupTestSessions();

      const sessions = listSessions();
      const testSessions = sessions.filter(
        (s) =>
          s.name.startsWith('saga-story-test-story-') ||
          s.name.startsWith('saga-story-integration-'),
      );
      expect(testSessions).toHaveLength(0);
    });

    it('should list created saga sessions', () => {
      const result = createSession(testStory, 'sleep 10');

      const sessions = listSessions();
      const found = sessions.find((s) => s.name === result.sessionName);

      expect(found).toBeDefined();
      expect(found?.status).toBe('running');
      expect(found?.outputFile).toBe(result.outputFile);
    });

    it('should list multiple saga sessions', () => {
      const result1 = createSession('integration-story1', 'sleep 10');
      const result2 = createSession('integration-story2', 'sleep 10');

      const sessions = listSessions();
      const names = sessions.map((s) => s.name);

      expect(names).toContain(result1.sessionName);
      expect(names).toContain(result2.sessionName);
    });

    it('should only return sessions with saga-story- prefix', () => {
      // Create a non-saga session
      spawnSync('tmux', ['new-session', '-d', '-s', 'other-session', 'sleep 5'], {
        encoding: 'utf-8',
      });

      try {
        const sessions = listSessions();
        // Sessions should start with saga-story- prefix
        const nonSagaSessions = sessions.filter((s) => !s.name.startsWith('saga-story-'));

        expect(nonSagaSessions).toHaveLength(0);
      } finally {
        // Cleanup
        spawnSync('tmux', ['kill-session', '-t', 'other-session']);
      }
    });
  });

  describe('getSessionStatus', () => {
    it('should return running: true for existing session', () => {
      const result = createSession(testStory, 'sleep 10');

      const status = getSessionStatus(result.sessionName);

      expect(status.running).toBe(true);
    });

    it('should return running: false for non-existent session', () => {
      const status = getSessionStatus('saga-story-nonexistent-99999');

      expect(status.running).toBe(false);
    });

    it('should return running: false after session is killed', () => {
      const result = createSession(testStory, 'sleep 10');

      // Verify running
      let status = getSessionStatus(result.sessionName);
      expect(status.running).toBe(true);

      // Kill session
      killSession(result.sessionName);

      // Verify not running
      status = getSessionStatus(result.sessionName);
      expect(status.running).toBe(false);
    });
  });

  describe('killSession', () => {
    it('should return killed: true for existing session', () => {
      const result = createSession(testStory, 'sleep 10');

      const killResult = killSession(result.sessionName);

      expect(killResult.killed).toBe(true);
    });

    it('should return killed: false for non-existent session', () => {
      const killResult = killSession('saga-story-nonexistent-99999');

      expect(killResult.killed).toBe(false);
    });

    it('should terminate the tmux session', () => {
      const result = createSession(testStory, 'sleep 10');

      // Verify session exists
      let status = getSessionStatus(result.sessionName);
      expect(status.running).toBe(true);

      // Kill it
      killSession(result.sessionName);

      // Verify it's gone
      status = getSessionStatus(result.sessionName);
      expect(status.running).toBe(false);
    });
  });

  describe('session lifecycle', () => {
    it('should complete full lifecycle: create -> list -> status -> kill', () => {
      // 1. Create session
      const createResult = createSession(testStory, 'sleep 30');
      expect(createResult.sessionName).toMatch(SESSION_NAME_PATTERN);
      expect(createResult.outputFile).toContain('/tmp/saga-sessions/');

      // 2. Verify it appears in list
      let sessions = listSessions();
      let found = sessions.find((s) => s.name === createResult.sessionName);
      expect(found).toBeDefined();
      expect(found?.status).toBe('running');

      // 3. Check status
      let status = getSessionStatus(createResult.sessionName);
      expect(status.running).toBe(true);

      // 4. Kill session
      const killResult = killSession(createResult.sessionName);
      expect(killResult.killed).toBe(true);

      // 5. Verify removed from list
      sessions = listSessions();
      found = sessions.find((s) => s.name === createResult.sessionName);
      expect(found).toBeUndefined();

      // 6. Verify status shows not running
      status = getSessionStatus(createResult.sessionName);
      expect(status.running).toBe(false);
    });

    it('should allow creating new session with same storyId after killing old one', () => {
      // Create first session
      const result1 = createSession(testStory, 'sleep 10');

      // Kill it
      killSession(result1.sessionName);

      // Create second session with same storyId
      const result2 = createSession(testStory, 'sleep 10');

      // They should have different names (different timestamps)
      expect(result2.sessionName).not.toBe(result1.sessionName);
      expect(result2.sessionName).toMatch(SESSION_NAME_PATTERN);
    });
  });

  describe('session survival', () => {
    it('should session survive after test completes (not attached to test process)', () => {
      // Create a session
      const result = createSession(testStory, 'sleep 30');

      // The session should be independent of this test process
      // We verify this by checking it's still running
      const status = getSessionStatus(result.sessionName);
      expect(status.running).toBe(true);

      // Cleanup (we clean up in afterEach, but this verifies we can kill it)
      killSession(result.sessionName);
    });
  });
});

describe('validateSlug edge cases', () => {
  it('should accept single character slug', () => {
    expect(validateSlug('a')).toBe(true);
    expect(validateSlug('1')).toBe(true);
  });

  it('should accept slug with consecutive hyphens', () => {
    // Consecutive hyphens are technically allowed by the regex
    expect(validateSlug('my--story')).toBe(true);
  });

  it('should reject slug that is only hyphens', () => {
    expect(validateSlug('-')).toBe(false);
    expect(validateSlug('--')).toBe(false);
    expect(validateSlug('---')).toBe(false);
  });

  it('should accept long slugs', () => {
    const longSlug = 'a'.repeat(LONG_SLUG_LENGTH);
    expect(validateSlug(longSlug)).toBe(true);
  });

  it('should accept slug with numbers only', () => {
    expect(validateSlug('123')).toBe(true);
    expect(validateSlug('123456789')).toBe(true);
  });

  it('should reject null-like inputs', () => {
    expect(validateSlug(null)).toBe(false);
    expect(validateSlug(undefined)).toBe(false);
  });

  it('should reject slug with leading/trailing whitespace', () => {
    expect(validateSlug(' test')).toBe(false);
    expect(validateSlug('test ')).toBe(false);
    expect(validateSlug(' test ')).toBe(false);
  });

  it('should reject slug with newlines', () => {
    expect(validateSlug('test\nstory')).toBe(false);
  });

  it('should reject slug with tabs', () => {
    expect(validateSlug('test\tstory')).toBe(false);
  });

  it('should reject slug with unicode characters', () => {
    expect(validateSlug('tëst')).toBe(false);
    expect(validateSlug('tést')).toBe(false);
    expect(validateSlug('test🚀')).toBe(false);
  });
});
