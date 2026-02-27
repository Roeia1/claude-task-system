/**
 * REST API Routes
 *
 * Provides endpoints for reading epic and story data:
 * - GET /api/epics - returns EpicSummary[]
 * - GET /api/epics/:epicId - returns ParsedEpic with full story list and dependencies
 * - GET /api/stories - returns standalone stories (not belonging to any epic)
 * - GET /api/stories?all=true - returns all stories (standalone + epic-owned) with epicName resolved
 * - GET /api/stories/:storyId - returns StoryDetail with parsed journal
 */

import { type Request, type Response, Router } from 'express';
import {
  type EpicSummary,
  getAllStoriesWithEpicNames,
  type ParsedEpic,
  parseJournal,
  parseStory,
  type ScanResult,
  scanSagaDirectory,
} from './parser.ts';
import { createSessionApiRouter } from './session-routes.ts';

// HTTP status codes
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

/**
 * Scan the saga directory and return structured data
 */
function getScanResult(sagaRoot: string): ScanResult {
  return scanSagaDirectory(sagaRoot);
}

/**
 * Convert ParsedEpic to EpicSummary (remove stories, children, and content)
 */
function toEpicSummary(epic: ParsedEpic): EpicSummary {
  return {
    id: epic.id,
    title: epic.title,
    description: epic.description,
    status: epic.status,
    storyCounts: epic.storyCounts,
  };
}

/**
 * Register epics endpoints on router
 */
function registerEpicsRoutes(router: Router, sagaRoot: string): void {
  /**
   * GET /api/epics
   * Returns list of epic summaries without full story details
   */
  router.get('/epics', (_req: Request, res: Response) => {
    try {
      const { epics } = getScanResult(sagaRoot);
      const summaries = epics.map(toEpicSummary);
      res.json(summaries);
    } catch (_error) {
      res.status(HTTP_INTERNAL_ERROR).json({ error: 'Failed to fetch epics' });
    }
  });

  /**
   * GET /api/epics/:epicId
   * Returns epic detail with full story list and dependency graph
   */
  router.get('/epics/:epicId', (req: Request, res: Response) => {
    try {
      const { epicId } = req.params;
      const { epics } = getScanResult(sagaRoot);
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
   * Returns standalone stories (those not belonging to any epic)
   * With ?all=true, returns all stories (standalone + epic-owned) with epicName resolved
   */
  router.get('/stories', (req: Request, res: Response) => {
    try {
      if (req.query.all === 'true') {
        const allStories = getAllStoriesWithEpicNames(sagaRoot);
        res.json(allStories);
        return;
      }
      const { standaloneStories } = getScanResult(sagaRoot);
      res.json(standaloneStories);
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
