/**
 * Finder utility for resolving epic and story identifiers
 *
 * This module provides functions to find epics and stories by ID or title
 * with fuzzy matching support powered by Fuse.js.
 *
 * Uses the shared saga-scanner for directory traversal.
 */

import { readdirSync } from 'node:fs';
import Fuse, { type FuseResult } from 'fuse.js';
import { createSagaPaths } from '../../directory.ts';
import type { TaskStatus } from '../../schemas/index.ts';
import {
  epicsDirectoryExists,
  type ScannedStory,
  scanStories,
  storiesDirectoryExists,
} from '../../storage.ts';

/** Regex pattern for stripping .json extension from file names */
const JSON_EXT_PATTERN = /\.json$/;

// ============================================================================
// Types
// ============================================================================

interface EpicInfo {
  id: string;
}

interface StoryInfo {
  storyId: string;
  title: string;
  status: TaskStatus;
  description: string;
  epicId: string;
  storyPath: string;
  worktreePath: string;
}

type FindResult<T> =
  | { found: true; data: T }
  | { found: false; matches: T[] }
  | { found: false; error: string };

interface FindStoryOptions {
  status?: TaskStatus;
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
    storyId: story.id,
    title: story.title,
    status: story.status,
    description: story.description,
    epicId: story.epic || '',
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
 * Get all epic IDs from the epics directory.
 *
 * Reads *.json files from .saga/epics/.
 */
function getEpicIds(projectPath: string): string[] {
  const sagaPaths = createSagaPaths(projectPath);
  return readdirSync(sagaPaths.epics, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.json'))
    .map((d) => d.name.replace(JSON_EXT_PATTERN, ''));
}

/**
 * Find exact match for epic ID
 */
function findExactEpicMatch(epicIds: string[], queryNormalized: string): EpicInfo | null {
  for (const id of epicIds) {
    if (id.toLowerCase() === queryNormalized) {
      return { id };
    }
  }
  return null;
}

/**
 * Perform fuzzy search on epics
 */
function fuzzySearchEpics(epicIds: string[], query: string): FindResult<EpicInfo> {
  const epics = epicIds.map((id) => ({ id }));
  const fuse = new Fuse(epics, {
    keys: ['id'],
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
 * Find an epic by ID using fuzzy matching
 *
 * Epic resolution uses .json file names in .saga/epics/.
 *
 * @param projectPath - Path to the project root
 * @param query - The identifier to resolve
 * @returns FindResult with epic info or matches/error
 */
function findEpic(projectPath: string, query: string): FindResult<EpicInfo> {
  if (!epicsDirectoryExists(projectPath)) {
    return { found: false, error: 'No .saga/epics/ directory found' };
  }

  const epicIds = getEpicIds(projectPath);

  if (epicIds.length === 0) {
    return { found: false, error: `No epic found matching '${query}'` };
  }

  // Normalize query for exact matching
  const queryNormalized = query.toLowerCase().replace(/_/g, '-');

  // Check for exact match first (fast path)
  const exactMatch = findExactEpicMatch(epicIds, queryNormalized);
  if (exactMatch) {
    return { found: true, data: exactMatch };
  }

  // Use fuzzy search
  return fuzzySearchEpics(epicIds, query);
}

// ============================================================================
// Story Resolution Helpers
// ============================================================================

/**
 * Find exact match for story ID
 */
function findExactStoryMatch(allStories: StoryInfo[], queryNormalized: string): StoryInfo | null {
  for (const story of allStories) {
    if (normalize(story.storyId) === queryNormalized) {
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
      { name: 'storyId', weight: 2 }, // Prioritize ID matches
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
function loadAndFilterStories(
  projectPath: string,
  query: string,
  options: FindStoryOptions,
): FindResult<StoryInfo> | StoryInfo[] {
  const scannedStories = scanStories(projectPath);

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
 * Find a story by ID or title using fuzzy matching
 *
 * Story resolution searches for stories in:
 * - .saga/stories/{story-id}/story.json
 *
 * Worktree and journal paths are detected automatically.
 *
 * Uses the shared saga-scanner for directory traversal.
 *
 * @param projectPath - Path to the project root
 * @param query - The identifier to resolve
 * @param options - Optional filters (status)
 * @returns FindResult with story info or matches/error
 */
function findStory(
  projectPath: string,
  query: string,
  options: FindStoryOptions = {},
): FindResult<StoryInfo> {
  if (!storiesDirectoryExists(projectPath)) {
    return {
      found: false,
      error: 'No .saga/stories/ directory found. Run /generate-stories first.',
    };
  }

  const storiesOrError = loadAndFilterStories(projectPath, query, options);

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

export { findEpic, findStory };
export type { EpicInfo, FindResult, FindStoryOptions, StoryInfo };
export type { ScannedStory } from '../../storage.ts';
