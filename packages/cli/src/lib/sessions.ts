/**
 * Sessions library module - Tmux detached session management
 *
 * Provides functions to create, list, monitor, and kill tmux sessions
 * running SAGA workers. This module is shared between the CLI and dashboard.
 *
 * Session naming convention: saga-<epic-slug>-<story-slug>-<pane-pid>
 * Output files stored in: /tmp/saga-sessions/<session-name>.out
 */

import { spawn, spawnSync, ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Directory where session output files are stored
 */
export const OUTPUT_DIR = '/tmp/saga-sessions';

/**
 * Result from creating a session
 */
export interface CreateSessionResult {
  sessionName: string;
  outputFile: string;
}

/**
 * Session info from listing sessions
 */
export interface SessionInfo {
  name: string;
  status: 'running' | 'not_running';
  outputFile: string;
}

/**
 * Result from checking session status
 */
export interface SessionStatus {
  running: boolean;
}

/**
 * Result from killing a session
 */
export interface KillSessionResult {
  killed: boolean;
}

/**
 * Validate that a slug contains only allowed characters: [a-z0-9-]
 * Slugs cannot start or end with a hyphen.
 *
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function validateSlug(slug: string): boolean {
  if (!slug || slug.length === 0) {
    return false;
  }

  // Must only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
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
 * Create a new detached tmux session for running a command
 *
 * Flow:
 * 1. Validate slugs
 * 2. Create output directory if needed
 * 3. Start tmux session with a temporary name
 * 4. Get the pane PID for unique naming
 * 5. Rename session to final name: saga-<epic>-<story>-<pane-pid>
 *
 * @param epicSlug - The epic slug (validated)
 * @param storySlug - The story slug (validated)
 * @param command - The command to execute in the session
 * @returns Session name and output file path
 */
export async function createSession(
  epicSlug: string,
  storySlug: string,
  command: string
): Promise<CreateSessionResult> {
  // Validate slugs
  if (!validateSlug(epicSlug)) {
    throw new Error(`Invalid epic slug: '${epicSlug}'. Must contain only [a-z0-9-] and not start/end with hyphen.`);
  }
  if (!validateSlug(storySlug)) {
    throw new Error(`Invalid story slug: '${storySlug}'. Must contain only [a-z0-9-] and not start/end with hyphen.`);
  }

  // Check tmux is available
  checkTmuxAvailable();

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate a temporary session name (will be renamed after we get the pane PID)
  const tempName = `saga-temp-${Date.now()}`;
  const pendingOutputFile = join(OUTPUT_DIR, `${tempName}.out`);

  // Build the command that captures output using script
  // script -q <file> -c <command> captures stdout to file
  const scriptCommand = `script -q ${pendingOutputFile} -c '${command.replace(/'/g, "'\\''")}'`;

  // Create detached tmux session with the command
  const createResult = spawnSync('tmux', [
    'new-session',
    '-d',              // detached
    '-s', tempName,    // session name (temporary)
    scriptCommand,     // command to run
  ], { encoding: 'utf-8' });

  if (createResult.status !== 0) {
    throw new Error(`Failed to create tmux session: ${createResult.stderr || 'unknown error'}`);
  }

  // Get the pane PID for unique naming
  const listResult = spawnSync('tmux', [
    'list-panes',
    '-t', tempName,
    '-F', '#{pane_id}:#{pane_current_command}:#{pane_pid}',
  ], { encoding: 'utf-8' });

  if (listResult.status !== 0) {
    // Cleanup: kill the session we just created
    spawnSync('tmux', ['kill-session', '-t', tempName]);
    throw new Error(`Failed to get pane info: ${listResult.stderr || 'unknown error'}`);
  }

  // Parse pane PID from output (format: %0:bash:1234)
  const paneInfo = listResult.stdout.trim().split(':');
  const panePid = paneInfo[2];

  if (!panePid) {
    spawnSync('tmux', ['kill-session', '-t', tempName]);
    throw new Error('Failed to get pane PID');
  }

  // Build final session name
  const finalName = `saga-${epicSlug}-${storySlug}-${panePid}`;
  const finalOutputFile = join(OUTPUT_DIR, `${finalName}.out`);

  // Rename session to final name
  const renameResult = spawnSync('tmux', [
    'rename-session',
    '-t', tempName,
    finalName,
  ], { encoding: 'utf-8' });

  if (renameResult.status !== 0) {
    spawnSync('tmux', ['kill-session', '-t', tempName]);
    throw new Error(`Failed to rename session: ${renameResult.stderr || 'unknown error'}`);
  }

  // Rename output file to match session name
  if (existsSync(pendingOutputFile)) {
    renameSync(pendingOutputFile, finalOutputFile);
  }

  return {
    sessionName: finalName,
    outputFile: finalOutputFile,
  };
}

/**
 * List all SAGA tmux sessions (those with saga- prefix)
 *
 * @returns Array of session info
 */
export async function listSessions(): Promise<SessionInfo[]> {
  const result = spawnSync('tmux', ['ls'], { encoding: 'utf-8' });

  // tmux ls returns non-zero when no sessions exist
  if (result.status !== 0) {
    return [];
  }

  const sessions: SessionInfo[] = [];
  const lines = result.stdout.trim().split('\n');

  for (const line of lines) {
    // tmux ls output format: "session-name: N windows ..."
    const match = line.match(/^(saga-[a-z0-9-]+):/);
    if (match) {
      const name = match[1];
      sessions.push({
        name,
        status: 'running', // If it shows up in tmux ls, it's running
        outputFile: join(OUTPUT_DIR, `${name}.out`),
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
export async function getSessionStatus(sessionName: string): Promise<SessionStatus> {
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
export async function streamLogs(sessionName: string): Promise<void> {
  const outputFile = join(OUTPUT_DIR, `${sessionName}.out`);

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

    child.on('close', (code) => {
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
export async function killSession(sessionName: string): Promise<KillSessionResult> {
  const result = spawnSync('tmux', ['kill-session', '-t', sessionName], {
    encoding: 'utf-8',
  });

  return {
    killed: result.status === 0,
  };
}
