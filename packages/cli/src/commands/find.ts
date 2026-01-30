/**
 * saga find command - Find epics or stories by slug/title
 *
 * This command resolves flexible identifiers to epic slugs or story metadata.
 *
 * Usage:
 *   saga find <query>                   # Find a story (default)
 *   saga find <query> --type epic       # Find an epic
 *   saga find <query> --type story      # Find a story (explicit)
 *
 * Output:
 *   JSON object with:
 *   - found: true/false
 *   - data: object with metadata (if single match)
 *   - matches: array (if multiple matches)
 *   - error: string (if no match)
 */

import { findEpic, findStory } from '../utils/finder.js';
import { resolveProjectPath } from '../utils/project-discovery.js';

/**
 * Options for the find command
 */
export interface FindOptions {
  path?: string;
  type?: 'epic' | 'story';
  status?: string;
}

/**
 * Execute the find command
 */
export async function findCommand(query: string, options: FindOptions): Promise<void> {
  // Resolve project path
  let projectPath: string;
  try {
    projectPath = resolveProjectPath(options.path);
  } catch (error) {
    console.log(
      JSON.stringify({
        found: false,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }

  const type = options.type ?? 'story';

  let result: ReturnType<typeof findEpic> | Awaited<ReturnType<typeof findStory>>;
  if (type === 'epic') {
    result = findEpic(projectPath, query);
  } else {
    result = await findStory(projectPath, query, { status: options.status });
  }

  // Output JSON result
  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  if (!result.found) {
    process.exit(1);
  }
}
