/**
 * Shared SAGA Directory Scanner
 *
 * Core directory traversal logic for scanning .saga/ structure.
 * Used by both the finder utility (CLI) and parser (server).
 */

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
	createArchivePaths,
	createEpicPaths,
	createSagaPaths,
	createStoryPaths,
	createWorktreePaths,
	type StoryStatus,
} from "@saga-ai/types";

// ============================================================================
// Constants
// ============================================================================

/** Starting position to search for frontmatter end marker (after opening "---\n") */
const FRONTMATTER_START_OFFSET = 3;

/** Length of opening "---\n" marker */
const FRONTMATTER_OPEN_LENGTH = 4;

/** Length of closing "\n---" marker */
const FRONTMATTER_CLOSE_LENGTH = 4;

/** Regex pattern for extracting epic title from first # heading */
const EPIC_TITLE_PATTERN = /^#\s+(.+)$/m;

/** Regex pattern for removing /story.md suffix from paths */
const STORY_MD_SUFFIX_PATTERN = /\/story\.md$/;

// ============================================================================
// Types
// ============================================================================

/**
 * Basic story information from scanning
 */
interface ScannedStory {
	/** Story slug (from frontmatter id/slug or directory name) */
	slug: string;
	/** Story title from frontmatter */
	title: string;
	/** Story status from frontmatter */
	status: StoryStatus;
	/** Parent epic slug */
	epicSlug: string;
	/** Full path to story.md */
	storyPath: string;
	/** Full path to worktree directory (if from worktree) */
	worktreePath?: string;
	/** Full path to journal.md (if exists) */
	journalPath?: string;
	/** Whether this is an archived story */
	archived?: boolean;
	/** Raw frontmatter for additional parsing */
	frontmatter: Record<string, unknown>;
	/** Raw body content for additional parsing */
	body: string;
}

/**
 * Basic epic information from scanning
 */
interface ScannedEpic {
	/** Epic slug (directory name) */
	slug: string;
	/** Epic title (from first # heading) */
	title: string;
	/** Full path to epic directory */
	epicPath: string;
	/** Full path to epic.md */
	epicMdPath: string;
	/** Raw content of epic.md */
	content: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a path is a directory
 */
async function isDirectory(path: string): Promise<boolean> {
	try {
		const stats = await stat(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
	frontmatter: Record<string, unknown>;
	body: string;
} {
	if (!content?.startsWith("---")) {
		return { frontmatter: {}, body: content };
	}

	const endIndex = content.indexOf("\n---", FRONTMATTER_START_OFFSET);
	if (endIndex === -1) {
		return { frontmatter: {}, body: content };
	}

	const frontmatterBlock = content.slice(FRONTMATTER_OPEN_LENGTH, endIndex);
	const body = content.slice(endIndex + FRONTMATTER_CLOSE_LENGTH).trim();

	const frontmatter: Record<string, unknown> = {};

	for (const line of frontmatterBlock.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}

		const colonIndex = trimmed.indexOf(":");
		if (colonIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, colonIndex).trim();
		let value: string | unknown[] = trimmed.slice(colonIndex + 1).trim();

		// Handle quoted values
		if (
			(typeof value === "string" &&
				value.startsWith('"') &&
				value.endsWith('"')) ||
			(typeof value === "string" &&
				value.startsWith("'") &&
				value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}

		frontmatter[key] = value;
	}

	return { frontmatter, body };
}

/**
 * Extract title from epic.md (first # heading)
 */
function extractEpicTitle(content: string): string | null {
	const match = content.match(EPIC_TITLE_PATTERN);
	return match ? match[1].trim() : null;
}

// ============================================================================
// Story Scanning
// ============================================================================

/**
 * Parse a single story.md file using simple frontmatter parsing
 *
 * Note: This uses a simple key-value parser which handles the fields needed
 * for finder (id, slug, title, status). For complex YAML with arrays (like tasks),
 * the CLI's saga-scanner uses gray-matter, but the finder only needs these simple fields.
 */
async function parseStoryFile(
	storyPath: string,
	epicSlug: string,
	options: { worktreePath?: string; archived?: boolean } = {},
): Promise<ScannedStory | null> {
	try {
		const content = await readFile(storyPath, "utf-8");
		const storyDir = storyPath.replace(STORY_MD_SUFFIX_PATTERN, "");
		const dirName = storyDir.split("/").pop() || "unknown";

		// Use simple frontmatter parsing (sufficient for finder's needs)
		const parsed = parseFrontmatter(content);
		const frontmatter = parsed.frontmatter;
		const body = parsed.body;

		// Check for journal.md
		const journalPath = join(storyDir, "journal.md");
		const hasJournal = await fileExists(journalPath);

		return {
			slug:
				(frontmatter.id as string) || (frontmatter.slug as string) || dirName,
			title: (frontmatter.title as string) || dirName,
			status: (frontmatter.status as StoryStatus) || "ready",
			epicSlug,
			storyPath,
			worktreePath: options.worktreePath,
			journalPath: hasJournal ? journalPath : undefined,
			archived: options.archived,
			frontmatter,
			body,
		};
	} catch {
		return null;
	}
}

/**
 * Scan worktrees directory for stories
 *
 * Structure: .saga/worktrees/<epic>/<story>/.saga/epics/<epic>/stories/<story>/story.md
 */
async function scanWorktrees(sagaRoot: string): Promise<ScannedStory[]> {
	const sagaPaths = createSagaPaths(sagaRoot);

	if (!(await isDirectory(sagaPaths.worktrees))) {
		return [];
	}

	const epicEntries = await readdir(sagaPaths.worktrees);

	const epicPromises = epicEntries.map(async (epicSlug) => {
		const epicWorktreesDir = join(sagaPaths.worktrees, epicSlug);

		if (!(await isDirectory(epicWorktreesDir))) {
			return [];
		}

		const storyEntries = await readdir(epicWorktreesDir);

		const storyPromises = storyEntries.map(async (storySlug) => {
			const worktreePaths = createWorktreePaths(sagaRoot, epicSlug, storySlug);

			if (!(await isDirectory(worktreePaths.worktreeDir))) {
				return null;
			}

			return await parseStoryFile(worktreePaths.storyMdInWorktree, epicSlug, {
				worktreePath: worktreePaths.worktreeDir,
			});
		});

		const stories = await Promise.all(storyPromises);
		return stories.filter((story) => story !== null);
	});

	const epicStories = await Promise.all(epicPromises);
	return epicStories.flat();
}

/**
 * Scan main epics directory for stories
 *
 * Structure: .saga/epics/<epic>/stories/<story>/story.md
 */
async function scanEpicsStories(sagaRoot: string): Promise<ScannedStory[]> {
	const sagaPaths = createSagaPaths(sagaRoot);

	if (!(await isDirectory(sagaPaths.epics))) {
		return [];
	}

	const epicEntries = await readdir(sagaPaths.epics);

	const epicPromises = epicEntries.map(async (epicSlug) => {
		const epicPaths = createEpicPaths(sagaRoot, epicSlug);

		if (!(await isDirectory(epicPaths.storiesDir))) {
			return [];
		}

		const storyEntries = await readdir(epicPaths.storiesDir);

		const storyPromises = storyEntries.map(async (storySlug) => {
			const storyPaths = createStoryPaths(sagaRoot, epicSlug, storySlug);

			if (!(await isDirectory(storyPaths.storyDir))) {
				return null;
			}

			return await parseStoryFile(storyPaths.storyMd, epicSlug);
		});

		const stories = await Promise.all(storyPromises);
		return stories.filter((story) => story !== null);
	});

	const epicStories = await Promise.all(epicPromises);
	return epicStories.flat();
}

/**
 * Scan archive directory for stories
 *
 * Structure: .saga/archive/<epic>/<story>/story.md
 */
async function scanArchive(sagaRoot: string): Promise<ScannedStory[]> {
	const sagaPaths = createSagaPaths(sagaRoot);

	if (!(await isDirectory(sagaPaths.archive))) {
		return [];
	}

	const epicEntries = await readdir(sagaPaths.archive);

	const epicPromises = epicEntries.map(async (epicSlug) => {
		const archivePaths = createArchivePaths(sagaRoot, epicSlug);

		if (!(await isDirectory(archivePaths.archiveEpicDir))) {
			return [];
		}

		const storyEntries = await readdir(archivePaths.archiveEpicDir);

		const storyPromises = storyEntries.map(async (storySlug) => {
			const storyArchivePaths = createArchivePaths(
				sagaRoot,
				epicSlug,
				storySlug,
			);

			if (
				!(
					storyArchivePaths.archiveStoryDir &&
					(await isDirectory(storyArchivePaths.archiveStoryDir))
				)
			) {
				return null;
			}

			if (!storyArchivePaths.archiveStoryMd) {
				return null;
			}

			return await parseStoryFile(storyArchivePaths.archiveStoryMd, epicSlug, {
				archived: true,
			});
		});

		const stories = await Promise.all(storyPromises);
		return stories.filter((story) => story !== null);
	});

	const epicStories = await Promise.all(epicPromises);
	return epicStories.flat();
}

/**
 * Scan all story locations and return deduplicated list
 *
 * Priority: worktrees > epics > archive (worktree version preferred if exists in multiple)
 */
async function scanAllStories(sagaRoot: string): Promise<ScannedStory[]> {
	const [worktreeStories, epicsStories, archivedStories] = await Promise.all([
		scanWorktrees(sagaRoot),
		scanEpicsStories(sagaRoot),
		scanArchive(sagaRoot),
	]);

	// Deduplicate: worktree takes precedence
	const seen = new Set<string>();
	const result: ScannedStory[] = [];

	// Add worktree stories first (highest priority)
	for (const story of worktreeStories) {
		const key = `${story.epicSlug}/${story.slug}`;
		if (!seen.has(key)) {
			seen.add(key);
			result.push(story);
		}
	}

	// Add epics stories (if not already from worktree)
	for (const story of epicsStories) {
		const key = `${story.epicSlug}/${story.slug}`;
		if (!seen.has(key)) {
			seen.add(key);
			result.push(story);
		}
	}

	// Add archived stories
	for (const story of archivedStories) {
		const key = `${story.epicSlug}/${story.slug}`;
		if (!seen.has(key)) {
			seen.add(key);
			result.push(story);
		}
	}

	return result;
}

// ============================================================================
// Epic Scanning
// ============================================================================

/**
 * Scan epics directory for epic metadata
 */
async function scanEpics(sagaRoot: string): Promise<ScannedEpic[]> {
	const sagaPaths = createSagaPaths(sagaRoot);

	if (!(await isDirectory(sagaPaths.epics))) {
		return [];
	}

	const epicEntries = await readdir(sagaPaths.epics);

	const epicPromises = epicEntries.map(async (epicSlug) => {
		const epicPaths = createEpicPaths(sagaRoot, epicSlug);

		if (!(await isDirectory(epicPaths.epicDir))) {
			return null;
		}

		let content = "";
		let title = epicSlug;

		try {
			content = await readFile(epicPaths.epicMd, "utf-8");
			title = extractEpicTitle(content) || epicSlug;
		} catch {
			// No epic.md, use slug as title
		}

		return {
			slug: epicSlug,
			title,
			epicPath: epicPaths.epicDir,
			epicMdPath: epicPaths.epicMd,
			content,
		};
	});

	const epics = await Promise.all(epicPromises);
	return epics.filter((epic) => epic !== null);
}

/**
 * Check if .saga directory exists
 */
function sagaDirectoryExists(projectPath: string): boolean {
	const sagaPaths = createSagaPaths(projectPath);
	return existsSync(sagaPaths.saga);
}

/**
 * Check if worktrees directory exists
 */
function worktreesDirectoryExists(projectPath: string): boolean {
	const sagaPaths = createSagaPaths(projectPath);
	return existsSync(sagaPaths.worktrees);
}

/**
 * Check if epics directory exists
 */
function epicsDirectoryExists(projectPath: string): boolean {
	const sagaPaths = createSagaPaths(projectPath);
	return existsSync(sagaPaths.epics);
}

export {
	parseFrontmatter,
	scanWorktrees,
	scanEpicsStories,
	scanArchive,
	scanAllStories,
	scanEpics,
	sagaDirectoryExists,
	worktreesDirectoryExists,
	epicsDirectoryExists,
};
export type { ScannedStory, ScannedEpic };
