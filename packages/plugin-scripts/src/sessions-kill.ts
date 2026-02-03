/**
 * saga sessions-kill script - Terminate a tmux session
 *
 * This script terminates a SAGA worker session running in tmux.
 * It is invoked by plugin skills to stop running workers.
 *
 * Usage:
 *   node sessions-kill.js <session-name>
 *
 * Arguments:
 *   session-name  The name of the tmux session to kill (e.g., saga__epic__story__1234)
 *
 * Output: JSON object with { killed: boolean }
 *   - killed: true if the session was successfully terminated
 *   - killed: false if the session doesn't exist or couldn't be terminated
 *
 * Exit codes:
 *   0 - Command completed (check killed property for result)
 *   1 - Invalid arguments
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

// ============================================================================
// Types
// ============================================================================

/**
 * Result from killing a session
 */
interface KillSessionResult {
	killed: boolean;
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Kill a tmux session
 *
 * Uses `tmux kill-session` to terminate the session.
 * Returns killed: false if the session doesn't exist.
 *
 * @param sessionName - The session name to kill
 * @returns Object with killed boolean
 */
function killSession(sessionName: string): KillSessionResult {
	const result = spawnSync("tmux", ["kill-session", "-t", sessionName], {
		encoding: "utf-8",
	});

	return {
		killed: result.status === 0,
	};
}

// ============================================================================
// CLI Interface
// ============================================================================

/**
 * Print usage information
 */
function printUsage(): void {
	const usage = `
Usage: sessions-kill <session-name>

Terminate a SAGA worker tmux session.

Arguments:
  session-name  The name of the tmux session to kill
                (e.g., saga__my-epic__my-story__1234567890)

Output:
  JSON object with { killed: boolean }

Examples:
  # Kill a specific session
  node sessions-kill.js saga__cli-refactor__dashboard__1234567890

  # Kill session and check result
  node sessions-kill.js saga__epic__story__1234 | jq '.killed'
`.trim();

	console.log(usage);
}

/**
 * Print error message to stderr
 */
function printError(message: string): void {
	process.stderr.write(`Error: ${message}\n`);
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Execute the sessions-kill command
 */
function main(): void {
	const args = process.argv.slice(2);

	// Handle --help
	if (args.includes("--help") || args.includes("-h")) {
		printUsage();
		process.exit(0);
	}

	// Validate arguments
	if (args.length === 0) {
		printError("Missing required argument: session-name");
		printUsage();
		process.exit(1);
	}

	const sessionName = args[0];

	// Validate session name matches SAGA convention
	if (!sessionName.startsWith("saga__")) {
		printError(
			`Invalid session name: "${sessionName}"\n` +
				'Session name must start with "saga__" (e.g., saga__epic__story__1234567890)',
		);
		process.exit(1);
	}

	// Kill the session
	const result = killSession(sessionName);

	// Output JSON result
	console.log(JSON.stringify(result, null, 2));
	process.exit(0);
}

// Run main
main();

export { killSession };
