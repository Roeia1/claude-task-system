/**
 * REST API Routes
 *
 * Provides endpoints for reading epic and story data:
 * - GET /api/epics - returns EpicSummary[]
 * - GET /api/epics/:slug - returns Epic with full story list
 * - GET /api/stories/:epicSlug/:storySlug - returns StoryDetail with parsed journal
 */

import { join } from "node:path";
import { type Request, type Response, Router } from "express";
import {
	type Epic,
	type EpicSummary,
	parseJournal,
	type StoryDetail,
	scanSagaDirectory,
} from "./parser.ts";
import { createSessionApiRouter } from "./session-routes.ts";

// HTTP status codes
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;

/**
 * Get epics by scanning the saga directory
 *
 * Note: The file watcher triggers WebSocket updates on changes,
 * so fresh scanning on each request ensures data consistency.
 */
function getEpics(sagaRoot: string): Promise<Epic[]> {
	return scanSagaDirectory(sagaRoot);
}

/**
 * Convert Epic to EpicSummary (remove stories and content)
 */
function toEpicSummary(epic: Epic): EpicSummary {
	return {
		slug: epic.slug,
		title: epic.title,
		storyCounts: epic.storyCounts,
		path: epic.path,
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
	router.get("/epics", async (_req: Request, res: Response) => {
		try {
			const epics = await getEpics(sagaRoot);
			const summaries = epics.map(toEpicSummary);
			res.json(summaries);
		} catch (_error) {
			res.status(HTTP_INTERNAL_ERROR).json({ error: "Failed to fetch epics" });
		}
	});

	/**
	 * GET /api/epics/:slug
	 * Returns epic detail with full story list
	 */
	router.get("/epics/:slug", async (req: Request, res: Response) => {
		try {
			const { slug } = req.params;
			const epics = await getEpics(sagaRoot);
			const epic = epics.find((e) => e.slug === slug);

			if (!epic) {
				res.status(HTTP_NOT_FOUND).json({ error: `Epic not found: ${slug}` });
				return;
			}

			res.json(epic);
		} catch (_error) {
			res.status(HTTP_INTERNAL_ERROR).json({ error: "Failed to fetch epic" });
		}
	});
}

/**
 * Register stories endpoints on router
 */
function registerStoriesRoutes(router: Router, sagaRoot: string): void {
	/**
	 * GET /api/stories/:epicSlug/:storySlug
	 * Returns story detail with parsed journal
	 */
	router.get(
		"/stories/:epicSlug/:storySlug",
		async (req: Request, res: Response) => {
			try {
				const { epicSlug, storySlug } = req.params;
				const epics = await getEpics(sagaRoot);
				const epic = epics.find((e) => e.slug === epicSlug);

				if (!epic) {
					res
						.status(HTTP_NOT_FOUND)
						.json({ error: `Epic not found: ${epicSlug}` });
					return;
				}

				const story = epic.stories.find((s) => s.slug === storySlug);

				if (!story) {
					res
						.status(HTTP_NOT_FOUND)
						.json({ error: `Story not found: ${storySlug}` });
					return;
				}

				// If story has a journal path, parse it
				if (story.paths.journalMd) {
					const journalPath = join(sagaRoot, story.paths.journalMd);
					const journal = await parseJournal(journalPath);
					if (journal.length > 0) {
						(story as StoryDetail).journal = journal;
					}
				}

				res.json(story);
			} catch (_error) {
				res
					.status(HTTP_INTERNAL_ERROR)
					.json({ error: "Failed to fetch story" });
			}
		},
	);
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
		res.status(HTTP_NOT_FOUND).json({ error: "API endpoint not found" });
	});

	return router;
}
