/**
 * Session manager for tmux operations
 *
 * Handles creating, managing, and interacting with tmux sessions
 * for running SAGA workers in detached mode.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import type { CreateSessionResult, WorkerOutput } from './types.ts';
import { formatStreamLine, parseStreamingResult, WORKER_OUTPUT_SCHEMA } from './output-parser.ts';

/**
 * Get the session output directory from SAGA_SESSION_DIR environment variable
 * @throws Error if SAGA_SESSION_DIR is not set
 */
function getSessionDir(): string {
  const sessionDir = process.env.SAGA_SESSION_DIR;
  if (!sessionDir) {
    throw new Error(
      'SAGA_SESSION_DIR environment variable is not set.\n' +
        'This variable must be set by the session-init hook.\n' +
        'It specifies the directory for session output files (e.g., /tmp/saga-sessions).',
    );
  }
  return sessionDir;
}

// Top-level regex patterns
const SLUG_PATTERN = /^[a-z0-9-]+$/;

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
 * Validate slugs for session creation and throw if invalid
 */
function validateSessionSlugs(epicSlug: string, storySlug: string): void {
  if (!validateSlug(epicSlug)) {
    throw new Error(
      `Invalid epic slug: '${epicSlug}'. Must contain only [a-z0-9-] and not start/end with hyphen.`,
    );
  }
  if (!validateSlug(storySlug)) {
    throw new Error(
      `Invalid story slug: '${storySlug}'. Must contain only [a-z0-9-] and not start/end with hyphen.`,
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
  const sessionDir = getSessionDir();
  const outputFile = join(sessionDir, `${sessionName}.out`);
  const commandFilePath = join(sessionDir, `${sessionName}.cmd`);
  const wrapperScriptPath = join(sessionDir, `${sessionName}.sh`);

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
 * Create a new detached tmux session for running a command
 *
 * Creates a tmux session named: saga__<epic>__<story>__<timestamp>
 * Output is captured to: $SAGA_SESSION_DIR/<session-name>.out
 *
 * @param epicSlug - The epic slug (validated)
 * @param storySlug - The story slug (validated)
 * @param command - The command to execute in the session
 * @returns Session name and output file path
 */
export function createSession(
  epicSlug: string,
  storySlug: string,
  command: string,
): CreateSessionResult {
  validateSessionSlugs(epicSlug, storySlug);
  checkTmuxAvailable();

  // Create output directory
  const sessionDir = getSessionDir();
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  // Generate session name with timestamp for uniqueness
  // Uses double-underscore format for dashboard compatibility (parseSessionName requires saga__)
  const timestamp = Date.now();
  const sessionName = `saga__${epicSlug}__${storySlug}__${timestamp}`;

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
 * Worker environment variables passed to headless Claude workers
 */
export interface WorkerEnv {
  epicSlug: string;
  storySlug: string;
  storyDir: string;
}

/**
 * Spawn a worker Claude instance with streaming output
 * Streams output to stdout in real-time while collecting the final result
 *
 * Sets worker-specific environment variables:
 * - SAGA_EPIC_SLUG: The current epic identifier
 * - SAGA_STORY_SLUG: The current story identifier
 * - SAGA_STORY_DIR: Relative path to story files
 */
export function spawnWorkerAsync(
  prompt: string,
  model: string,
  settings: Record<string, unknown>,
  workingDir: string,
  workerEnv: WorkerEnv,
): Promise<WorkerOutput> {
  return new Promise((resolve, reject) => {
    let buffer = '';

    // Build command arguments for streaming
    const args = [
      '-p',
      prompt,
      '--model',
      model,
      '--output-format',
      'stream-json',
      '--verbose',
      '--json-schema',
      JSON.stringify(WORKER_OUTPUT_SCHEMA),
      '--settings',
      JSON.stringify(settings),
      '--dangerously-skip-permissions',
    ];

    // Build worker environment with story-specific variables
    const env = {
      ...process.env,
      SAGA_EPIC_SLUG: workerEnv.epicSlug,
      SAGA_STORY_SLUG: workerEnv.storySlug,
      SAGA_STORY_DIR: workerEnv.storyDir,
    };

    const child = spawn('claude', args, {
      cwd: workingDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      buffer += text;

      // Parse and display each line
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const formatted = formatStreamLine(line);
          if (formatted) {
            process.stdout.write(formatted);
          }
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn worker: ${err.message}`));
    });

    child.on('close', (_code) => {
      // Add newline after streaming output
      process.stdout.write('\n');

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
 * Build the command string to run in detached mode
 * The CLI detects it's inside a tmux session via SAGA_INTERNAL_SESSION env var
 *
 * Invokes the implement.js plugin-script directly via node.
 * Environment variables (SAGA_PROJECT_DIR, SAGA_PLUGIN_ROOT) are inherited
 * by the tmux session from the parent process.
 *
 * All arguments are properly shell-escaped to prevent command injection
 */
export function buildDetachedCommand(
  storySlug: string,
  pluginRoot: string,
  options: {
    maxCycles?: number;
    maxTime?: number;
    model?: string;
  },
): string {
  const scriptPath = join(pluginRoot, 'scripts', 'implement.js');
  const parts = ['node', scriptPath, storySlug];

  // Add options if specified
  if (options.maxCycles !== undefined) {
    parts.push('--max-cycles', String(options.maxCycles));
  }
  if (options.maxTime !== undefined) {
    parts.push('--max-time', String(options.maxTime));
  }
  if (options.model !== undefined) {
    parts.push('--model', options.model);
  }

  // Use shell escaping to prevent command injection
  return shellEscapeArgs(parts);
}
