/**
 * Unit tests for the session polling service
 *
 * Tests the session discovery and polling functionality:
 * - startSessionPolling
 * - stopSessionPolling
 * - getCurrentSessions
 * - Change detection (new sessions, completed sessions, removed sessions)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCurrentSessions,
  POLLING_INTERVAL_MS,
  startSessionPolling,
  stopSessionPolling,
} from './session-polling.ts';
import type { DetailedSessionInfo } from './sessions.ts';
import { buildSessionInfo, getSessionStatus, listSessions } from './sessions.ts';

// Constants for test assertions
const EXPECTED_POLLING_INTERVAL = 3000;
const EXPECTED_SESSION_COUNT = 3;
const STOP_POLLING_MULTIPLIER = 3;

// Mock the sessions module
vi.mock('./sessions.js', async () => {
  const actual = await vi.importActual('./sessions.js');
  return {
    ...actual,
    listSessions: vi.fn(),
    buildSessionInfo: vi.fn(),
    getSessionStatus: vi.fn(),
  };
});

const mockListSessions = listSessions as ReturnType<typeof vi.fn>;
const mockBuildSessionInfo = buildSessionInfo as ReturnType<typeof vi.fn>;
const mockGetSessionStatus = getSessionStatus as ReturnType<typeof vi.fn>;

describe('session-polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Ensure polling is stopped before each test
    stopSessionPolling();
  });

  afterEach(() => {
    stopSessionPolling();
    vi.useRealTimers();
  });

  describe('POLLING_INTERVAL_MS', () => {
    it('should be 3000ms', () => {
      expect(POLLING_INTERVAL_MS).toBe(EXPECTED_POLLING_INTERVAL);
    });
  });

  describe('getCurrentSessions', () => {
    it('should return empty array before polling starts', () => {
      const sessions = getCurrentSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('startSessionPolling', () => {
    it('should call broadcast with initial sessions on first poll', async () => {
      const broadcast = vi.fn();
      const mockSession: DetailedSessionInfo = {
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        outputAvailable: true,
        startTime: new Date('2024-01-15T10:00:00Z'),
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockResolvedValue(mockSession);
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);

      // Wait for initial poll to complete
      await vi.advanceTimersByTimeAsync(0);

      expect(broadcast).toHaveBeenCalledWith({
        type: 'sessions:updated',
        data: [mockSession],
      });
    });

    it('should filter out non-SAGA sessions (null from buildSessionInfo)', async () => {
      const broadcast = vi.fn();

      mockListSessions.mockReturnValue([
        { name: 'other-session', status: 'running', outputFile: '/tmp/other.out' },
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockImplementation((name) => {
        if (name.startsWith('saga__')) {
          return Promise.resolve({
            name,
            epicSlug: 'my-epic',
            storySlug: 'my-story',
            status: 'running',
            outputFile: `/tmp/saga-sessions/${name}.out`,
            outputAvailable: true,
            startTime: new Date(),
          });
        }
        return Promise.resolve(null);
      });
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      expect(broadcast).toHaveBeenCalledWith({
        type: 'sessions:updated',
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'saga__my-epic__my-story__12345' }),
        ]),
      });
      expect(broadcast).toHaveBeenCalledTimes(1);
      // Should only have one session (the SAGA one)
      expect(broadcast.mock.calls[0][0].data).toHaveLength(1);
    });

    it('should poll at the configured interval', async () => {
      const broadcast = vi.fn();

      mockListSessions.mockReturnValue([]);

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      // First broadcast for initial state
      expect(mockListSessions).toHaveBeenCalledTimes(1);

      // Advance to first interval
      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);
      expect(mockListSessions).toHaveBeenCalledTimes(2);

      // Advance to second interval
      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);
      expect(mockListSessions).toHaveBeenCalledTimes(EXPECTED_SESSION_COUNT);
    });

    it('should not broadcast if no changes occurred', async () => {
      const broadcast = vi.fn();
      const mockSession: DetailedSessionInfo = {
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        outputAvailable: true,
        startTime: new Date('2024-01-15T10:00:00Z'),
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockResolvedValue(mockSession);
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      // Initial broadcast
      expect(broadcast).toHaveBeenCalledTimes(1);

      // Advance to next poll - same state, no change
      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);
      expect(broadcast).toHaveBeenCalledTimes(1); // Still just 1
    });

    it('should broadcast when a new session is detected', async () => {
      const broadcast = vi.fn();

      // Initially no sessions
      mockListSessions.mockReturnValue([]);

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);
      expect(broadcast).toHaveBeenCalledTimes(1);
      expect(broadcast.mock.calls[0][0].data).toHaveLength(0);

      // New session appears
      const newSession: DetailedSessionInfo = {
        name: 'saga__new-epic__new-story__99999',
        epicSlug: 'new-epic',
        storySlug: 'new-story',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__new-epic__new-story__99999.out',
        outputAvailable: true,
        startTime: new Date(),
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__new-epic__new-story__99999',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__new-epic__new-story__99999.out',
        },
      ]);
      mockBuildSessionInfo.mockResolvedValue(newSession);
      mockGetSessionStatus.mockReturnValue({ running: true });

      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);
      expect(broadcast).toHaveBeenCalledTimes(2);
      expect(broadcast.mock.calls[1][0].data).toHaveLength(1);
    });

    it('should broadcast when a session status changes from running to completed', async () => {
      const broadcast = vi.fn();
      const startTime = new Date('2024-01-15T10:00:00Z');
      const endTime = new Date('2024-01-15T11:00:00Z');

      // Initial running session
      const runningSession: DetailedSessionInfo = {
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        outputAvailable: true,
        startTime,
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockResolvedValue(runningSession);
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);
      expect(broadcast).toHaveBeenCalledTimes(1);
      expect(broadcast.mock.calls[0][0].data[0].status).toBe('running');

      // Session completes (tmux session no longer running, but we still have the output file)
      const completedSession: DetailedSessionInfo = {
        ...runningSession,
        status: 'completed',
        endTime,
      };
      mockGetSessionStatus.mockReturnValue({ running: false });
      mockBuildSessionInfo.mockResolvedValue(completedSession);

      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);
      expect(broadcast).toHaveBeenCalledTimes(2);
      expect(broadcast.mock.calls[1][0].data[0].status).toBe('completed');
    });

    it('should broadcast when a session is removed', async () => {
      const broadcast = vi.fn();
      const mockSession: DetailedSessionInfo = {
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        outputAvailable: true,
        startTime: new Date(),
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockResolvedValue(mockSession);
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);
      expect(broadcast).toHaveBeenCalledTimes(1);
      expect(broadcast.mock.calls[0][0].data).toHaveLength(1);

      // Session removed
      mockListSessions.mockReturnValue([]);

      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);
      expect(broadcast).toHaveBeenCalledTimes(2);
      expect(broadcast.mock.calls[1][0].data).toHaveLength(0);
    });

    it('should not start multiple polling intervals if called multiple times', async () => {
      const broadcast1 = vi.fn();
      const broadcast2 = vi.fn();

      mockListSessions.mockReturnValue([]);

      startSessionPolling(broadcast1);
      await vi.advanceTimersByTimeAsync(0);

      startSessionPolling(broadcast2);
      await vi.advanceTimersByTimeAsync(0);

      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);

      // Only the second broadcast should be receiving calls after restart
      expect(broadcast2).toHaveBeenCalled();
    });
  });

  describe('stopSessionPolling', () => {
    it('should stop the polling interval', async () => {
      const broadcast = vi.fn();

      mockListSessions.mockReturnValue([]);

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);
      expect(mockListSessions).toHaveBeenCalledTimes(1);

      stopSessionPolling();

      // Advance time - should not poll again
      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS * STOP_POLLING_MULTIPLIER);
      expect(mockListSessions).toHaveBeenCalledTimes(1);
    });

    it('should clear the current sessions', async () => {
      const broadcast = vi.fn();
      const mockSession: DetailedSessionInfo = {
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        outputAvailable: true,
        startTime: new Date(),
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockResolvedValue(mockSession);
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      expect(getCurrentSessions()).toHaveLength(1);

      stopSessionPolling();

      expect(getCurrentSessions()).toEqual([]);
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        stopSessionPolling();
        stopSessionPolling();
        stopSessionPolling();
      }).not.toThrow();
    });
  });

  describe('getCurrentSessions', () => {
    it('should return the current session list', async () => {
      const broadcast = vi.fn();
      const mockSession: DetailedSessionInfo = {
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        outputAvailable: true,
        startTime: new Date('2024-01-15T10:00:00Z'),
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockResolvedValue(mockSession);
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      const sessions = getCurrentSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual(mockSession);
    });

    it('should return a copy of sessions array (immutable)', async () => {
      const broadcast = vi.fn();
      const mockSession: DetailedSessionInfo = {
        name: 'saga__my-epic__my-story__12345',
        epicSlug: 'my-epic',
        storySlug: 'my-story',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        outputAvailable: true,
        startTime: new Date('2024-01-15T10:00:00Z'),
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockResolvedValue(mockSession);
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      const sessions1 = getCurrentSessions();
      const sessions2 = getCurrentSessions();

      expect(sessions1).not.toBe(sessions2);
      expect(sessions1).toEqual(sessions2);
    });

    it('should sort sessions by startTime descending', async () => {
      const broadcast = vi.fn();
      const session1: DetailedSessionInfo = {
        name: 'saga__epic1__story1__111',
        epicSlug: 'epic1',
        storySlug: 'story1',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__epic1__story1__111.out',
        outputAvailable: true,
        startTime: new Date('2024-01-15T08:00:00Z'), // Oldest
      };
      const session2: DetailedSessionInfo = {
        name: 'saga__epic2__story2__222',
        epicSlug: 'epic2',
        storySlug: 'story2',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__epic2__story2__222.out',
        outputAvailable: true,
        startTime: new Date('2024-01-15T12:00:00Z'), // Newest
      };
      const session3: DetailedSessionInfo = {
        name: 'saga__epic3__story3__333',
        epicSlug: 'epic3',
        storySlug: 'story3',
        status: 'running',
        outputFile: '/tmp/saga-sessions/saga__epic3__story3__333.out',
        outputAvailable: true,
        startTime: new Date('2024-01-15T10:00:00Z'), // Middle
      };

      mockListSessions.mockReturnValue([
        {
          name: 'saga__epic1__story1__111',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__epic1__story1__111.out',
        },
        {
          name: 'saga__epic2__story2__222',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__epic2__story2__222.out',
        },
        {
          name: 'saga__epic3__story3__333',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__epic3__story3__333.out',
        },
      ]);
      mockBuildSessionInfo.mockImplementation((name) => {
        if (name === 'saga__epic1__story1__111') {
          return Promise.resolve(session1);
        }
        if (name === 'saga__epic2__story2__222') {
          return Promise.resolve(session2);
        }
        if (name === 'saga__epic3__story3__333') {
          return Promise.resolve(session3);
        }
        return Promise.resolve(null);
      });
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      const sessions = getCurrentSessions();
      expect(sessions).toHaveLength(EXPECTED_SESSION_COUNT);
      expect(sessions[0].name).toBe('saga__epic2__story2__222'); // Newest first
      expect(sessions[1].name).toBe('saga__epic3__story3__333'); // Middle
      expect(sessions[2].name).toBe('saga__epic1__story1__111'); // Oldest last
    });
  });

  describe('error handling', () => {
    it('should continue polling if listSessions throws an error', async () => {
      const broadcast = vi.fn();

      // First call throws
      mockListSessions.mockImplementationOnce(() => {
        throw new Error('tmux not available');
      });
      // Second call succeeds
      mockListSessions.mockReturnValue([]);

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      // Should continue polling even after error (silently handled)
      await vi.advanceTimersByTimeAsync(POLLING_INTERVAL_MS);
      expect(mockListSessions).toHaveBeenCalledTimes(2);

      // Second poll should succeed and broadcast
      expect(broadcast).toHaveBeenCalledWith({
        type: 'sessions:updated',
        data: [],
      });
    });

    it('should handle buildSessionInfo errors gracefully', async () => {
      const broadcast = vi.fn();

      mockListSessions.mockReturnValue([
        {
          name: 'saga__my-epic__my-story__12345',
          status: 'running',
          outputFile: '/tmp/saga-sessions/saga__my-epic__my-story__12345.out',
        },
      ]);
      mockBuildSessionInfo.mockRejectedValue(new Error('Failed to build session info'));
      mockGetSessionStatus.mockReturnValue({ running: true });

      startSessionPolling(broadcast);
      await vi.advanceTimersByTimeAsync(0);

      // Should broadcast with empty sessions when buildSessionInfo fails (silently handled)
      expect(broadcast).toHaveBeenCalledWith({
        type: 'sessions:updated',
        data: [],
      });
    });
  });
});
