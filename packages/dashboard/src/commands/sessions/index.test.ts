/**
 * Tests for sessions CLI subcommands
 *
 * Tests the CLI commands: sessions list, sessions status, sessions logs
 */

import process from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionStatus, listSessions, streamLogs } from '../../lib/sessions.ts';
import { sessionsListCommand, sessionsLogsCommand, sessionsStatusCommand } from './index.ts';

// Mock the sessions library module
vi.mock('../../lib/sessions.js', () => ({
  listSessions: vi.fn(),
  getSessionStatus: vi.fn(),
  streamLogs: vi.fn(),
}));

describe('sessions CLI subcommands', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('sessionsListCommand', () => {
    it('should call listSessions and output JSON array', async () => {
      const mockSessions = [
        {
          name: 'saga-story-story1-1234',
          status: 'running' as const,
          outputFile: '/tmp/saga-sessions/saga-story-story1-1234.jsonl',
        },
        {
          name: 'saga-story-story2-5678',
          status: 'running' as const,
          outputFile: '/tmp/saga-sessions/saga-story-story2-5678.jsonl',
        },
      ];
      vi.mocked(listSessions).mockReturnValue(mockSessions);

      // Capture console.log output
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Suppress console output in tests
      });

      await sessionsListCommand();

      expect(listSessions).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(mockSessions, null, 2));

      logSpy.mockRestore();
    });

    it('should output empty array when no sessions exist', async () => {
      vi.mocked(listSessions).mockReturnValue([]);

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Suppress console output in tests
      });

      await sessionsListCommand();

      expect(listSessions).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify([], null, 2));

      logSpy.mockRestore();
    });
  });

  describe('sessionsStatusCommand', () => {
    it('should call getSessionStatus and output JSON', async () => {
      vi.mocked(getSessionStatus).mockReturnValue({ running: true });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Suppress console output in tests
      });

      await sessionsStatusCommand('saga-story-my-story-1234');

      expect(getSessionStatus).toHaveBeenCalledWith('saga-story-my-story-1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ running: true }, null, 2));

      logSpy.mockRestore();
    });

    it('should output running: false for non-existent session', async () => {
      vi.mocked(getSessionStatus).mockReturnValue({ running: false });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Suppress console output in tests
      });

      await sessionsStatusCommand('saga-story-nonexistent-1234');

      expect(getSessionStatus).toHaveBeenCalledWith('saga-story-nonexistent-1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ running: false }, null, 2));

      logSpy.mockRestore();
    });
  });

  describe('sessionsLogsCommand', () => {
    it('should call streamLogs with session name', async () => {
      vi.mocked(streamLogs).mockResolvedValue(undefined);

      await sessionsLogsCommand('saga-story-my-story-1234');

      expect(streamLogs).toHaveBeenCalledWith('saga-story-my-story-1234');
    });

    it('should handle errors from streamLogs gracefully', async () => {
      vi.mocked(streamLogs).mockRejectedValue(new Error('Output file not found'));

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Suppress console error output in tests
      });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(sessionsLogsCommand('saga-story-nonexistent-1234')).rejects.toThrow(
        'process.exit called',
      );

      expect(errorSpy).toHaveBeenCalledWith('Error: Output file not found');
      expect(exitSpy).toHaveBeenCalledWith(1);

      errorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
