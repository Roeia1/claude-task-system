/**
 * Sessions library module - Tmux detached session management
 *
 * Provides functions to create, list, monitor, and kill tmux sessions
 * running SAGA workers. This module is shared between the CLI and dashboard.
 *
 * Session naming convention: saga-story-<storyId>-<timestamp>
 * Output files stored in: /tmp/saga-sessions/<session-name>.jsonl
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

// Constants for magic numbers
const PREVIEW_LINES_COUNT = 5;
const PREVIEW_MAX_LENGTH = 500;

// Top-level regex patterns
const SLUG_PATTERN = /^[a-z0-9-]+$/;
// Matches session name format: saga-story-<storyId>-<timestamp>
// The storyId can contain hyphens, so the timestamp is the last hyphen-separated segment (all digits)
const SESSION_NAME_PATTERN = /^(saga-story-[a-z0-9-]+-\d+):/;
// Pattern to match all-digit timestamps in session names
const TIMESTAMP_PATTERN = /^\d+$/;
// Prefix for SAGA story sessions
const SESSION_PREFIX = 'saga-story-';

/**
 * Directory where session output files are stored
 */
const OUTPUT_DIR = '/tmp/saga-sessions';

/**
 * Result from creating a session
 */
interface CreateSessionResult {
  sessionName: string;
  outputFile: string;
}

/**
 * Session info from listing sessions
 */
interface SessionInfo {
  name: string;
  status: 'running' | 'not_running';
  outputFile: string;
}

/**
 * Detailed session info with parsed story ID and output data
 * Used by the dashboard API for richer session information
 */
interface DetailedSessionInfo {
  name: string;
  storyId: string;
  status: 'running' | 'completed';
  outputFile: string;
  outputAvailable: boolean;
  startTime: Date;
  endTime?: Date;
  outputPreview?: string;
}

/**
 * Result from parsing a session name
 */
interface ParsedSessionName {
  storyId: string;
}

/**
 * Result from checking session status
 */
interface SessionStatus {
  running: boolean;
}

/**
 * Result from killing a session
 */
interface KillSessionResult {
  killed: boolean;
}

/**
 * Check if tmux is available on the system
 */
function checkTmuxAvailable(): void {
  const result = spawnSync('which', ['tmux'], { encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error('tmux is not installed or not found in PATH');
  }
}

/**
 * Generate wrapper script content for a SAGA session
 */
function generateWrapperScript(
  commandFilePath: string,
  outputFile: string,
  wrapperScriptPath: string,
): string {
  return `#!/bin/bash
# Auto-generated wrapper script for SAGA session
set -e

# Mark this as an internal SAGA session (used by CLI to detect it's running inside tmux)
export SAGA_INTERNAL_SESSION=1

COMMAND_FILE="${commandFilePath}"
OUTPUT_FILE="${outputFile}"
SCRIPT_FILE="${wrapperScriptPath}"

# Read the command from file
COMMAND="$(cat "$COMMAND_FILE")"

# Cleanup temporary files on exit
cleanup() {
  rm -f "$COMMAND_FILE" "$SCRIPT_FILE"
}
trap cleanup EXIT

# Execute the command with output capture
# script syntax differs between macOS and Linux:
#   macOS (Darwin): script -q <file> <shell> -c <command>
#   Linux:          script -q -c <command> <file>
if [[ "$(uname)" == "Darwin" ]]; then
  # -F: flush output after each write (ensures immediate visibility)
  exec script -qF "$OUTPUT_FILE" /bin/bash -c "$COMMAND"
else
  exec script -q -c "$COMMAND" "$OUTPUT_FILE"
fi
`;
}

/**
 * Extract file timestamps from an output file
 * @param outputFile - Path to the output file
 * @param status - Session status to determine if endTime should be set
 * @returns Object with startTime and optional endTime
 */
async function extractFileTimestamps(
  outputFile: string,
  status: 'running' | 'completed',
): Promise<{ startTime: Date; endTime?: Date }> {
  try {
    const stats = await stat(outputFile);
    return {
      startTime: stats.birthtime,
      endTime: status === 'completed' ? stats.mtime : undefined,
    };
  } catch {
    // Use fallback startTime (now)
    return { startTime: new Date() };
  }
}

/**
 * Generate a preview from JSONL file content (last N valid lines, truncated to max length)
 * @param outputFile - Path to the JSONL output file
 * @returns Preview string or undefined if not available
 */
async function generateOutputPreview(outputFile: string): Promise<string | undefined> {
  try {
    const content = await readFile(outputFile, 'utf-8');
    const lines = content.split('\n').filter((line) => line.length > 0);
    if (lines.length === 0) {
      return undefined;
    }

    // Take last N lines and filter to valid JSON only
    const lastLines = lines.slice(-PREVIEW_LINES_COUNT);
    const validLines: string[] = [];
    for (const line of lastLines) {
      try {
        JSON.parse(line);
        validLines.push(line);
      } catch {
        // Skip non-JSON lines
      }
    }

    if (validLines.length === 0) {
      // Fall back to raw lines if no valid JSON found
      const rawPreview = lastLines.join('\n');
      if (rawPreview.length > PREVIEW_MAX_LENGTH) {
        const truncated = rawPreview.slice(0, PREVIEW_MAX_LENGTH);
        const lastNewline = truncated.lastIndexOf('\n');
        return lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
      }
      return rawPreview;
    }

    let preview = validLines.join('\n');
    if (preview.length > PREVIEW_MAX_LENGTH) {
      // Truncate at the last newline before max chars for cleaner display
      const truncated = preview.slice(0, PREVIEW_MAX_LENGTH);
      const lastNewline = truncated.lastIndexOf('\n');
      preview = lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
    }
    return preview;
  } catch {
    // Could not read file, leave outputPreview undefined
    return undefined;
  }
}

/**
 * Validate story ID for session creation and throw if invalid
 */
function validateStoryId(storyId: string): void {
  if (!validateSlug(storyId)) {
    throw new Error(
      `Invalid story ID: '${storyId}'. Must contain only [a-z0-9-] and not start/end with hyphen.`,
    );
  }
}

/**
 * Create session files (command and wrapper script)
 */
function createSessionFiles(
  sessionName: string,
  command: string,
): { wrapperScriptPath: string; outputFile: string } {
  const outputFile = join(OUTPUT_DIR, `${sessionName}.jsonl`);
  const commandFilePath = join(OUTPUT_DIR, `${sessionName}.cmd`);
  const wrapperScriptPath = join(OUTPUT_DIR, `${sessionName}.sh`);

  // Write the raw command to a file (no shell interpretation)
  writeFileSync(commandFilePath, command, { mode: 0o600 });

  // Create wrapper script that reads the command file safely
  const wrapperScriptContent = generateWrapperScript(
    commandFilePath,
    outputFile,
    wrapperScriptPath,
  );
  writeFileSync(wrapperScriptPath, wrapperScriptContent, { mode: 0o700 });

  return { wrapperScriptPath, outputFile };
}

/**
 * Escape a string for safe use in a shell command.
 * Uses single quotes and escapes any embedded single quotes.
 *
 * Example: "hello 'world'" becomes "'hello '\''world'\'''"
 *
 * @param str - The string to escape
 * @returns Shell-safe escaped string
 */
export function shellEscape(str: string): string {
  // Wrap in single quotes and escape any single quotes within
  // The pattern 'text'\''more' closes the quote, adds an escaped quote, reopens
  return `'${str.replace(/'/g, "'\\''")}'`;
}

/**
 * Escape an array of arguments for safe use as a shell command.
 *
 * @param args - Array of command arguments
 * @returns Shell-safe command string
 */
export function shellEscapeArgs(args: string[]): string {
  return args.map(shellEscape).join(' ');
}

/**
 * Validate that a slug contains only allowed characters: [a-z0-9-]
 * Slugs cannot start or end with a hyphen.
 *
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function validateSlug(slug: unknown): boolean {
  if (typeof slug !== 'string' || slug.length === 0) {
    return false;
  }

  // Must only contain lowercase letters, numbers, and hyphens
  if (!SLUG_PATTERN.test(slug)) {
    return false;
  }

  // Cannot start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }

  return true;
}

/**
 * Create a new detached tmux session for running a command
 *
 * Creates a tmux session named: saga-story-<storyId>-<timestamp>
 * Output is captured to: /tmp/saga-sessions/<session-name>.jsonl
 *
 * @param storyId - The story ID (validated)
 * @param command - The command to execute in the session
 * @returns Session name and output file path
 */
export function createSession(storyId: string, command: string): CreateSessionResult {
  validateStoryId(storyId);
  checkTmuxAvailable();

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate session name with timestamp for uniqueness
  const timestamp = Date.now();
  const sessionName = `saga-story-${storyId}-${timestamp}`;

  // Create session files
  const { wrapperScriptPath, outputFile } = createSessionFiles(sessionName, command);

  // Create detached tmux session that runs the wrapper script
  const createResult = spawnSync(
    'tmux',
    ['new-session', '-d', '-s', sessionName, wrapperScriptPath],
    { encoding: 'utf-8' },
  );

  if (createResult.status !== 0) {
    throw new Error(`Failed to create tmux session: ${createResult.stderr || 'unknown error'}`);
  }

  return { sessionName, outputFile };
}

/**
 * List all SAGA tmux sessions (those with saga-story- prefix)
 *
 * @returns Array of session info
 */
export function listSessions(): SessionInfo[] {
  const result = spawnSync('tmux', ['ls'], { encoding: 'utf-8' });

  // tmux ls returns non-zero when no sessions exist
  if (result.status !== 0) {
    return [];
  }

  const sessions: SessionInfo[] = [];
  const lines = result.stdout.trim().split('\n');

  for (const line of lines) {
    // tmux ls output format: "session-name: N windows ..."
    // Session name format: saga-story-<storyId>-<timestamp>
    const match = line.match(SESSION_NAME_PATTERN);
    if (match) {
      const name = match[1];
      sessions.push({
        name,
        status: 'running', // If it shows up in tmux ls, it's running
        outputFile: join(OUTPUT_DIR, `${name}.jsonl`),
      });
    }
  }

  return sessions;
}

/**
 * Get the status of a specific session
 *
 * Uses `tmux has-session` which returns 0 if session exists, non-zero otherwise.
 *
 * @param sessionName - The session name to check
 * @returns Object with running boolean
 */
export function getSessionStatus(sessionName: string): SessionStatus {
  const result = spawnSync('tmux', ['has-session', '-t', sessionName], {
    encoding: 'utf-8',
  });

  return {
    running: result.status === 0,
  };
}

/**
 * Stream logs from a session's output file
 *
 * Uses `tail -f` to stream the output file to stdout.
 * Returns a Promise that resolves when the stream ends (e.g., on SIGINT).
 *
 * @param sessionName - The session name to stream logs from
 * @returns Promise that resolves when streaming ends
 */
export function streamLogs(sessionName: string): Promise<void> {
  const outputFile = join(OUTPUT_DIR, `${sessionName}.jsonl`);

  if (!existsSync(outputFile)) {
    throw new Error(`Output file not found: ${outputFile}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn('tail', ['-f', outputFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Pipe stdout to process.stdout
    child.stdout?.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk);
    });

    // Pipe stderr to process.stderr
    child.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to stream logs: ${err.message}`));
    });

    child.on('close', (_code) => {
      resolve();
    });

    // Handle SIGINT to stop streaming gracefully
    const sigintHandler = () => {
      child.kill('SIGTERM');
      process.removeListener('SIGINT', sigintHandler);
    };
    process.on('SIGINT', sigintHandler);
  });
}

/**
 * Kill a tmux session
 *
 * @param sessionName - The session name to kill
 * @returns Object with killed boolean
 */
export function killSession(sessionName: string): KillSessionResult {
  const result = spawnSync('tmux', ['kill-session', '-t', sessionName], {
    encoding: 'utf-8',
  });

  return {
    killed: result.status === 0,
  };
}

/**
 * Parse a session name to extract story ID
 *
 * Expected format: saga-story-<storyId>-<timestamp>
 * The storyId can contain hyphens, so the timestamp is identified as the
 * last hyphen-separated segment that is all digits.
 *
 * @param name - The session name to parse
 * @returns Parsed storyId or null if not a valid SAGA session name
 */
export function parseSessionName(name: string): ParsedSessionName | null {
  if (!name?.startsWith(SESSION_PREFIX)) {
    return null;
  }

  // Remove the "saga-story-" prefix
  const rest = name.slice(SESSION_PREFIX.length);
  if (!rest) {
    return null;
  }

  // Split by hyphens: the last segment should be the timestamp (all digits)
  const parts = rest.split('-');

  // Need at least 2 parts: storyId (1+ segments) and timestamp
  if (parts.length < 2) {
    return null;
  }

  // The last part must be all digits (the timestamp)
  const lastPart = parts.at(-1);
  if (!(lastPart && TIMESTAMP_PATTERN.test(lastPart))) {
    return null;
  }

  // Everything before the last part is the storyId
  const storyId = parts.slice(0, -1).join('-');
  if (!storyId) {
    return null;
  }

  return { storyId };
}

/**
 * Build detailed session info from a session name and status
 *
 * @param name - The session name
 * @param status - The session status ('running' or 'completed')
 * @returns DetailedSessionInfo or null if not a valid SAGA session
 */
export async function buildSessionInfo(
  name: string,
  status: 'running' | 'completed',
): Promise<DetailedSessionInfo | null> {
  const parsed = parseSessionName(name);
  if (!parsed) {
    return null;
  }

  const outputFile = join(OUTPUT_DIR, `${name}.jsonl`);
  const outputAvailable = existsSync(outputFile);

  let startTime = new Date();
  let endTime: Date | undefined;
  let outputPreview: string | undefined;

  if (outputAvailable) {
    const timestamps = await extractFileTimestamps(outputFile, status);
    startTime = timestamps.startTime;
    endTime = timestamps.endTime;
    outputPreview = await generateOutputPreview(outputFile);
  }

  return {
    name,
    storyId: parsed.storyId,
    status,
    outputFile,
    outputAvailable,
    startTime,
    endTime,
    outputPreview,
  };
}

export { OUTPUT_DIR };

export type {
  CreateSessionResult,
  DetailedSessionInfo,
  KillSessionResult,
  ParsedSessionName,
  SessionInfo,
  SessionStatus,
};
