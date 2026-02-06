/**
 * saga sync-hook script - Sync TaskUpdate calls back to SAGA source of truth
 *
 * This script is invoked as a PostToolUse hook for TaskUpdate tool calls.
 * It reads the hook input from stdin, extracts the taskId and status,
 * and writes the updated status back to the SAGA task file.
 *
 * Environment variables required:
 * - SAGA_PROJECT_DIR: Absolute path to the project/worktree directory
 * - SAGA_STORY_ID: The current story identifier
 *
 * Input: Hook input JSON from stdin
 * Exit codes:
 *   0 = always (sync failures must not crash the headless run)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { createTaskPath } from '@saga-ai/types';

// ============================================================================
// Types
// ============================================================================

interface SyncResult {
  synced: boolean;
  reason?: string;
}

// ============================================================================
// Input Parsing
// ============================================================================

/**
 * Parse and validate hook input JSON.
 * Returns null if the input is invalid or missing required fields.
 */
function parseHookInput(raw: string): { taskId: string; status: string } | null {
  if (!raw) {
    return null;
  }
  try {
    const data = JSON.parse(raw);
    const toolInput = data.tool_input;
    if (!toolInput || typeof toolInput !== 'object') {
      return null;
    }
    const { taskId, status } = toolInput;
    if (!(taskId && status)) {
      return null;
    }
    return { taskId, status };
  } catch {
    return null;
  }
}

// ============================================================================
// Core Sync Logic
// ============================================================================

/**
 * Process a sync input string and write the status update to the SAGA task file.
 *
 * Exported for unit testing. The main() function reads stdin and calls this.
 */
function processSyncInput(raw: string): SyncResult {
  const parsed = parseHookInput(raw);
  if (!parsed) {
    return { synced: false, reason: 'Invalid or missing hook input' };
  }

  const { taskId, status } = parsed;

  const projectDir = process.env.SAGA_PROJECT_DIR;
  if (!projectDir) {
    return { synced: false, reason: 'SAGA_PROJECT_DIR not set' };
  }

  const storyId = process.env.SAGA_STORY_ID;
  if (!storyId) {
    return { synced: false, reason: 'SAGA_STORY_ID not set' };
  }

  const taskPath = createTaskPath(projectDir, storyId, taskId);

  if (!existsSync(taskPath)) {
    return { synced: false, reason: `Task file not found: ${taskPath}` };
  }

  let taskData: Record<string, unknown>;
  try {
    taskData = JSON.parse(readFileSync(taskPath, 'utf-8'));
  } catch (error) {
    return {
      synced: false,
      reason: `Failed to parse task file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  taskData.status = status;

  try {
    writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
  } catch (error) {
    return {
      synced: false,
      reason: `Failed to write task file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  return { synced: true };
}

// ============================================================================
// Stdin Reading
// ============================================================================

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    const result = processSyncInput(raw);

    if (!result.synced && result.reason) {
      process.stderr.write(`sync-hook: ${result.reason}\n`);
    }
  } catch (error) {
    process.stderr.write(
      `sync-hook: Unexpected error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }

  // Always exit 0 - sync failures must not crash the headless run
  process.exit(0);
}

// Run main only when executed directly (not when imported for testing)
const isDirectExecution =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectExecution) {
  main();
}

// ============================================================================
// Exports (for testing)
// ============================================================================

export { processSyncInput };
export type { SyncResult };
