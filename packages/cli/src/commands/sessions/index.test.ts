/**
 * Tests for sessions CLI subcommands
 *
 * Tests the CLI commands: sessions list, sessions status, sessions logs, sessions kill
 */

import process from 'node:process';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionStatus, killSession, listSessions, streamLogs } from '../../lib/sessions.ts';
import {
  sessionsKillCommand,
  sessionsListCommand,
  sessionsLogsCommand,
  sessionsStatusCommand,
} from './index.ts';

// Mock the sessions library module
vi.mock('../../lib/sessions.js', () => ({
  listSessions: vi.fn(),
  getSessionStatus: vi.fn(),
  streamLogs: vi.fn(),
  killSession: vi.fn(),
}));

describe('sessions CLI subcommands', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('sessionsListCommand', () => {
    it('should call listSessions and output JSON array', async () => {
      const mockSessions = [
        {
          name: 'saga__epic1__story1__1234',
          status: 'running' as const,
          outputFile: '/tmp/saga-sessions/saga__epic1__story1__1234.out',
        },
        {
          name: 'saga__epic2__story2__5678',
          status: 'running' as const,
          outputFile: '/tmp/saga-sessions/saga__epic2__story2__5678.out',
        },
      ];
      vi.mocked(listSessions).mockResolvedValue(mockSessions);

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
      vi.mocked(listSessions).mockResolvedValue([]);

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
      vi.mocked(getSessionStatus).mockResolvedValue({ running: true });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Suppress console output in tests
      });

      await sessionsStatusCommand('saga__epic__story__1234');

      expect(getSessionStatus).toHaveBeenCalledWith('saga__epic__story__1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ running: true }, null, 2));

      logSpy.mockRestore();
    });

    it('should output running: false for non-existent session', async () => {
      vi.mocked(getSessionStatus).mockResolvedValue({ running: false });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Suppress console output in tests
      });

      await sessionsStatusCommand('saga__nonexistent__1234');

      expect(getSessionStatus).toHaveBeenCalledWith('saga__nonexistent__1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ running: false }, null, 2));

      logSpy.mockRestore();
    });
  });

  describe('sessionsLogsCommand', () => {
    it('should call streamLogs with session name', async () => {
      vi.mocked(streamLogs).mockResolvedValue(undefined);

      await sessionsLogsCommand('saga__epic__story__1234');

      expect(streamLogs).toHaveBeenCalledWith('saga__epic__story__1234');
    });

    it('should handle errors from streamLogs gracefully', async () => {
      vi.mocked(streamLogs).mockRejectedValue(new Error('Output file not found'));

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Suppress console error output in tests
      });
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(sessionsLogsCommand('saga__nonexistent__1234')).rejects.toThrow(
        'process.exit called',
      );

      expect(errorSpy).toHaveBeenCalledWith('Error: Output file not found');
      expect(exitSpy).toHaveBeenCalledWith(1);

      errorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('sessionsKillCommand', () => {
    it('should call killSession and output JSON', async () => {
      vi.mocked(killSession).mockResolvedValue({ killed: true });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Suppress console output in tests
      });

      await sessionsKillCommand('saga__epic__story__1234');

      expect(killSession).toHaveBeenCalledWith('saga__epic__story__1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ killed: true }, null, 2));

      logSpy.mockRestore();
    });

    it('should output killed: false for non-existent session', async () => {
      vi.mocked(killSession).mockResolvedValue({ killed: false });

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
        // Suppress console output in tests
      });

      await sessionsKillCommand('saga__nonexistent__1234');

      expect(killSession).toHaveBeenCalledWith('saga__nonexistent__1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ killed: false }, null, 2));

      logSpy.mockRestore();
    });
  });
});
