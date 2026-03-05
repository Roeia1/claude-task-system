/**
 * REST API Routes
 *
 * Provides endpoints for reading epic and story data:
 * - GET /api/epics/:epicId - returns ParsedEpic with full story list and dependencies
 * - GET /api/stories - returns all stories (standalone + epic-owned) with epicName resolved
 * - GET /api/stories/:storyId - returns StoryDetail with parsed journal
 */

import { type Request, type Response, Router } from 'express';
import {
  getAllStoriesWithEpicNames,
  parseJournal,
  parseStory,
  scanSagaDirectory,
} from './parser.ts';
import { createSessionApiRouter } from './session-routes.ts';

// HTTP status codes
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

/**
 * Register epics endpoints on router
 */
function registerEpicsRoutes(router: Router, sagaRoot: string): void {
  /**
   * GET /api/epics/:epicId
   * Returns epic detail with full story list and dependency graph
   */
  router.get('/epics/:epicId', (req: Request, res: Response) => {
    try {
      const { epicId } = req.params;
      const { epics } = scanSagaDirectory(sagaRoot);
      const epic = epics.find((e) => e.id === epicId);

      if (!epic) {
        res.status(HTTP_NOT_FOUND).json({ error: `Epic not found: ${epicId}` });
        return;
      }

      res.json(epic);
    } catch (_error) {
      res.status(HTTP_INTERNAL_ERROR).json({ error: 'Failed to fetch epic' });
    }
  });
}

/**
 * Register stories endpoints on router
 */
function registerStoriesRoutes(router: Router, sagaRoot: string): void {
  /**
   * GET /api/stories
   * Returns all stories (standalone + epic-owned) with epicName resolved
   */
  router.get('/stories', (_req: Request, res: Response) => {
    try {
      const allStories = getAllStoriesWithEpicNames(sagaRoot);
      res.json(allStories);
    } catch (_error) {
      res.status(HTTP_INTERNAL_ERROR).json({ error: 'Failed to fetch stories' });
    }
  });

  /**
   * GET /api/stories/:storyId
   * Returns story detail with parsed journal
   */
  router.get('/stories/:storyId', async (req: Request, res: Response) => {
    try {
      const { storyId } = req.params;
      const story = parseStory(sagaRoot, storyId);

      if (!story) {
        res.status(HTTP_NOT_FOUND).json({ error: `Story not found: ${storyId}` });
        return;
      }

      // If story has a journal path, parse it
      if (story.journalPath) {
        const journal = await parseJournal(story.journalPath);
        if (journal.length > 0) {
          story.journal = journal;
        }
      }

      res.json(story);
    } catch (_error) {
      res.status(HTTP_INTERNAL_ERROR).json({ error: 'Failed to fetch story' });
    }
  });
}

/**
 * Create the API router
 *
 * @param sagaRoot - Path to the project root with .saga/ directory
 * @returns Express router with API endpoints
 */
export function createApiRouter(sagaRoot: string): Router {
  const router = Router();

  // Register route handlers
  registerEpicsRoutes(router, sagaRoot);
  registerStoriesRoutes(router, sagaRoot);

  // Session routes
  router.use(createSessionApiRouter());

  // Catch-all for unknown API routes
  router.use((_req: Request, res: Response) => {
    res.status(HTTP_NOT_FOUND).json({ error: 'API endpoint not found' });
  });

  return router;
}
