/**
 * saga find command - Find epics or stories by slug/title
 *
 * This command resolves flexible identifiers to epic slugs or story metadata.
 *
 * Usage:
 *   node find.js <query>                   # Find a story (default)
 *   node find.js <query> --type epic       # Find an epic
 *   node find.js <query> --type story      # Find a story (explicit)
 *   node find.js <query> --status ready    # Filter by status
 *
 * Output:
 *   JSON object with:
 *   - found: true/false
 *   - data: object with metadata (if single match)
 *   - matches: array (if multiple matches)
 *   - error: string (if no match)
 */

import { existsSync } from "node:fs";
import process from "node:process";
import {
	createSagaPaths,
	type StoryStatus,
	StoryStatusSchema,
} from "@saga-ai/types";
import { getProjectDir as getProjectDirEnv } from "../shared/env.ts";
import { findEpic, findStory } from "./finder.ts";

// ============================================================================
// Project Discovery
// ============================================================================

/**
 * Get SAGA_PROJECT_DIR from environment and validate .saga/ exists
 * @throws Error if not set or invalid
 */
function getProjectDir(): string {
	const projectDir = getProjectDirEnv();

	const sagaPaths = createSagaPaths(projectDir);
	if (!existsSync(sagaPaths.saga)) {
		throw new Error(
			`No .saga/ directory found at SAGA_PROJECT_DIR: ${projectDir}\n` +
				"Make sure SAGA_PROJECT_DIR points to a SAGA project root.",
		);
	}

	return projectDir;
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function printHelp(): void {
	console.log(`Usage: find <query> [options]

Find epics or stories by slug/title using fuzzy matching.

Arguments:
  query    The identifier to search for (partial match supported)

Options:
  --type <type>      Type to search: "epic" or "story" (default: "story")
  --status <status>  Filter stories by status (e.g., "ready", "in_progress")
  --help             Show this help message

Environment (required):
  SAGA_PROJECT_DIR   Project root directory

Output (JSON):
  { "found": true, "data": {...} }           # Single match found
  { "found": false, "matches": [...] }       # Multiple possible matches
  { "found": false, "error": "..." }         # No match or error

Examples:
  find implement-login                        # Find story by slug
  find auth --type epic                       # Find epic by partial name
  find login --status ready                   # Find ready stories matching "login"
`);
}

function parseArgs(args: string[]): {
	query?: string;
	type?: "epic" | "story";
	status?: string;
	help: boolean;
} {
	const result: {
		query?: string;
		type?: "epic" | "story";
		status?: string;
		help: boolean;
	} = { help: false };
	const positional: string[] = [];
	const iter = args[Symbol.iterator]();

	for (const arg of iter) {
		if (arg === "--help" || arg === "-h") {
			result.help = true;
		} else if (arg === "--type") {
			const typeArg = iter.next().value as string | undefined;
			if (typeArg === "epic" || typeArg === "story") {
				result.type = typeArg;
			} else {
				console.error(
					`Error: Invalid type "${typeArg}". Must be "epic" or "story".`,
				);
				process.exit(1);
			}
		} else if (arg === "--status") {
			result.status = iter.next().value as string | undefined;
		} else if (!arg.startsWith("-")) {
			positional.push(arg);
		}
	}

	if (positional.length > 0) {
		result.query = positional[0];
	}

	return result;
}

// ============================================================================
// Main Helpers
// ============================================================================

/**
 * Resolve project path from environment, exit on failure
 */
function resolveProjectPath(): string {
	try {
		return getProjectDir();
	} catch (error) {
		const result = {
			found: false,
			error: error instanceof Error ? error.message : String(error),
		};
		console.log(JSON.stringify(result, null, 2));
		process.exit(1);
	}
}

/**
 * Validate and parse the status flag if provided
 */
function resolveStatus(statusArg: string | undefined): StoryStatus | undefined {
	if (!statusArg) {
		return undefined;
	}
	const parsed = StoryStatusSchema.safeParse(statusArg);
	if (!parsed.success) {
		const validValues = StoryStatusSchema.options.join(", ");
		console.log(
			JSON.stringify(
				{
					found: false,
					error: `Invalid status: "${statusArg}". Valid values: ${validValues}`,
				},
				null,
				2,
			),
		);
		process.exit(1);
	}
	return parsed.data;
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));

	if (args.help) {
		printHelp();
		process.exit(0);
	}

	if (!args.query) {
		console.error("Error: Query argument is required.\n");
		printHelp();
		process.exit(1);
	}

	const projectPath = resolveProjectPath();
	const type = args.type ?? "story";
	const status = resolveStatus(args.status);

	let result:
		| ReturnType<typeof findEpic>
		| Awaited<ReturnType<typeof findStory>>;
	if (type === "epic") {
		result = findEpic(projectPath, args.query);
	} else {
		result = await findStory(projectPath, args.query, { status });
	}

	// Output JSON result
	console.log(JSON.stringify(result, null, 2));

	// Exit with appropriate code
	if (!result.found) {
		process.exit(1);
	}
}

// Run main
main();
