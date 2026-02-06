/**
 * PR readiness marking and exit handling for the worker pipeline (step 6)
 *
 * Marks a draft PR as ready for review when all tasks are completed:
 *   - Uses `gh pr ready <branch>` to convert draft to ready
 *   - Handles missing PR gracefully (logs warning, does not fail)
 *
 * Provides status summary building and output file writing for
 * dashboard monitoring.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';

// ============================================================================
// Types
// ============================================================================

interface StatusSummary {
  status: 'completed' | 'incomplete';
  allCompleted: boolean;
  exitCode: number;
  cycles: number;
  elapsedMinutes: number;
}

// ============================================================================
// Exit Codes
// ============================================================================

const EXIT_SUCCESS = 0;
const EXIT_TIMEOUT = 2;

// ============================================================================
// PR Readiness
// ============================================================================

/**
 * Mark the draft PR as ready for review.
 * Only marks ready when all tasks are completed.
 * Handles missing PR gracefully (logs warning, does not throw).
 */
function markPrReady(storyId: string, worktreePath: string, allCompleted: boolean): void {
  if (!allCompleted) {
    return;
  }

  const branch = `story/${storyId}`;

  try {
    execFileSync('gh', ['pr', 'ready', branch], {
      cwd: worktreePath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    process.stdout.write(`[worker] PR marked as ready for review: ${branch}\n`);
  } catch {
    process.stderr.write(`[worker] Warning: Could not mark PR as ready for ${branch}\n`);
  }
}

// ============================================================================
// Status Summary
// ============================================================================

/**
 * Build a structured status summary from the loop result.
 * Exit code: 0 for success (all tasks done), 2 for timeout/max-cycles.
 */
function buildStatusSummary(
  allCompleted: boolean,
  cycles: number,
  elapsedMinutes: number,
): StatusSummary {
  return {
    status: allCompleted ? 'completed' : 'incomplete',
    allCompleted,
    exitCode: allCompleted ? EXIT_SUCCESS : EXIT_TIMEOUT,
    cycles,
    elapsedMinutes,
  };
}

// ============================================================================
// Output File
// ============================================================================

/**
 * Write the status summary as JSON to an output file for dashboard monitoring.
 * Creates parent directories if needed. Skips when outputFile is undefined.
 */
function writeOutputFile(outputFile: string | undefined, summary: StatusSummary): void {
  if (!outputFile) {
    return;
  }

  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, JSON.stringify(summary, null, 2), 'utf-8');
}

export type { StatusSummary };
export { buildStatusSummary, markPrReady, writeOutputFile };
