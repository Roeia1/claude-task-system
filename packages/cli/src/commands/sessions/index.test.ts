/**
 * Tests for sessions CLI subcommands
 *
 * Tests the CLI commands: sessions list, sessions status, sessions logs, sessions kill
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as sessions from '../../lib/sessions.js';

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
          name: 'saga-epic1-story1-1234',
          status: 'running' as const,
          outputFile: '/tmp/saga-sessions/saga-epic1-story1-1234.out',
        },
        {
          name: 'saga-epic2-story2-5678',
          status: 'running' as const,
          outputFile: '/tmp/saga-sessions/saga-epic2-story2-5678.out',
        },
      ];
      vi.mocked(sessions.listSessions).mockResolvedValue(mockSessions);

      const { sessionsListCommand } = await import('./index.js');

      // Capture console.log output
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sessionsListCommand();

      expect(sessions.listSessions).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(mockSessions, null, 2));

      logSpy.mockRestore();
    });

    it('should output empty array when no sessions exist', async () => {
      vi.mocked(sessions.listSessions).mockResolvedValue([]);

      const { sessionsListCommand } = await import('./index.js');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sessionsListCommand();

      expect(sessions.listSessions).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify([], null, 2));

      logSpy.mockRestore();
    });
  });

  describe('sessionsStatusCommand', () => {
    it('should call getSessionStatus and output JSON', async () => {
      vi.mocked(sessions.getSessionStatus).mockResolvedValue({ running: true });

      const { sessionsStatusCommand } = await import('./index.js');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sessionsStatusCommand('saga-epic-story-1234');

      expect(sessions.getSessionStatus).toHaveBeenCalledWith('saga-epic-story-1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ running: true }, null, 2));

      logSpy.mockRestore();
    });

    it('should output running: false for non-existent session', async () => {
      vi.mocked(sessions.getSessionStatus).mockResolvedValue({ running: false });

      const { sessionsStatusCommand } = await import('./index.js');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sessionsStatusCommand('saga-nonexistent-1234');

      expect(sessions.getSessionStatus).toHaveBeenCalledWith('saga-nonexistent-1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ running: false }, null, 2));

      logSpy.mockRestore();
    });
  });

  describe('sessionsLogsCommand', () => {
    it('should call streamLogs with session name', async () => {
      vi.mocked(sessions.streamLogs).mockResolvedValue(undefined);

      const { sessionsLogsCommand } = await import('./index.js');

      await sessionsLogsCommand('saga-epic-story-1234');

      expect(sessions.streamLogs).toHaveBeenCalledWith('saga-epic-story-1234');
    });

    it('should handle errors from streamLogs gracefully', async () => {
      vi.mocked(sessions.streamLogs).mockRejectedValue(new Error('Output file not found'));

      const { sessionsLogsCommand } = await import('./index.js');

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      await expect(sessionsLogsCommand('saga-nonexistent-1234')).rejects.toThrow(
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
      vi.mocked(sessions.killSession).mockResolvedValue({ killed: true });

      const { sessionsKillCommand } = await import('./index.js');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sessionsKillCommand('saga-epic-story-1234');

      expect(sessions.killSession).toHaveBeenCalledWith('saga-epic-story-1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ killed: true }, null, 2));

      logSpy.mockRestore();
    });

    it('should output killed: false for non-existent session', async () => {
      vi.mocked(sessions.killSession).mockResolvedValue({ killed: false });

      const { sessionsKillCommand } = await import('./index.js');

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await sessionsKillCommand('saga-nonexistent-1234');

      expect(sessions.killSession).toHaveBeenCalledWith('saga-nonexistent-1234');
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ killed: false }, null, 2));

      logSpy.mockRestore();
    });
  });
});
