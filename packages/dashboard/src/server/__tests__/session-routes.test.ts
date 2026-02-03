/**
 * Tests for Session REST API endpoints
 *
 * Tests the session endpoints:
 * - GET /api/sessions - returns DetailedSessionInfo[]
 * - GET /api/sessions/:sessionName - returns DetailedSessionInfo
 */

import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DetailedSessionInfo } from '../../lib/sessions.ts';
import { createSessionApiRouter } from '../session-routes.ts';

// HTTP status code constants for biome lint/style/noMagicNumbers
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

// Expected count constants for assertions
const EXPECTED_COUNT_ONE = 1;
const EXPECTED_COUNT_TWO = 2;
const EXPECTED_COUNT_THREE = 3;

// Mock the session-polling module
vi.mock('../../lib/session-polling.js', () => ({
  getCurrentSessions: vi.fn(),
}));

import { getCurrentSessions } from '../../lib/session-polling.ts';

const mockGetCurrentSessions = getCurrentSessions as ReturnType<typeof vi.fn>;

// Helper to build API paths with query parameters
function sessionsPath(params?: Record<string, string>): string {
  if (!params) {
    return '/api/sessions';
  }
  const query = new URLSearchParams(params).toString();
  return `/api/sessions?${query}`;
}

describe('session routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', createSessionApiRouter());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Helper function to create mock session data
  function createMockSession(overrides: Partial<DetailedSessionInfo> = {}): DetailedSessionInfo {
    return {
      name: 'saga__test-epic__test-story__12345',
      epicSlug: 'test-epic',
      storySlug: 'test-story',
      status: 'running',
      outputFile: '/tmp/saga-sessions/saga__test-epic__test-story__12345.out',
      outputAvailable: true,
      startTime: new Date('2026-01-29T10:00:00Z'),
      endTime: undefined,
      outputPreview: 'Last output line',
      ...overrides,
    };
  }

  describe('GET /api/sessions', () => {
    it('should return all sessions', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          epicSlug: 'epic1',
          storySlug: 'story1',
        }),
        createMockSession({
          name: 'saga__epic2__story2__222',
          epicSlug: 'epic2',
          storySlug: 'story2',
        }),
      ];
      mockGetCurrentSessions.mockReturnValue(mockSessions);

      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(HTTP_OK);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(EXPECTED_COUNT_TWO);
    });

    it('should return sessions with correct structure', async () => {
      const mockSession = createMockSession();
      mockGetCurrentSessions.mockReturnValue([mockSession]);

      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body[0]).toMatchObject({
        name: mockSession.name,
        epicSlug: mockSession.epicSlug,
        storySlug: mockSession.storySlug,
        status: mockSession.status,
        outputFile: mockSession.outputFile,
        outputAvailable: mockSession.outputAvailable,
        outputPreview: mockSession.outputPreview,
      });
      expect(res.body[0].startTime).toBeDefined();
    });

    it('should return empty array when no sessions exist', async () => {
      mockGetCurrentSessions.mockReturnValue([]);

      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body).toEqual([]);
    });

    it('should filter by epicSlug', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          epicSlug: 'epic1',
          storySlug: 'story1',
        }),
        createMockSession({
          name: 'saga__epic2__story2__222',
          epicSlug: 'epic2',
          storySlug: 'story2',
        }),
        createMockSession({
          name: 'saga__epic1__story3__333',
          epicSlug: 'epic1',
          storySlug: 'story3',
        }),
      ];
      mockGetCurrentSessions.mockReturnValue(mockSessions);

      const res = await request(app).get('/api/sessions?epicSlug=epic1');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.length).toBe(EXPECTED_COUNT_TWO);
      expect(res.body.every((s: DetailedSessionInfo) => s.epicSlug === 'epic1')).toBe(true);
    });

    it('should filter by storySlug (requires epicSlug)', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          epicSlug: 'epic1',
          storySlug: 'story1',
        }),
        createMockSession({
          name: 'saga__epic1__story2__222',
          epicSlug: 'epic1',
          storySlug: 'story2',
        }),
        createMockSession({
          name: 'saga__epic2__story1__333',
          epicSlug: 'epic2',
          storySlug: 'story1',
        }),
      ];
      mockGetCurrentSessions.mockReturnValue(mockSessions);

      const res = await request(app).get(sessionsPath({ epicSlug: 'epic1', storySlug: 'story1' }));

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.length).toBe(EXPECTED_COUNT_ONE);
      expect(res.body[0].epicSlug).toBe('epic1');
      expect(res.body[0].storySlug).toBe('story1');
    });

    it('should filter by status=running', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          status: 'running',
        }),
        createMockSession({
          name: 'saga__epic1__story2__222',
          status: 'completed',
        }),
        createMockSession({
          name: 'saga__epic1__story3__333',
          status: 'running',
        }),
      ];
      mockGetCurrentSessions.mockReturnValue(mockSessions);

      const res = await request(app).get('/api/sessions?status=running');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.length).toBe(EXPECTED_COUNT_TWO);
      expect(res.body.every((s: DetailedSessionInfo) => s.status === 'running')).toBe(true);
    });

    it('should filter by status=completed', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          status: 'running',
        }),
        createMockSession({
          name: 'saga__epic1__story2__222',
          status: 'completed',
        }),
      ];
      mockGetCurrentSessions.mockReturnValue(mockSessions);

      const res = await request(app).get('/api/sessions?status=completed');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.length).toBe(EXPECTED_COUNT_ONE);
      expect(res.body[0].status).toBe('completed');
    });

    it('should apply filters in order: epicSlug, then storySlug, then status', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          epicSlug: 'epic1',
          storySlug: 'story1',
          status: 'running',
        }),
        createMockSession({
          name: 'saga__epic1__story1__222',
          epicSlug: 'epic1',
          storySlug: 'story1',
          status: 'completed',
        }),
        createMockSession({
          name: 'saga__epic1__story2__333',
          epicSlug: 'epic1',
          storySlug: 'story2',
          status: 'running',
        }),
        createMockSession({
          name: 'saga__epic2__story1__444',
          epicSlug: 'epic2',
          storySlug: 'story1',
          status: 'running',
        }),
      ];
      mockGetCurrentSessions.mockReturnValue(mockSessions);

      const res = await request(app).get(
        sessionsPath({
          epicSlug: 'epic1',
          storySlug: 'story1',
          status: 'running',
        }),
      );

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.length).toBe(EXPECTED_COUNT_ONE);
      expect(res.body[0].name).toBe('saga__epic1__story1__111');
    });

    it('should return results sorted by startTime descending', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          startTime: new Date('2026-01-29T10:00:00Z'),
        }),
        createMockSession({
          name: 'saga__epic1__story2__222',
          startTime: new Date('2026-01-29T12:00:00Z'),
        }),
        createMockSession({
          name: 'saga__epic1__story3__333',
          startTime: new Date('2026-01-29T08:00:00Z'),
        }),
      ];
      // Sessions are already sorted by session-polling, but we verify it's maintained
      mockGetCurrentSessions.mockReturnValue([
        mockSessions[1], // newest
        mockSessions[0],
        mockSessions[2], // oldest
      ]);

      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.length).toBe(EXPECTED_COUNT_THREE);
      // Results should maintain the sorted order
      expect(res.body[0].name).toBe('saga__epic1__story2__222');
      expect(res.body[2].name).toBe('saga__epic1__story3__333');
    });

    it('should return empty array when filters match nothing', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          epicSlug: 'epic1',
        }),
      ];
      mockGetCurrentSessions.mockReturnValue(mockSessions);

      const res = await request(app).get('/api/sessions?epicSlug=nonexistent');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body).toEqual([]);
    });

    it('should ignore storySlug filter when epicSlug is not provided', async () => {
      const mockSessions = [
        createMockSession({
          name: 'saga__epic1__story1__111',
          epicSlug: 'epic1',
          storySlug: 'story1',
        }),
        createMockSession({
          name: 'saga__epic2__story1__222',
          epicSlug: 'epic2',
          storySlug: 'story1',
        }),
      ];
      mockGetCurrentSessions.mockReturnValue(mockSessions);

      // storySlug without epicSlug should be ignored
      const res = await request(app).get('/api/sessions?storySlug=story1');

      expect(res.status).toBe(HTTP_OK);
      // Should return all sessions since storySlug is ignored without epicSlug
      expect(res.body.length).toBe(EXPECTED_COUNT_TWO);
    });
  });

  describe('GET /api/sessions/:sessionName', () => {
    it('should return session by exact name', async () => {
      const mockSession = createMockSession({
        name: 'saga__test-epic__test-story__12345',
      });
      mockGetCurrentSessions.mockReturnValue([mockSession]);

      const res = await request(app).get('/api/sessions/saga__test-epic__test-story__12345');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.name).toBe('saga__test-epic__test-story__12345');
    });

    it('should return full SessionInfo object', async () => {
      const startTime = new Date('2026-01-29T10:00:00Z');
      const endTime = new Date('2026-01-29T11:00:00Z');
      const mockSession = createMockSession({
        name: 'saga__test-epic__test-story__12345',
        epicSlug: 'test-epic',
        storySlug: 'test-story',
        status: 'completed',
        outputFile: '/tmp/saga-sessions/saga__test-epic__test-story__12345.out',
        outputAvailable: true,
        startTime,
        endTime,
        outputPreview: 'Final output',
      });
      mockGetCurrentSessions.mockReturnValue([mockSession]);

      const res = await request(app).get('/api/sessions/saga__test-epic__test-story__12345');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body).toMatchObject({
        name: 'saga__test-epic__test-story__12345',
        epicSlug: 'test-epic',
        storySlug: 'test-story',
        status: 'completed',
        outputFile: '/tmp/saga-sessions/saga__test-epic__test-story__12345.out',
        outputAvailable: true,
        outputPreview: 'Final output',
      });
      expect(res.body.startTime).toBeDefined();
      expect(res.body.endTime).toBeDefined();
    });

    it('should return 404 for unknown session', async () => {
      mockGetCurrentSessions.mockReturnValue([]);

      const res = await request(app).get('/api/sessions/nonexistent');

      expect(res.status).toBe(HTTP_NOT_FOUND);
      expect(res.body.error).toBe('Session not found');
    });

    it('should require exact name match', async () => {
      const mockSession = createMockSession({
        name: 'saga__test-epic__test-story__12345',
      });
      mockGetCurrentSessions.mockReturnValue([mockSession]);

      // Partial match should fail
      const res = await request(app).get('/api/sessions/saga__test-epic__test-story');

      expect(res.status).toBe(HTTP_NOT_FOUND);
      expect(res.body.error).toBe('Session not found');
    });

    it('should handle URL-encoded session names', async () => {
      const mockSession = createMockSession({
        name: 'saga__test-epic__test-story__12345',
      });
      mockGetCurrentSessions.mockReturnValue([mockSession]);

      // URL encoding of saga__test-epic__test-story__12345
      const res = await request(app).get('/api/sessions/saga__test-epic__test-story__12345');

      expect(res.status).toBe(HTTP_OK);
      expect(res.body.name).toBe('saga__test-epic__test-story__12345');
    });
  });
});
