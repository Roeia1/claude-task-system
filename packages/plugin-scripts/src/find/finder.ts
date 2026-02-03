/**
 * Finder utility for resolving epic and story identifiers
 *
 * This module provides functions to find epics and stories by slug or title
 * with fuzzy matching support powered by Fuse.js.
 *
 * Uses the shared saga-scanner for directory traversal.
 */

import { readdirSync } from 'node:fs';
import { type StoryStatus, createSagaPaths } from '@saga-ai/types';
import Fuse, { type FuseResult } from 'fuse.js';
import {
  epicsDirectoryExists,
  type ScannedEpic,
  type ScannedStory,
  scanAllStories,
  worktreesDirectoryExists,
} from './saga-scanner.ts';

// ============================================================================
// Types
// ============================================================================

interface EpicInfo {
  slug: string;
}

interface StoryInfo {
  slug: string;
  title: string;
  status: StoryStatus;
  context: string;
  epicSlug: string;
  storyPath: string;
  worktreePath: string;
}

type FindResult<T> =
  | { found: true; data: T }
  | { found: false; matches: T[] }
  | { found: false; error: string };

interface FindStoryOptions {
  status?: StoryStatus;
}

// ============================================================================
// Fuse.js Configuration
// ============================================================================

// Threshold for considering a match "good enough" to auto-select
// Lower = stricter matching (0 = exact match only, 1 = match anything)
const FUZZY_THRESHOLD = 0.3;

// Score threshold for including in multiple matches list
const MATCH_THRESHOLD = 0.6;

// Score difference threshold for considering matches "similar"
// If multiple matches have scores within this range of the best, return all as ambiguous
const SCORE_SIMILARITY_THRESHOLD = 0.1;

// Default maximum length for extracted context
const DEFAULT_CONTEXT_MAX_LENGTH = 300;

// Length of the ellipsis suffix "..."
const ELLIPSIS_LENGTH = 3;

// Regex pattern for extracting ## Context section (case-insensitive)
const CONTEXT_SECTION_REGEX = /##\s*Context\s*\n+([\s\S]*?)(?=\n##|$)/i;

// ============================================================================
// Context Extraction
// ============================================================================

/**
 * Extract the ## Context section from story body
 *
 * @param body - The markdown body content
 * @param maxLength - Maximum length of extracted context (default 300)
 * @returns The context text, truncated if necessary
 */
function extractContext(body: string, maxLength = DEFAULT_CONTEXT_MAX_LENGTH): string {
  // Look for ## Context section (case-insensitive)
  const contextMatch = body.match(CONTEXT_SECTION_REGEX);

  if (!contextMatch) {
    return '';
  }

  const context = contextMatch[1].trim();

  if (context.length > maxLength) {
    return `${context.slice(0, maxLength - ELLIPSIS_LENGTH)}...`;
  }

  return context;
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize a string for exact matching
 * - Lowercase
 * - Replace hyphens and underscores with spaces
 */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[-_]/g, ' ');
}

// ============================================================================
// Helper: Convert ScannedStory to StoryInfo
// ============================================================================

function toStoryInfo(story: ScannedStory): StoryInfo {
  return {
    slug: story.slug,
    title: story.title,
    status: story.status,
    context: extractContext(story.body),
    epicSlug: story.epicSlug,
    storyPath: story.storyPath,
    worktreePath: story.worktreePath || '',
  };
}

// ============================================================================
// Fuzzy Match Result Processing
// ============================================================================

/**
 * Process fuzzy search results and determine the best match or return ambiguous matches
 */
function processFuzzyResults<T>(results: FuseResult<T>[]): FindResult<T> {
  // If only one match, return it
  if (results.length === 1) {
    return { found: true, data: results[0].item };
  }

  // Check if there are multiple similar scores
  const bestScore = results[0].score ?? 0;
  const similarMatches = results.filter(
    (r) => (r.score ?? 0) - bestScore <= SCORE_SIMILARITY_THRESHOLD,
  );

  // If multiple matches have similar scores, return all for disambiguation
  if (similarMatches.length > 1) {
    return { found: false, matches: similarMatches.map((r) => r.item) };
  }

  // If best match is significantly better than others and good enough, return it
  if (bestScore <= FUZZY_THRESHOLD) {
    return { found: true, data: results[0].item };
  }

  // Multiple matches with varying scores - return all for disambiguation
  return { found: false, matches: results.map((r) => r.item) };
}

// ============================================================================
// Epic Resolution Helpers
// ============================================================================

/**
 * Get all epic slugs from the epics directory
 */
function getEpicSlugs(projectPath: string): string[] {
  const sagaPaths = createSagaPaths(projectPath);
  return readdirSync(sagaPaths.epics, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

/**
 * Find exact match for epic slug
 */
function findExactEpicMatch(epicSlugs: string[], queryNormalized: string): EpicInfo | null {
  for (const slug of epicSlugs) {
    if (slug.toLowerCase() === queryNormalized) {
      return { slug };
    }
  }
  return null;
}

/**
 * Perform fuzzy search on epics
 */
function fuzzySearchEpics(epicSlugs: string[], query: string): FindResult<EpicInfo> {
  const epics = epicSlugs.map((slug) => ({ slug }));
  const fuse = new Fuse(epics, {
    keys: ['slug'],
    threshold: MATCH_THRESHOLD,
    includeScore: true,
  });

  const results = fuse.search(query);

  if (results.length === 0) {
    return { found: false, error: `No epic found matching '${query}'` };
  }

  return processFuzzyResults(results);
}

// ============================================================================
// Epic Resolution
// ============================================================================

/**
 * Find an epic by slug using fuzzy matching
 *
 * Epic resolution only uses folder names in .saga/epics/,
 * never reads epic.md files.
 *
 * @param projectPath - Path to the project root
 * @param query - The identifier to resolve
 * @returns FindResult with epic info or matches/error
 */
function findEpic(projectPath: string, query: string): FindResult<EpicInfo> {
  if (!epicsDirectoryExists(projectPath)) {
    return { found: false, error: 'No .saga/epics/ directory found' };
  }

  const epicSlugs = getEpicSlugs(projectPath);

  if (epicSlugs.length === 0) {
    return { found: false, error: `No epic found matching '${query}'` };
  }

  // Normalize query for exact matching
  const queryNormalized = query.toLowerCase().replace(/_/g, '-');

  // Check for exact match first (fast path)
  const exactMatch = findExactEpicMatch(epicSlugs, queryNormalized);
  if (exactMatch) {
    return { found: true, data: exactMatch };
  }

  // Use fuzzy search
  return fuzzySearchEpics(epicSlugs, query);
}

// ============================================================================
// Story Resolution Helpers
// ============================================================================

/**
 * Find exact match for story slug
 */
function findExactStoryMatch(allStories: StoryInfo[], queryNormalized: string): StoryInfo | null {
  for (const story of allStories) {
    if (normalize(story.slug) === queryNormalized) {
      return story;
    }
  }
  return null;
}

/**
 * Perform fuzzy search on stories
 */
function fuzzySearchStories(allStories: StoryInfo[], query: string): FindResult<StoryInfo> {
  const fuse = new Fuse(allStories, {
    keys: [
      { name: 'slug', weight: 2 }, // Prioritize slug matches
      { name: 'title', weight: 1 },
    ],
    threshold: MATCH_THRESHOLD,
    includeScore: true,
  });

  const results = fuse.search(query);

  if (results.length === 0) {
    return { found: false, error: `No story found matching '${query}'` };
  }

  return processFuzzyResults(results);
}

/**
 * Load and filter stories based on options
 */
async function loadAndFilterStories(
  projectPath: string,
  query: string,
  options: FindStoryOptions,
): Promise<FindResult<StoryInfo> | StoryInfo[]> {
  const scannedStories = await scanAllStories(projectPath);

  if (scannedStories.length === 0) {
    return { found: false, error: `No story found matching '${query}'` };
  }

  let allStories = scannedStories.map(toStoryInfo);

  if (options.status) {
    allStories = allStories.filter((story) => story.status === options.status);

    if (allStories.length === 0) {
      return {
        found: false,
        error: `No story found matching '${query}' with status '${options.status}'`,
      };
    }
  }

  return allStories;
}

// ============================================================================
// Story Resolution
// ============================================================================

/**
 * Find a story by slug or title using fuzzy matching
 *
 * Story resolution searches for stories in all locations:
 * - .saga/worktrees/<epic>/<story>/ (worktrees)
 * - .saga/epics/<epic>/stories/<story>/ (main epics)
 * - .saga/archive/<epic>/<story>/ (archived)
 *
 * Uses the shared saga-scanner for directory traversal.
 *
 * @param projectPath - Path to the project root
 * @param query - The identifier to resolve
 * @param options - Optional filters (status)
 * @returns Promise resolving to FindResult with story info or matches/error
 */
async function findStory(
  projectPath: string,
  query: string,
  options: FindStoryOptions = {},
): Promise<FindResult<StoryInfo>> {
  if (!(worktreesDirectoryExists(projectPath) || epicsDirectoryExists(projectPath))) {
    return {
      found: false,
      error: 'No .saga/worktrees/ or .saga/epics/ directory found. Run /generate-stories first.',
    };
  }

  const storiesOrError = await loadAndFilterStories(projectPath, query, options);

  // If it's a FindResult (error), return it
  if (!Array.isArray(storiesOrError)) {
    return storiesOrError;
  }

  const allStories = storiesOrError;

  // Normalize query for exact matching
  const queryNormalized = normalize(query);

  // Check for exact match first (fast path)
  const exactMatch = findExactStoryMatch(allStories, queryNormalized);
  if (exactMatch) {
    return { found: true, data: exactMatch };
  }

  // Use fuzzy search
  return fuzzySearchStories(allStories, query);
}

// ============================================================================
// Exports
// ============================================================================

export { extractContext, findEpic, findStory };
export type { EpicInfo, FindResult, FindStoryOptions, ScannedEpic, ScannedStory, StoryInfo };
