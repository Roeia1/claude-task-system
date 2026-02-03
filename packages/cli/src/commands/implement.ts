/**
 * saga implement command - Run story implementation
 *
 * This command implements the orchestration loop that spawns worker Claude
 * instances to autonomously implement story tasks.
 *
 * The orchestrator:
 * 1. Validates story files exist in the worktree
 * 2. Loads the worker prompt template
 * 3. Spawns workers in a loop until completion
 *
 * Workers exit with status:
 * - FINISH: All tasks completed
 * - BLOCKED: Human input needed
 * - ONGOING: More work to do (triggers next worker spawn)
 *
 * Loop exits with:
 * - FINISH: All tasks completed
 * - BLOCKED: Human input needed
 * - TIMEOUT: Max time exceeded
 * - MAX_CYCLES: Max spawns reached
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { createSession, shellEscapeArgs } from "../lib/sessions.ts";
import { findStory as findStoryUtil } from "../utils/finder.ts";
import { resolveProjectPath } from "../utils/project-discovery.ts";

/**
 * Options for the implement command
 */
interface ImplementOptions {
	path?: string;
	maxCycles?: number;
	maxTime?: number;
	model?: string;
	dryRun?: boolean;
}

/**
 * Story info extracted from story.md or file structure
 * Maps from the finder utility's StoryInfo
 */
interface StoryInfo {
	epicSlug: string;
	storySlug: string;
	storyPath: string;
	worktreePath: string;
}

/**
 * Result from the orchestration loop
 */
interface LoopResult {
	status: "FINISH" | "BLOCKED" | "TIMEOUT" | "MAX_CYCLES" | "ERROR";
	summary: string;
	cycles: number;
	elapsedMinutes: number;
	blocker: string | null;
	epicSlug: string;
	storySlug: string;
}

/**
 * Parsed worker output
 */
interface WorkerOutput {
	status: "ONGOING" | "FINISH" | "BLOCKED";
	summary: string;
	blocker?: string | null;
}

// Constants
const DEFAULT_MAX_CYCLES = 10;
const DEFAULT_MAX_TIME = 60; // minutes
const DEFAULT_MODEL = "opus";
const VALID_STATUSES = new Set(["ONGOING", "FINISH", "BLOCKED"]);
const WORKER_PROMPT_RELATIVE = "worker-prompt.md";

// Time conversion constants
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const SECONDS_PER_MINUTE = 60;

// Rounding precision constant
const ROUNDING_PRECISION = 100;

// JSON schema for worker output validation
const WORKER_OUTPUT_SCHEMA = {
	type: "object",
	properties: {
		status: {
			type: "string",
			enum: ["ONGOING", "FINISH", "BLOCKED"],
		},
		summary: {
			type: "string",
			description: "What was accomplished this session",
		},
		blocker: {
			type: ["string", "null"],
			description: "Brief description if BLOCKED, null otherwise",
		},
	},
	required: ["status", "summary"],
};

/**
 * Find a story by slug in the SAGA project
 *
 * Uses the shared finder utility to search through worktrees.
 * Supports fuzzy matching by slug or title.
 *
 * Returns the story info if a single match is found, null otherwise.
 */
async function findStory(
	projectPath: string,
	storySlug: string,
): Promise<StoryInfo | null> {
	const result = await findStoryUtil(projectPath, storySlug);

	if (!result.found) {
		return null;
	}

	// Map from finder's StoryInfo to implement's StoryInfo
	return {
		epicSlug: result.data.epicSlug,
		storySlug: result.data.slug,
		storyPath: result.data.storyPath,
		worktreePath: result.data.worktreePath,
	};
}

/**
 * Compute the path to story.md within a worktree
 */
function computeStoryPath(
	worktree: string,
	epicSlug: string,
	storySlug: string,
): string {
	return join(
		worktree,
		".saga",
		"epics",
		epicSlug,
		"stories",
		storySlug,
		"story.md",
	);
}

/**
 * Validate that the worktree and story.md exist
 */
function validateStoryFiles(
	worktree: string,
	epicSlug: string,
	storySlug: string,
): { valid: boolean; error?: string } {
	// Check worktree exists
	if (!existsSync(worktree)) {
		return {
			valid: false,
			error:
				`Worktree not found at ${worktree}\n\n` +
				"The story worktree has not been created yet. This can happen if:\n" +
				`1. The story was generated but the worktree wasn't set up\n` +
				"2. The worktree was deleted or moved\n\n" +
				`To create the worktree, use: /task-resume ${storySlug}`,
		};
	}

	// Check story.md exists
	const storyPath = computeStoryPath(worktree, epicSlug, storySlug);
	if (!existsSync(storyPath)) {
		return {
			valid: false,
			error:
				"story.md not found in worktree.\n\n" +
				`Expected location: ${storyPath}\n\n` +
				"The worktree exists but the story definition file is missing.\n" +
				"This may indicate an incomplete story setup.",
		};
	}

	return { valid: true };
}

/**
 * Get the execute-story skill root directory
 */
function getSkillRoot(pluginRoot: string): string {
	return join(pluginRoot, "skills", "execute-story");
}

/**
 * Check if a command exists in PATH
 */
function checkCommandExists(command: string): {
	exists: boolean;
	path?: string;
} {
	try {
		const result = spawnSync("which", [command], { encoding: "utf-8" });
		if (result.status === 0 && result.stdout.trim()) {
			return { exists: true, path: result.stdout.trim() };
		}
		return { exists: false };
	} catch {
		return { exists: false };
	}
}

/**
 * Result of a dry run validation check
 */
interface DryRunCheck {
	name: string;
	path?: string;
	passed: boolean;
	error?: string;
}

/**
 * Result of the dry run validation
 */
interface DryRunResult {
	success: boolean;
	checks: DryRunCheck[];
	story?: {
		epicSlug: string;
		storySlug: string;
		worktreePath: string;
	};
}

/**
 * Check SAGA_PLUGIN_ROOT environment variable
 */
function checkPluginRoot(pluginRoot: string | undefined): DryRunCheck {
	if (pluginRoot) {
		return { name: "SAGA_PLUGIN_ROOT", path: pluginRoot, passed: true };
	}
	return {
		name: "SAGA_PLUGIN_ROOT",
		passed: false,
		error: "Environment variable not set",
	};
}

/**
 * Check claude CLI availability
 */
function checkClaudeCli(): DryRunCheck {
	const claudeCheck = checkCommandExists("claude");
	return {
		name: "claude CLI",
		path: claudeCheck.path,
		passed: claudeCheck.exists,
		error: claudeCheck.exists ? undefined : "Command not found in PATH",
	};
}

/**
 * Check worker prompt file exists
 */
function checkWorkerPrompt(pluginRoot: string): DryRunCheck {
	const skillRoot = getSkillRoot(pluginRoot);
	const workerPromptPath = join(skillRoot, WORKER_PROMPT_RELATIVE);
	const exists = existsSync(workerPromptPath);
	return {
		name: "Worker prompt",
		path: workerPromptPath,
		passed: exists,
		error: exists ? undefined : "File not found",
	};
}

/**
 * Check worktree directory exists
 */
function checkWorktreeExists(worktreePath: string): DryRunCheck {
	const exists = existsSync(worktreePath);
	return {
		name: "Worktree exists",
		path: worktreePath,
		passed: exists,
		error: exists ? undefined : "Directory not found",
	};
}

/**
 * Check story.md file exists in worktree
 */
function checkStoryMdExists(storyInfo: StoryInfo): DryRunCheck | null {
	if (!existsSync(storyInfo.worktreePath)) {
		return null;
	}
	const storyMdPath = computeStoryPath(
		storyInfo.worktreePath,
		storyInfo.epicSlug,
		storyInfo.storySlug,
	);
	const exists = existsSync(storyMdPath);
	return {
		name: "story.md in worktree",
		path: storyMdPath,
		passed: exists,
		error: exists ? undefined : "File not found",
	};
}

/**
 * Run dry-run validation to check all dependencies
 */
function runDryRun(
	storyInfo: StoryInfo,
	_projectPath: string,
	pluginRoot: string | undefined,
): DryRunResult {
	const checks: DryRunCheck[] = [];

	// Check 1: SAGA_PLUGIN_ROOT environment variable
	checks.push(checkPluginRoot(pluginRoot));

	// Check 2: claude CLI is available
	checks.push(checkClaudeCli());

	// Check 3: Worker prompt file
	if (pluginRoot) {
		checks.push(checkWorkerPrompt(pluginRoot));
	}

	// Check 4: Story exists
	checks.push({
		name: "Story found",
		path: `${storyInfo.storySlug} (epic: ${storyInfo.epicSlug})`,
		passed: true,
	});

	// Check 5: Worktree exists
	checks.push(checkWorktreeExists(storyInfo.worktreePath));

	// Check 6: story.md in worktree
	const storyMdCheck = checkStoryMdExists(storyInfo);
	if (storyMdCheck) {
		checks.push(storyMdCheck);
	}

	const allPassed = checks.every((check) => check.passed);

	return {
		success: allPassed,
		checks,
		story: {
			epicSlug: storyInfo.epicSlug,
			storySlug: storyInfo.storySlug,
			worktreePath: storyInfo.worktreePath,
		},
	};
}

/**
 * Format a single check result for display
 */
function formatCheckResult(check: DryRunCheck): string[] {
	const icon = check.passed ? "\u2713" : "\u2717";
	const status = check.passed ? "OK" : "FAILED";
	const lines: string[] = [];

	if (check.passed) {
		const pathSuffix = check.path ? ` (${check.path})` : "";
		lines.push(`  ${icon} ${check.name}: ${status}${pathSuffix}`);
	} else {
		const errorSuffix = check.error ? ` - ${check.error}` : "";
		lines.push(`  ${icon} ${check.name}: ${status}${errorSuffix}`);
		if (check.path) {
			lines.push(`      Path: ${check.path}`);
		}
	}
	return lines;
}

/**
 * Print dry run results to console
 */
function printDryRunResults(result: DryRunResult): void {
	console.log("Dry Run: Implement Story Validation");
	console.log("");
	console.log("Checks:");
	for (const check of result.checks) {
		for (const line of formatCheckResult(check)) {
			console.log(line);
		}
	}
	console.log("");
	const summary = result.success
		? "All checks passed. Ready to implement."
		: "Some checks failed. Please resolve the issues above.";
	console.log(summary);
}

/**
 * Load the worker prompt template
 */
function loadWorkerPrompt(pluginRoot: string): string {
	const skillRoot = getSkillRoot(pluginRoot);
	const promptPath = join(skillRoot, WORKER_PROMPT_RELATIVE);

	if (!existsSync(promptPath)) {
		throw new Error(`Worker prompt not found at ${promptPath}`);
	}

	return readFileSync(promptPath, "utf-8");
}

/**
 * Build the settings JSON for scope enforcement hooks
 */
// Tool names that require scope validation (file system operations)
const SCOPE_VALIDATED_TOOLS = ["Read", "Write", "Edit", "Glob", "Grep"];

// Claude Code hook API uses PascalCase for hook names
const HOOK_PRE_TOOL_USE = "PreToolUse";

function buildScopeSettings(): Record<string, unknown> {
	// Use npx to run the CLI's scope-validator command
	// This avoids dependency on Python and keeps everything in TypeScript
	const hookCommand = "npx @saga-ai/cli scope-validator";

	return {
		hooks: {
			[HOOK_PRE_TOOL_USE]: [
				{
					matcher: SCOPE_VALIDATED_TOOLS.join("|"),
					hooks: [hookCommand],
				},
			],
		},
	};
}

/**
 * Truncate a string to a maximum length, adding ellipsis if truncated
 */
function truncateString(str: string, maxLength: number): string {
	if (str.length <= maxLength) {
		return str;
	}
	return `${str.slice(0, maxLength)}...`;
}

/**
 * Format a single input value for display
 */
function formatInputValue(value: unknown, maxLength: number): string {
	if (value === null || value === undefined) {
		return "null";
	}
	if (typeof value === "string") {
		// Replace newlines with spaces for single-line display
		const singleLine = value.replace(/\n/g, " ").replace(/\s+/g, " ");
		return truncateString(singleLine, maxLength);
	}
	if (typeof value === "boolean" || typeof value === "number") {
		return String(value);
	}
	if (Array.isArray(value)) {
		return truncateString(JSON.stringify(value), maxLength);
	}
	if (typeof value === "object") {
		return truncateString(JSON.stringify(value), maxLength);
	}
	return String(value);
}

/**
 * Format all input fields for unknown tools (default fallback)
 */
function formatAllInputFields(input: Record<string, unknown>): string {
	const maxValueLength = 100;

	const entries = Object.entries(input);
	if (entries.length === 0) {
		return "";
	}

	return entries
		.map(([key, value]) => `${key}=${formatInputValue(value, maxValueLength)}`)
		.join(", ");
}

/**
 * Format tool usage with curated info for known tools, all fields for unknown
 * Wrapped in try-catch to ensure parsing errors don't crash the process
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: switch statement for tool formatting is inherently complex but readable
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: each case is simple, splitting would reduce readability
function formatToolUsage(name: string, input: Record<string, unknown>): string {
	try {
		const safeInput = input || {};
		const maxLength = 100;

		switch (name) {
			// File operations - show path
			case "Read": {
				const path = safeInput.file_path || "unknown";
				const extras: string[] = [];
				if (safeInput.offset) {
					extras.push(`offset=${safeInput.offset}`);
				}
				if (safeInput.limit) {
					extras.push(`limit=${safeInput.limit}`);
				}
				const suffix = extras.length > 0 ? ` (${extras.join(", ")})` : "";
				return `[Tool Used: Read] ${path}${suffix}`;
			}
			case "Write":
				return `[Tool Used: Write] ${safeInput.file_path || "unknown"}`;
			case "Edit": {
				const file = safeInput.file_path || "unknown";
				const replaceAll = safeInput.replace_all ? " (replace_all)" : "";
				return `[Tool Used: Edit] ${file}${replaceAll}`;
			}

			// Shell command - show command and description
			case "Bash": {
				const cmd = truncateString(String(safeInput.command || ""), maxLength);
				const desc = safeInput.description
					? ` - ${truncateString(String(safeInput.description), 60)}`
					: "";
				return `[Tool Used: Bash] ${cmd}${desc}`;
			}

			// Search operations - show pattern and path
			case "Glob": {
				const pattern = safeInput.pattern || "unknown";
				const path = safeInput.path ? ` in ${safeInput.path}` : "";
				return `[Tool Used: Glob] ${pattern}${path}`;
			}
			case "Grep": {
				const pattern = truncateString(String(safeInput.pattern || ""), 60);
				const path = safeInput.path ? ` in ${safeInput.path}` : "";
				const mode = safeInput.output_mode ? ` (${safeInput.output_mode})` : "";
				return `[Tool Used: Grep] "${pattern}"${path}${mode}`;
			}

			// Agent task - show description and type
			case "Task": {
				const desc = truncateString(
					String(safeInput.description || safeInput.prompt || ""),
					maxLength,
				);
				const agentType = safeInput.subagent_type
					? ` [${safeInput.subagent_type}]`
					: "";
				return `[Tool Used: Task]${agentType} ${desc}`;
			}

			// Todo operations
			case "TodoWrite": {
				const todos = safeInput.todos;
				if (todos && Array.isArray(todos)) {
					const subjects = todos
						.map((t: unknown) => {
							if (t && typeof t === "object" && "subject" in t) {
								return String(
									(t as { subject: unknown }).subject || "untitled",
								);
							}
							return "untitled";
						})
						.join(", ");
					return `[Tool Used: TodoWrite] ${truncateString(subjects, maxLength)}`;
				}
				return "[Tool Used: TodoWrite]";
			}

			// Structured output - show status
			case "StructuredOutput": {
				const status = safeInput.status || "unknown";
				const summary = safeInput.summary
					? ` - ${truncateString(String(safeInput.summary), maxLength)}`
					: "";
				return `[Tool Used: StructuredOutput] ${status}${summary}`;
			}

			// Unknown tools - show all fields
			default: {
				const fields = formatAllInputFields(safeInput);
				return fields
					? `[Tool Used: ${name}] ${fields}`
					: `[Tool Used: ${name}]`;
			}
		}
	} catch {
		// Fallback if any parsing fails
		return `[Tool Used: ${name}]`;
	}
}

/**
 * Format assistant message content blocks
 * Wrapped in try-catch to ensure malformed content doesn't crash the process
 */
function formatAssistantContent(content: unknown[]): string | null {
	try {
		if (!(content && Array.isArray(content))) {
			return null;
		}

		for (const block of content) {
			if (!block || typeof block !== "object") {
				continue;
			}

			const blockData = block as {
				type?: string;
				text?: string;
				name?: string;
				input?: Record<string, unknown>;
			};

			if (blockData.type === "text" && blockData.text) {
				return `${blockData.text}\n`;
			}
			if (blockData.type === "tool_use" && blockData.name) {
				return `${formatToolUsage(blockData.name, blockData.input || {})}\n`;
			}
		}
		return null;
	} catch {
		// Silently fail on malformed content
		return null;
	}
}

/**
 * Parse a stream-json line and extract displayable content
 * Returns the text to display, or null if nothing to display
 */
function formatStreamLine(line: string): string | null {
	try {
		const data = JSON.parse(line);

		// Assistant message with text content
		if (data.type === "assistant" && data.message?.content) {
			return formatAssistantContent(data.message.content);
		}

		// System init message
		if (data.type === "system" && data.subtype === "init") {
			return `[Session started: ${data.session_id}]`;
		}

		// Result message (final)
		if (data.type === "result") {
			const status = data.subtype === "success" ? "completed" : "failed";
			return `\n[Worker ${status} in ${Math.round(data.duration_ms / MS_PER_SECOND)}s]`;
		}

		return null;
	} catch {
		return null;
	}
}

/**
 * Extract StructuredOutput tool call input from streaming output
 * Searches for assistant messages containing a StructuredOutput tool_use block
 * Returns the input object if found, null otherwise
 */
function extractStructuredOutputFromToolCall(
	lines: string[],
): Record<string, unknown> | null {
	// Search backwards to find the most recent StructuredOutput tool call
	for (let i = lines.length - 1; i >= 0; i--) {
		try {
			const data = JSON.parse(lines[i]);
			if (data.type === "assistant" && data.message?.content) {
				for (const block of data.message.content) {
					if (block.type === "tool_use" && block.name === "StructuredOutput") {
						return block.input as Record<string, unknown>;
					}
				}
			}
		} catch {
			// Not valid JSON, continue
		}
	}
	return null;
}

/**
 * Validate and extract output from structured output data
 */
function validateAndExtractOutput(
	output: Record<string, unknown>,
): WorkerOutput {
	if (!VALID_STATUSES.has(output.status as string)) {
		throw new Error(`Invalid status: ${output.status}`);
	}

	return {
		status: output.status as WorkerOutput["status"],
		summary: (output.summary as string) || "",
		blocker: (output.blocker as string | null) ?? null,
	};
}

/**
 * Process a single result line and extract WorkerOutput
 */
function processResultLine(
	data: Record<string, unknown>,
	lines: string[],
): WorkerOutput {
	if (data.is_error) {
		throw new Error(`Worker failed: ${data.result || "Unknown error"}`);
	}

	// Try to get structured_output from result, fall back to tool call
	let output = data.structured_output as Record<string, unknown> | undefined;
	if (!output) {
		// Fallback: extract from StructuredOutput tool call
		output = extractStructuredOutputFromToolCall(lines) ?? undefined;
	}

	if (!output) {
		throw new Error("Worker result missing structured_output");
	}

	return validateAndExtractOutput(output);
}

/**
 * Parse the final result from stream-json output
 * Looks for the {"type":"result",...} line and extracts structured_output.
 * Falls back to extracting from StructuredOutput tool call if structured_output
 * is missing (can happen with error_during_execution subtype).
 */
function parseStreamingResult(buffer: string): WorkerOutput {
	const lines = buffer.split("\n").filter((line) => line.trim());

	// Find the result line (should be the last one)
	for (let i = lines.length - 1; i >= 0; i--) {
		try {
			const data = JSON.parse(lines[i]);
			if (data.type === "result") {
				return processResultLine(data, lines);
			}
		} catch (e) {
			// Not a valid JSON line or not a result, continue searching
			if (e instanceof Error && e.message.startsWith("Worker")) {
				throw e;
			}
		}
	}

	throw new Error("No result found in worker output");
}

/**
 * Spawn a worker Claude instance with streaming output
 * Streams output to stdout in real-time while collecting the final result
 */
function spawnWorkerAsync(
	prompt: string,
	model: string,
	settings: Record<string, unknown>,
	workingDir: string,
): Promise<WorkerOutput> {
	return new Promise((resolve, reject) => {
		let buffer = "";

		// Build command arguments for streaming
		const args = [
			"-p",
			prompt,
			"--model",
			model,
			"--output-format",
			"stream-json",
			"--verbose",
			"--json-schema",
			JSON.stringify(WORKER_OUTPUT_SCHEMA),
			"--settings",
			JSON.stringify(settings),
			"--dangerously-skip-permissions",
		];

		const child = spawn("claude", args, {
			cwd: workingDir,
			stdio: ["ignore", "pipe", "pipe"],
		});

		child.stdout.on("data", (chunk: Buffer) => {
			const text = chunk.toString();
			buffer += text;

			// Parse and display each line
			const lines = text.split("\n");
			for (const line of lines) {
				if (line.trim()) {
					const formatted = formatStreamLine(line);
					if (formatted) {
						process.stdout.write(formatted);
					}
				}
			}
		});

		child.stderr.on("data", (chunk: Buffer) => {
			process.stderr.write(chunk);
		});

		child.on("error", (err) => {
			reject(new Error(`Failed to spawn worker: ${err.message}`));
		});

		child.on("close", (_code) => {
			// Add newline after streaming output
			process.stdout.write("\n");

			try {
				const result = parseStreamingResult(buffer);
				resolve(result);
			} catch (e) {
				reject(e);
			}
		});
	});
}

/**
 * Create an error LoopResult
 */
function createErrorResult(
	epicSlug: string,
	storySlug: string,
	summary: string,
	cycles: number,
	elapsedMinutes: number,
): LoopResult {
	return {
		status: "ERROR",
		summary,
		cycles,
		elapsedMinutes,
		blocker: null,
		epicSlug,
		storySlug,
	};
}

/**
 * Validate and load resources for the orchestration loop
 */
function validateLoopResources(
	worktree: string,
	epicSlug: string,
	storySlug: string,
	pluginRoot: string,
): { valid: true; workerPrompt: string } | { valid: false; error: string } {
	const validation = validateStoryFiles(worktree, epicSlug, storySlug);
	if (!validation.valid) {
		return {
			valid: false,
			error: validation.error || "Story validation failed",
		};
	}

	try {
		const workerPrompt = loadWorkerPrompt(pluginRoot);
		return { valid: true, workerPrompt };
	} catch (e) {
		return { valid: false, error: e instanceof Error ? e.message : String(e) };
	}
}

/**
 * Build final LoopResult from loop state
 */
function buildLoopResult(
	epicSlug: string,
	storySlug: string,
	finalStatus: LoopResult["status"],
	summaries: string[],
	cycles: number,
	elapsedMinutes: number,
	lastBlocker: string | null,
): LoopResult {
	const combinedSummary =
		summaries.length === 1 ? summaries[0] : summaries.join(" | ");
	return {
		status: finalStatus,
		summary: combinedSummary,
		cycles,
		elapsedMinutes:
			Math.round(elapsedMinutes * ROUNDING_PRECISION) / ROUNDING_PRECISION,
		blocker: lastBlocker,
		epicSlug,
		storySlug,
	};
}

/**
 * Loop state for worker orchestration
 */
interface LoopState {
	summaries: string[];
	cycles: number;
	lastBlocker: string | null;
	finalStatus: LoopResult["status"] | null;
}

/**
 * Worker loop configuration
 */
interface WorkerLoopConfig {
	workerPrompt: string;
	model: string;
	settings: Record<string, unknown>;
	worktree: string;
	maxCycles: number;
	maxTimeMs: number;
	startTime: number;
	epicSlug: string;
	storySlug: string;
}

/**
 * Execute a single worker cycle and return the result
 */
async function executeWorkerCycle(
	config: WorkerLoopConfig,
	state: LoopState,
): Promise<{ continue: boolean; result?: LoopResult }> {
	// Check timeout
	if (Date.now() - config.startTime >= config.maxTimeMs) {
		state.finalStatus = "TIMEOUT";
		return { continue: false };
	}

	// Check max cycles
	if (state.cycles >= config.maxCycles) {
		return { continue: false };
	}

	state.cycles += 1;

	try {
		const parsed = await spawnWorkerAsync(
			config.workerPrompt,
			config.model,
			config.settings,
			config.worktree,
		);

		state.summaries.push(parsed.summary);

		if (parsed.status === "FINISH") {
			state.finalStatus = "FINISH";
			return { continue: false };
		}
		if (parsed.status === "BLOCKED") {
			state.finalStatus = "BLOCKED";
			state.lastBlocker = parsed.blocker || null;
			return { continue: false };
		}

		return { continue: true };
	} catch (e) {
		const elapsed = (Date.now() - config.startTime) / MS_PER_MINUTE;
		return {
			continue: false,
			result: createErrorResult(
				config.epicSlug,
				config.storySlug,
				e instanceof Error ? e.message : String(e),
				state.cycles,
				elapsed,
			),
		};
	}
}

/**
 * Execute the worker spawning loop using recursion
 */
function executeWorkerLoop(
	workerPrompt: string,
	model: string,
	settings: Record<string, unknown>,
	worktree: string,
	maxCycles: number,
	maxTimeMs: number,
	startTime: number,
	epicSlug: string,
	storySlug: string,
): Promise<LoopState | LoopResult> {
	const config: WorkerLoopConfig = {
		workerPrompt,
		model,
		settings,
		worktree,
		maxCycles,
		maxTimeMs,
		startTime,
		epicSlug,
		storySlug,
	};
	const state: LoopState = {
		summaries: [],
		cycles: 0,
		lastBlocker: null,
		finalStatus: null,
	};

	// Use recursive async function to avoid await in loop
	const runNextCycle = async (): Promise<LoopState | LoopResult> => {
		const cycleResult = await executeWorkerCycle(config, state);

		if (cycleResult.result) {
			return cycleResult.result;
		}

		if (cycleResult.continue) {
			return runNextCycle();
		}

		return state;
	};

	return runNextCycle();
}

/**
 * Main orchestration loop that spawns workers until completion
 */
async function runLoop(
	epicSlug: string,
	storySlug: string,
	maxCycles: number,
	maxTime: number,
	model: string,
	projectDir: string,
	pluginRoot: string,
): Promise<LoopResult> {
	const worktree = join(projectDir, ".saga", "worktrees", epicSlug, storySlug);

	const resources = validateLoopResources(
		worktree,
		epicSlug,
		storySlug,
		pluginRoot,
	);
	if (!resources.valid) {
		return createErrorResult(epicSlug, storySlug, resources.error, 0, 0);
	}

	const settings = buildScopeSettings();
	const startTime = Date.now();
	const maxTimeMs = maxTime * SECONDS_PER_MINUTE * MS_PER_SECOND;

	const result = await executeWorkerLoop(
		resources.workerPrompt,
		model,
		settings,
		worktree,
		maxCycles,
		maxTimeMs,
		startTime,
		epicSlug,
		storySlug,
	);

	// If result is a LoopResult (error case), return it directly
	if ("status" in result && result.status === "ERROR") {
		return result as LoopResult;
	}

	const state = result as LoopState;
	const finalStatus = state.finalStatus ?? "MAX_CYCLES";
	const elapsedMinutes = (Date.now() - startTime) / MS_PER_MINUTE;

	return buildLoopResult(
		epicSlug,
		storySlug,
		finalStatus,
		state.summaries,
		state.cycles,
		elapsedMinutes,
		state.lastBlocker,
	);
}

/**
 * Build the command string to run in detached mode
 * The CLI detects it's inside a tmux session via SAGA_INTERNAL_SESSION env var
 *
 * All arguments are properly shell-escaped to prevent command injection
 */
function buildDetachedCommand(
	storySlug: string,
	projectPath: string,
	options: {
		maxCycles?: number;
		maxTime?: number;
		model?: string;
	},
): string {
	const parts = ["saga", "implement", storySlug];

	// Add project path
	parts.push("--path", projectPath);

	// Add options if specified
	if (options.maxCycles !== undefined) {
		parts.push("--max-cycles", String(options.maxCycles));
	}
	if (options.maxTime !== undefined) {
		parts.push("--max-time", String(options.maxTime));
	}
	if (options.model !== undefined) {
		parts.push("--model", options.model);
	}

	// Use shell escaping to prevent command injection
	return shellEscapeArgs(parts);
}

/**
 * Handle dry-run mode for implement command
 */
function handleDryRun(
	storyInfo: StoryInfo,
	projectPath: string,
	pluginRoot: string | undefined,
): never {
	const dryRunResult = runDryRun(storyInfo, projectPath, pluginRoot);
	printDryRunResults(dryRunResult);
	process.exit(dryRunResult.success ? 0 : 1);
}

/**
 * Handle detached mode - create tmux session
 */
async function handleDetachedMode(
	storySlug: string,
	storyInfo: StoryInfo,
	projectPath: string,
	options: ImplementOptions,
): Promise<void> {
	const detachedCommand = buildDetachedCommand(storySlug, projectPath, {
		maxCycles: options.maxCycles,
		maxTime: options.maxTime,
		model: options.model,
	});

	try {
		const sessionInfo = await createSession(
			storyInfo.epicSlug,
			storyInfo.storySlug,
			detachedCommand,
		);
		// Output session info as JSON for programmatic use
		console.log(JSON.stringify(sessionInfo, null, 2));
	} catch (error) {
		console.error(
			`Error creating session: ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(1);
	}
}

/**
 * Handle internal session mode - run the orchestration loop
 */
async function handleInternalSession(
	storyInfo: StoryInfo,
	projectPath: string,
	pluginRoot: string,
	options: ImplementOptions,
): Promise<void> {
	const maxCycles = options.maxCycles ?? DEFAULT_MAX_CYCLES;
	const maxTime = options.maxTime ?? DEFAULT_MAX_TIME;
	const model = options.model ?? DEFAULT_MODEL;

	console.log("Starting story implementation...");
	console.log(`Story: ${storyInfo.storySlug} (epic: ${storyInfo.epicSlug})`);
	console.log(
		`Max cycles: ${maxCycles}, Max time: ${maxTime}min, Model: ${model}`,
	);
	console.log("");

	const result = await runLoop(
		storyInfo.epicSlug,
		storyInfo.storySlug,
		maxCycles,
		maxTime,
		model,
		projectPath,
		pluginRoot,
	);

	if (result.status === "ERROR") {
		console.error(`Error: ${result.summary}`);
		process.exit(1);
	}

	console.log(`\nImplementation ${result.status}: ${result.summary}`);
}

/**
 * Execute the implement command
 */
async function implementCommand(
	storySlug: string,
	options: ImplementOptions,
): Promise<void> {
	let projectPath: string;
	try {
		projectPath = resolveProjectPath(options.path);
	} catch (_error) {
		console.error(
			"Error: SAGA project not found. Run saga init first or use --path option.",
		);
		process.exit(1);
	}

	const storyInfo = await findStory(projectPath, storySlug);
	if (!storyInfo) {
		console.error(`Error: Story '${storySlug}' not found in project.`);
		console.error("Use /generate-stories to create stories for an epic first.");
		process.exit(1);
	}

	const pluginRoot = process.env.SAGA_PLUGIN_ROOT;

	if (options.dryRun) {
		handleDryRun(storyInfo, projectPath, pluginRoot);
	}

	if (!pluginRoot) {
		console.error("Error: SAGA_PLUGIN_ROOT environment variable is not set.");
		console.error("This is required to find the worker prompt template.");
		process.exit(1);
	}

	if (!existsSync(storyInfo.worktreePath)) {
		console.error(`Error: Worktree not found at ${storyInfo.worktreePath}`);
		process.exit(1);
	}

	const isInternalSession = process.env.SAGA_INTERNAL_SESSION === "1";
	if (isInternalSession) {
		await handleInternalSession(storyInfo, projectPath, pluginRoot, options);
	} else {
		await handleDetachedMode(storySlug, storyInfo, projectPath, options);
	}
}

// Export types and functions at the end of the file
export type { ImplementOptions };
export { implementCommand };
