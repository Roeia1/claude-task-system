/**
 * Unit tests for the sessions library module
 *
 * Tests the tmux session management functions:
 * - shellEscape
 * - shellEscapeArgs
 * - validateSlug
 * - createSession
 * - listSessions
 * - getSessionStatus
 * - streamLogs
 * - killSession
 */

import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Constants for test assertions
const LONG_LINE_LENGTH = 150;
const MAX_PREVIEW_LENGTH = 500;

// Top-level regex patterns for test assertions
const INVALID_EPIC_SLUG_PATTERN = /invalid epic slug/i;
const INVALID_STORY_SLUG_PATTERN = /invalid story slug/i;
const SESSION_NAME_PATTERN = /^saga-my-epic-my-story-\d+$/;
const TMUX_NOT_FOUND_PATTERN = /tmux.*not found|not installed/i;
const SESSION_CREATE_FAILED_PATTERN = /failed to create.*session/i;
const OUTPUT_FILE_NOT_FOUND_PATTERN = /output file.*not found/i;

import {
  buildSessionInfo,
  createSession,
  getSessionStatus,
  killSession,
  listSessions,
  OUTPUT_DIR,
  parseSessionName,
  shellEscape,
  shellEscapeArgs,
  streamLogs,
  validateSlug,
} from './sessions.ts';

// Mock child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}));

// Mock fs
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

// Mock fs/promises
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual('node:fs/promises');
  return {
    ...actual,
    stat: vi.fn(),
    readFile: vi.fn(),
  };
});

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';

/** Helper to assert a value is not null/undefined and return it typed */
function assertDefined<T>(
  value: T | null | undefined,
  message = 'Expected value to be defined',
): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

const mockSpawn = spawn as ReturnType<typeof vi.fn>;
const mockSpawnSync = spawnSync as ReturnType<typeof vi.fn>;
const mockExistsSync = existsSync as ReturnType<typeof vi.fn>;
const mockMkdirSync = mkdirSync as ReturnType<typeof vi.fn>;
const _mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;
const mockStat = stat as ReturnType<typeof vi.fn>;
const mockReadFile = readFile as ReturnType<typeof vi.fn>;

describe('sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('shellEscape', () => {
    it('should wrap simple strings in single quotes', () => {
      expect(shellEscape('hello')).toBe("'hello'");
      expect(shellEscape('test123')).toBe("'test123'");
    });

    it('should escape single quotes within strings', () => {
      expect(shellEscape("it's")).toBe("'it'\\''s'");
      expect(shellEscape("hello 'world'")).toBe("'hello '\\''world'\\'''");
    });

    it('should handle empty strings', () => {
      expect(shellEscape('')).toBe("''");
    });

    it('should preserve spaces', () => {
      expect(shellEscape('hello world')).toBe("'hello world'");
      expect(shellEscape('path with spaces')).toBe("'path with spaces'");
    });

    it('should handle shell metacharacters safely', () => {
      // These should all be safely quoted
      expect(shellEscape('$HOME')).toBe("'$HOME'");
      expect(shellEscape('$(whoami)')).toBe("'$(whoami)'");
      expect(shellEscape('`whoami`')).toBe("'`whoami`'");
      expect(shellEscape('a && b')).toBe("'a && b'");
      expect(shellEscape('a || b')).toBe("'a || b'");
      expect(shellEscape('a; b')).toBe("'a; b'");
      expect(shellEscape('a | b')).toBe("'a | b'");
      expect(shellEscape('a > b')).toBe("'a > b'");
      expect(shellEscape('a < b')).toBe("'a < b'");
      expect(shellEscape('*')).toBe("'*'");
      expect(shellEscape('?')).toBe("'?'");
      expect(shellEscape('[abc]')).toBe("'[abc]'");
      expect(shellEscape('~')).toBe("'~'");
      expect(shellEscape('!')).toBe("'!'");
      expect(shellEscape('#comment')).toBe("'#comment'");
    });

    it('should handle newlines and special whitespace', () => {
      expect(shellEscape('line1\nline2')).toBe("'line1\nline2'");
      expect(shellEscape('tab\there')).toBe("'tab\there'");
    });

    it('should handle double quotes', () => {
      expect(shellEscape('"quoted"')).toBe('\'"quoted"\'');
    });

    it('should handle backslashes', () => {
      expect(shellEscape('back\\slash')).toBe("'back\\slash'");
    });
  });

  describe('shellEscapeArgs', () => {
    it('should escape and join multiple arguments', () => {
      expect(shellEscapeArgs(['echo', 'hello', 'world'])).toBe("'echo' 'hello' 'world'");
    });

    it('should handle arguments with spaces', () => {
      expect(shellEscapeArgs(['command', '--path', '/some path/with spaces'])).toBe(
        "'command' '--path' '/some path/with spaces'",
      );
    });

    it('should handle mixed safe and unsafe arguments', () => {
      expect(
        shellEscapeArgs(['saga', 'implement', 'my-story', '--path', "/Users/test's folder"]),
      ).toBe("'saga' 'implement' 'my-story' '--path' '/Users/test'\\''s folder'");
    });

    it('should handle empty array', () => {
      expect(shellEscapeArgs([])).toBe('');
    });

    it('should handle single argument', () => {
      expect(shellEscapeArgs(['command'])).toBe("'command'");
    });

    it('should prevent command injection', () => {
      // An attacker might try to inject commands via the path
      const maliciousPath = '/tmp/path; rm -rf /';
      const escaped = shellEscapeArgs(['command', '--path', maliciousPath]);
      expect(escaped).toBe("'command' '--path' '/tmp/path; rm -rf /'");
      // The semicolon is safely within single quotes
    });
  });

  describe('validateSlug', () => {
    it('should accept valid slugs with lowercase letters', () => {
      expect(validateSlug('abc')).toBe(true);
      expect(validateSlug('hello')).toBe(true);
    });

    it('should accept valid slugs with numbers', () => {
      expect(validateSlug('abc123')).toBe(true);
      expect(validateSlug('123')).toBe(true);
    });

    it('should accept valid slugs with hyphens', () => {
      expect(validateSlug('my-story')).toBe(true);
      expect(validateSlug('epic-1-story-2')).toBe(true);
    });

    it('should accept valid slugs with all allowed characters', () => {
      expect(validateSlug('my-story-123')).toBe(true);
      expect(validateSlug('auth-system-v2')).toBe(true);
    });

    it('should reject slugs with uppercase letters', () => {
      expect(validateSlug('MyStory')).toBe(false);
      expect(validateSlug('ABC')).toBe(false);
    });

    it('should reject slugs with underscores', () => {
      expect(validateSlug('my_story')).toBe(false);
      expect(validateSlug('auth_system')).toBe(false);
    });

    it('should reject slugs with spaces', () => {
      expect(validateSlug('my story')).toBe(false);
      expect(validateSlug(' test')).toBe(false);
    });

    it('should reject slugs with special characters', () => {
      expect(validateSlug('my.story')).toBe(false);
      expect(validateSlug('story@1')).toBe(false);
      expect(validateSlug('test!')).toBe(false);
      expect(validateSlug('name#1')).toBe(false);
    });

    it('should reject empty slugs', () => {
      expect(validateSlug('')).toBe(false);
    });

    it('should reject slugs starting or ending with hyphen', () => {
      expect(validateSlug('-story')).toBe(false);
      expect(validateSlug('story-')).toBe(false);
      expect(validateSlug('-')).toBe(false);
    });
  });

  describe('createSession', () => {
    it('should reject invalid epic slug', () => {
      expect(() => createSession('Invalid_Epic', 'valid-story', 'echo hello')).toThrow(
        INVALID_EPIC_SLUG_PATTERN,
      );
    });

    it('should reject invalid story slug', () => {
      expect(() => createSession('valid-epic', 'Invalid_Story', 'echo hello')).toThrow(
        INVALID_STORY_SLUG_PATTERN,
      );
    });

    it('should create output directory if it does not exist', () => {
      mockExistsSync.mockReturnValueOnce(false).mockReturnValue(true);
      mockSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: '/usr/bin/tmux' }) // which tmux
        .mockReturnValueOnce({ status: 0, stdout: '' }); // tmux new-session

      createSession('my-epic', 'my-story', 'echo hello');

      expect(mockMkdirSync).toHaveBeenCalledWith(OUTPUT_DIR, { recursive: true });
    });

    it('should return session name and output file path on success', () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: '/usr/bin/tmux' }) // which tmux
        .mockReturnValueOnce({ status: 0, stdout: '' }); // tmux new-session

      const result = createSession('my-epic', 'my-story', 'echo hello');

      // Session name should match pattern: saga-<epic>-<story>-<timestamp>
      expect(result.sessionName).toMatch(SESSION_NAME_PATTERN);
      expect(result.outputFile).toBe(`/tmp/saga-sessions/${result.sessionName}.out`);
    });

    it('should throw error if tmux is not available', () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValueOnce({ status: 1, stdout: '' }); // which tmux fails

      expect(() => createSession('my-epic', 'my-story', 'echo hello')).toThrow(
        TMUX_NOT_FOUND_PATTERN,
      );
    });

    it('should throw error if tmux session creation fails', () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync
        .mockReturnValueOnce({ status: 0, stdout: '/usr/bin/tmux' }) // which tmux
        .mockReturnValueOnce({ status: 1, stderr: 'session creation failed' }); // tmux new-session fails

      expect(() => createSession('my-epic', 'my-story', 'echo hello')).toThrow(
        SESSION_CREATE_FAILED_PATTERN,
      );
    });
  });

  describe('listSessions', () => {
    it('should return empty array when no sessions exist', () => {
      mockSpawnSync.mockReturnValue({ status: 1, stdout: '' }); // tmux ls returns non-zero when no sessions

      const result = listSessions();

      expect(result).toEqual([]);
    });

    it('should return only saga-prefixed sessions', () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout:
          'saga-epic1-story1-1234: 1 windows\nother-session: 1 windows\nsaga-epic2-story2-5678: 2 windows\n',
      });

      const result = listSessions();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('saga-epic1-story1-1234');
      expect(result[1].name).toBe('saga-epic2-story2-5678');
    });

    it('should include status for each session', () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'saga-epic1-story1-1234: 1 windows\n',
      });

      const result = listSessions();

      expect(result[0].status).toBe('running');
    });

    it('should include output file path for each session', () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawnSync.mockReturnValue({
        status: 0,
        stdout: 'saga-epic1-story1-1234: 1 windows\n',
      });

      const result = listSessions();

      expect(result[0].outputFile).toBe('/tmp/saga-sessions/saga-epic1-story1-1234.out');
    });
  });

  describe('getSessionStatus', () => {
    it('should return running: true when session exists', () => {
      mockSpawnSync.mockReturnValue({ status: 0 }); // tmux has-session returns 0 when session exists

      const result = getSessionStatus('saga-epic1-story1-1234');

      expect(result.running).toBe(true);
    });

    it('should return running: false when session does not exist', () => {
      mockSpawnSync.mockReturnValue({ status: 1 }); // tmux has-session returns non-zero when not found

      const result = getSessionStatus('saga-epic1-story1-1234');

      expect(result.running).toBe(false);
    });

    it('should call tmux has-session with correct session name', () => {
      mockSpawnSync.mockReturnValue({ status: 0 });

      getSessionStatus('saga-epic1-story1-1234');

      expect(mockSpawnSync).toHaveBeenCalledWith(
        'tmux',
        ['has-session', '-t', 'saga-epic1-story1-1234'],
        expect.any(Object),
      );
    });
  });

  describe('killSession', () => {
    it('should return killed: true when session is killed', () => {
      mockSpawnSync.mockReturnValue({ status: 0 }); // tmux kill-session returns 0 on success

      const result = killSession('saga-epic1-story1-1234');

      expect(result.killed).toBe(true);
    });

    it('should return killed: false when session does not exist', () => {
      mockSpawnSync.mockReturnValue({ status: 1 }); // tmux kill-session returns non-zero when not found

      const result = killSession('saga-epic1-story1-1234');

      expect(result.killed).toBe(false);
    });

    it('should call tmux kill-session with correct session name', () => {
      mockSpawnSync.mockReturnValue({ status: 0 });

      killSession('saga-epic1-story1-1234');

      expect(mockSpawnSync).toHaveBeenCalledWith(
        'tmux',
        ['kill-session', '-t', 'saga-epic1-story1-1234'],
        expect.any(Object),
      );
    });
  });

  describe('streamLogs', () => {
    let mockChildProcess: ChildProcess & EventEmitter;

    beforeEach(() => {
      mockChildProcess = new EventEmitter() as ChildProcess & EventEmitter;
      mockChildProcess.stdout = new EventEmitter() as NodeJS.ReadableStream;
      mockChildProcess.stderr = new EventEmitter() as NodeJS.ReadableStream;
      mockChildProcess.kill = vi.fn();
    });

    it('should throw error when output file does not exist', () => {
      mockExistsSync.mockReturnValue(false);

      expect(() => streamLogs('saga-epic1-story1-1234')).toThrow(OUTPUT_FILE_NOT_FOUND_PATTERN);
    });

    it('should spawn tail -f on the output file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockChildProcess);

      // Start streaming
      const streamPromise = streamLogs('saga-epic1-story1-1234');

      // Simulate process close
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      await streamPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'tail',
        ['-f', '/tmp/saga-sessions/saga-epic1-story1-1234.out'],
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] }),
      );
    });

    it('should resolve when process exits', async () => {
      mockExistsSync.mockReturnValue(true);
      mockSpawn.mockReturnValue(mockChildProcess);

      const streamPromise = streamLogs('saga-epic1-story1-1234');

      // Simulate process close
      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      await expect(streamPromise).resolves.toBeUndefined();
    });
  });

  describe('OUTPUT_DIR constant', () => {
    it('should be /tmp/saga-sessions', () => {
      expect(OUTPUT_DIR).toBe('/tmp/saga-sessions');
    });
  });

  describe('parseSessionName', () => {
    it('should parse valid session name with double-underscore delimiter', () => {
      const result = parseSessionName('saga__my-epic__my-story__12345');
      expect(result).toEqual({
        epicSlug: 'my-epic',
        storySlug: 'my-story',
      });
    });

    it('should handle slugs containing hyphens', () => {
      const result = parseSessionName('saga__epic-with-hyphens__story-with-hyphens__99999');
      expect(result).toEqual({
        epicSlug: 'epic-with-hyphens',
        storySlug: 'story-with-hyphens',
      });
    });

    it('should handle slugs with numbers', () => {
      const result = parseSessionName('saga__epic1__story2__12345');
      expect(result).toEqual({
        epicSlug: 'epic1',
        storySlug: 'story2',
      });
    });

    it('should return null for non-SAGA sessions (no saga__ prefix)', () => {
      const result = parseSessionName('other-session-name');
      expect(result).toBeNull();
    });

    it('should return null for old-format sessions (single hyphen)', () => {
      const result = parseSessionName('saga-epic-story-12345');
      expect(result).toBeNull();
    });

    it('should return null for malformed names with wrong number of parts', () => {
      expect(parseSessionName('saga__epic__12345')).toBeNull(); // missing story
      expect(parseSessionName('saga__epic')).toBeNull(); // missing story and pid
      expect(parseSessionName('saga__')).toBeNull(); // only prefix
    });

    it('should return null for empty string', () => {
      expect(parseSessionName('')).toBeNull();
    });
  });

  describe('buildSessionInfo', () => {
    const sessionName = 'saga__my-epic__my-story__12345';
    const startTime = new Date('2024-01-15T10:00:00Z');
    const modifiedTime = new Date('2024-01-15T11:30:00Z');

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return null for non-SAGA session names', async () => {
      const result = await buildSessionInfo('other-session', 'running');
      expect(result).toBeNull();
    });

    it('should return DetailedSessionInfo for valid running session with output file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockResolvedValue({
        birthtime: startTime,
        mtime: modifiedTime,
      });
      mockReadFile.mockResolvedValue('line 1\nline 2\nline 3\nline 4\nline 5\n');

      const result = assertDefined(await buildSessionInfo(sessionName, 'running'));

      expect(result.name).toBe(sessionName);
      expect(result.epicSlug).toBe('my-epic');
      expect(result.storySlug).toBe('my-story');
      expect(result.status).toBe('running');
      expect(result.outputFile).toBe(`/tmp/saga-sessions/${sessionName}.out`);
      expect(result.outputAvailable).toBe(true);
      expect(result.startTime).toEqual(startTime);
      expect(result.endTime).toBeUndefined(); // running sessions don't have endTime
    });

    it('should include endTime for completed sessions', async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockResolvedValue({
        birthtime: startTime,
        mtime: modifiedTime,
      });
      mockReadFile.mockResolvedValue('output\n');

      const result = assertDefined(await buildSessionInfo(sessionName, 'completed'));

      expect(result.status).toBe('completed');
      expect(result.endTime).toEqual(modifiedTime);
    });

    it('should set outputAvailable to false when output file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = assertDefined(await buildSessionInfo(sessionName, 'running'));

      expect(result.outputAvailable).toBe(false);
      expect(result.outputPreview).toBeUndefined();
      expect(result.startTime).toBeInstanceOf(Date); // fallback to now
    });

    it('should generate outputPreview with last 5 lines', async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockResolvedValue({
        birthtime: startTime,
        mtime: modifiedTime,
      });
      mockReadFile.mockResolvedValue('line 1\nline 2\nline 3\nline 4\nline 5\nline 6\nline 7\n');

      const result = assertDefined(await buildSessionInfo(sessionName, 'running'));

      // Should contain last 5 lines (lines 3-7 since we filter empty)
      expect(result.outputPreview).toBe('line 3\nline 4\nline 5\nline 6\nline 7');
    });

    it('should truncate outputPreview to max 500 chars', async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockResolvedValue({
        birthtime: startTime,
        mtime: modifiedTime,
      });
      // Create content where last 5 lines exceed 500 chars
      const longLine = 'x'.repeat(LONG_LINE_LENGTH);
      const content = `${longLine}\n${longLine}\n${longLine}\n${longLine}\n${longLine}\n`;
      mockReadFile.mockResolvedValue(content);

      const result = assertDefined(await buildSessionInfo(sessionName, 'running'));

      expect(assertDefined(result.outputPreview).length).toBeLessThanOrEqual(MAX_PREVIEW_LENGTH);
    });

    it('should handle output file with fewer than 5 lines', async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockResolvedValue({
        birthtime: startTime,
        mtime: modifiedTime,
      });
      mockReadFile.mockResolvedValue('only one line\n');

      const result = assertDefined(await buildSessionInfo(sessionName, 'running'));

      expect(result.outputPreview).toBe('only one line');
    });

    it('should handle empty output file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockResolvedValue({
        birthtime: startTime,
        mtime: modifiedTime,
      });
      mockReadFile.mockResolvedValue('');

      const result = assertDefined(await buildSessionInfo(sessionName, 'running'));

      expect(result.outputPreview).toBeUndefined();
    });

    it('should handle read errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockStat.mockResolvedValue({
        birthtime: startTime,
        mtime: modifiedTime,
      });
      mockReadFile.mockRejectedValue(new Error('Permission denied'));

      const result = assertDefined(await buildSessionInfo(sessionName, 'running'));

      expect(result.outputAvailable).toBe(true); // file exists but we couldn't read it
      expect(result.outputPreview).toBeUndefined();
    });
  });
});
