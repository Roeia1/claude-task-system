/**
 * Session API Routes
 *
 * Provides endpoints for reading session data:
 * - GET /api/sessions - returns DetailedSessionInfo[] with optional filters
 * - GET /api/sessions/:sessionName - returns DetailedSessionInfo for a specific session
 */

import { Router, type Request, type Response } from 'express';
import { getCurrentSessions } from '../lib/session-polling.js';
import type { DetailedSessionInfo } from '../lib/sessions.js';

/**
 * Create the Session API router
 *
 * @returns Express router with session API endpoints
 */
export function createSessionApiRouter(): Router {
  const router = Router();

  /**
   * GET /api/sessions
   *
   * Returns list of sessions with optional filtering.
   *
   * Query parameters:
   * - epicSlug: Filter by epic slug
   * - storySlug: Filter by story slug (requires epicSlug)
   * - status: Filter by status ('running' or 'completed')
   *
   * Results are sorted by startTime descending (newest first).
   */
  router.get('/sessions', (_req: Request, res: Response) => {
    try {
      let sessions = getCurrentSessions();

      // Apply filters in order: epicSlug, then storySlug (requires epicSlug), then status
      const { epicSlug, storySlug, status } = _req.query;

      // Filter by epicSlug
      if (epicSlug && typeof epicSlug === 'string') {
        sessions = sessions.filter((s) => s.epicSlug === epicSlug);

        // Filter by storySlug (only if epicSlug was provided)
        if (storySlug && typeof storySlug === 'string') {
          sessions = sessions.filter((s) => s.storySlug === storySlug);
        }
      }

      // Filter by status
      if (status && typeof status === 'string' && (status === 'running' || status === 'completed')) {
        sessions = sessions.filter((s) => s.status === status);
      }

      res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  });

  /**
   * GET /api/sessions/:sessionName
   *
   * Returns a specific session by exact name match.
   *
   * Returns 404 if session not found.
   */
  router.get('/sessions/:sessionName', (req: Request, res: Response) => {
    try {
      const { sessionName } = req.params;
      const sessions = getCurrentSessions();
      const session = sessions.find((s) => s.name === sessionName);

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(session);
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ error: 'Failed to fetch session' });
    }
  });

  return router;
}
