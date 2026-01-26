/**
 * Finder utility for resolving epic and story identifiers
 *
 * This module provides functions to find epics and stories by slug or title
 * with fuzzy matching support powered by Fuse.js.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Fuse from 'fuse.js';

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

interface ParsedContent {
  frontmatter: Record<string, string>;
  body: string;
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
// Frontmatter Parser
// ============================================================================

/**
 * Parse YAML frontmatter from markdown content
 *
 * Implements a minimal parser for simple key: value pairs.
 * Handles quoted values and values containing colons.
 */
export function parseFrontmatter(content: string): ParsedContent {
  if (!content || !content.startsWith('---')) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterBlock = content.slice(4, endIndex);
  const body = content.slice(endIndex + 4).trim();

  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // Handle quoted values
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

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

  if (!existsSync(epicsDir)) {
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
 * Story resolution searches for stories in worktrees, reading YAML front matter
 * from story.md files to match on slug/id and title fields.
 *
 * Stories are located at:
 * .saga/worktrees/<epic>/<story>/.saga/epics/<epic>/stories/<story>/story.md
 *
 * @param projectPath - Path to the project root
 * @param query - The identifier to resolve
 * @returns FindResult with story info or matches/error
 */
export function findStory(projectPath: string, query: string): FindResult<StoryInfo> {
  const worktreesDir = join(projectPath, '.saga', 'worktrees');

  if (!existsSync(worktreesDir)) {
    return {
      found: false,
      error: 'No .saga/worktrees/ directory found. Run /generate-stories first.',
    };
  }

  // Collect all stories
  const allStories: StoryInfo[] = [];

  // Search all worktrees: .saga/worktrees/<epic>/<story>/
  const epicDirs = readdirSync(worktreesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const epicSlug of epicDirs) {
    const epicWorktreeDir = join(worktreesDir, epicSlug);

    const storyDirs = readdirSync(epicWorktreeDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const storySlugFromDir of storyDirs) {
      const worktreePath = join(epicWorktreeDir, storySlugFromDir);

      // Story file is at: <worktree>/.saga/epics/<epic>/stories/<story>/story.md
      const storyPath = join(
        worktreePath,
        '.saga',
        'epics',
        epicSlug,
        'stories',
        storySlugFromDir,
        'story.md'
      );

      if (!existsSync(storyPath)) {
        continue;
      }

      try {
        const content = readFileSync(storyPath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);

        // Support both "id" and "slug" fields, fallback to directory name
        const storySlug =
          frontmatter.id || frontmatter.slug || storySlugFromDir;
        const title = frontmatter.title || '';
        const status = frontmatter.status || '';

        allStories.push({
          slug: storySlug,
          title,
          status,
          context: extractContext(body),
          epicSlug,
          storyPath,
          worktreePath,
        });
      } catch {
        // Skip stories with invalid files
        continue;
      }
    }
  }

  if (allStories.length === 0) {
    return {
      found: false,
      error: `No story found matching '${query}'`,
    };
  }

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
