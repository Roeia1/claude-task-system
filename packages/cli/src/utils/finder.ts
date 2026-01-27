/**
 * Finder utility for resolving epic and story identifiers
 *
 * This module provides functions to find epics and stories by slug or title
 * with fuzzy matching support powered by Fuse.js.
 *
 * Uses the shared saga-scanner for directory traversal.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import Fuse from 'fuse.js';
import {
  scanAllStories,
  scanEpics,
  epicsDirectoryExists,
  worktreesDirectoryExists,
  parseFrontmatter,
  type ScannedStory,
} from './saga-scanner.js';

// ============================================================================
// Types
// ============================================================================

export interface EpicInfo {
  slug: string;
}

export interface StoryInfo {
  slug: string;
  title: string;
  status: string;
  context: string;
  epicSlug: string;
  storyPath: string;
  worktreePath: string;
}

export type FindResult<T> =
  | { found: true; data: T }
  | { found: false; matches: T[] }
  | { found: false; error: string };

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

// Re-export parseFrontmatter for backward compatibility
export { parseFrontmatter } from './saga-scanner.js';

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
export function extractContext(body: string, maxLength: number = 300): string {
  // Look for ## Context section (case-insensitive)
  const contextMatch = body.match(/##\s*Context\s*\n+([\s\S]*?)(?=\n##|\Z|$)/i);

  if (!contextMatch) {
    return '';
  }

  let context = contextMatch[1].trim();

  if (context.length > maxLength) {
    return context.slice(0, maxLength - 3) + '...';
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
export function findEpic(projectPath: string, query: string): FindResult<EpicInfo> {
  const epicsDir = join(projectPath, '.saga', 'epics');

  if (!epicsDirectoryExists(projectPath)) {
    return {
      found: false,
      error: 'No .saga/epics/ directory found',
    };
  }

  // List all epic folders
  const epicSlugs = readdirSync(epicsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (epicSlugs.length === 0) {
    return {
      found: false,
      error: `No epic found matching '${query}'`,
    };
  }

  // Normalize query for exact matching
  const queryNormalized = query.toLowerCase().replace(/_/g, '-');

  // Check for exact match first (fast path)
  for (const slug of epicSlugs) {
    if (slug.toLowerCase() === queryNormalized) {
      return {
        found: true,
        data: { slug },
      };
    }
  }

  // Use Fuse.js for fuzzy matching
  const epics = epicSlugs.map((slug) => ({ slug }));
  const fuse = new Fuse(epics, {
    keys: ['slug'],
    threshold: MATCH_THRESHOLD,
    includeScore: true,
  });

  const results = fuse.search(query);

  if (results.length === 0) {
    return {
      found: false,
      error: `No epic found matching '${query}'`,
    };
  }

  // If only one match, return it
  if (results.length === 1) {
    return {
      found: true,
      data: results[0].item,
    };
  }

  // Check if there are multiple similar scores
  const bestScore = results[0].score ?? 0;
  const similarMatches = results.filter(
    (r) => (r.score ?? 0) - bestScore <= SCORE_SIMILARITY_THRESHOLD
  );

  // If multiple matches have similar scores, return all for disambiguation
  if (similarMatches.length > 1) {
    return {
      found: false,
      matches: similarMatches.map((r) => r.item),
    };
  }

  // If best match is significantly better than others and good enough, return it
  if (bestScore <= FUZZY_THRESHOLD) {
    return {
      found: true,
      data: results[0].item,
    };
  }

  // Multiple matches with varying scores - return all for disambiguation
  return {
    found: false,
    matches: results.map((r) => r.item),
  };
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
 * @returns Promise resolving to FindResult with story info or matches/error
 */
export async function findStory(projectPath: string, query: string): Promise<FindResult<StoryInfo>> {
  if (!worktreesDirectoryExists(projectPath) && !epicsDirectoryExists(projectPath)) {
    return {
      found: false,
      error: 'No .saga/worktrees/ or .saga/epics/ directory found. Run /generate-stories first.',
    };
  }

  // Use shared scanner to get all stories
  const scannedStories = await scanAllStories(projectPath);

  if (scannedStories.length === 0) {
    return {
      found: false,
      error: `No story found matching '${query}'`,
    };
  }

  // Convert to StoryInfo format
  const allStories = scannedStories.map(toStoryInfo);

  // Normalize query for exact matching
  const queryNormalized = normalize(query);

  // Check for exact match on slug first (fast path)
  for (const story of allStories) {
    if (normalize(story.slug) === queryNormalized) {
      return {
        found: true,
        data: story,
      };
    }
  }

  // Use Fuse.js for fuzzy matching on slug and title
  const fuse = new Fuse(allStories, {
    keys: [
      { name: 'slug', weight: 2 },   // Prioritize slug matches
      { name: 'title', weight: 1 },
    ],
    threshold: MATCH_THRESHOLD,
    includeScore: true,
  });

  const results = fuse.search(query);

  if (results.length === 0) {
    return {
      found: false,
      error: `No story found matching '${query}'`,
    };
  }

  // If only one match, return it
  if (results.length === 1) {
    return {
      found: true,
      data: results[0].item,
    };
  }

  // Check if there are multiple similar scores
  const bestScore = results[0].score ?? 0;
  const similarMatches = results.filter(
    (r) => (r.score ?? 0) - bestScore <= SCORE_SIMILARITY_THRESHOLD
  );

  // If multiple matches have similar scores, return all for disambiguation
  if (similarMatches.length > 1) {
    return {
      found: false,
      matches: similarMatches.map((r) => r.item),
    };
  }

  // If best match is significantly better than others and good enough, return it
  if (bestScore <= FUZZY_THRESHOLD) {
    return {
      found: true,
      data: results[0].item,
    };
  }

  // Multiple matches with varying scores - return all for disambiguation
  return {
    found: false,
    matches: results.map((r) => r.item),
  };
}
