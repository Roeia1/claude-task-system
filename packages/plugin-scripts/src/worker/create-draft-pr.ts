/**
 * Draft PR creation for the worker pipeline (step 2)
 *
 * Creates a draft PR for the story branch:
 *   - Pushes the branch to origin
 *   - Creates a draft PR via `gh pr create --draft`
 *
 * Idempotent: if a PR already exists for the branch, skips creation.
 */

import { execFileSync } from 'node:child_process';
import process from 'node:process';

interface CreateDraftPrResult {
  prUrl: string;
  alreadyExisted: boolean;
}

function findExistingPr(branch: string, cwd: string): { number: number; url: string } | null {
  try {
    const output = execFileSync(
      'gh',
      ['pr', 'list', '--head', branch, '--json', 'number,url', '--limit', '1'],
      { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const parsed = JSON.parse(output.trim());
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch {
    // Malformed JSON or gh failure — treat as no existing PR
  }
  return null;
}

function pushBranch(branch: string, cwd: string): void {
  execFileSync('git', ['push', '-u', 'origin', branch], {
    cwd,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function createDraftPr(storyId: string, worktreePath: string): CreateDraftPrResult {
  const branch = `story/${storyId}`;

  // Check if PR already exists
  const existing = findExistingPr(branch, worktreePath);
  if (existing) {
    process.stdout.write(`[worker] PR already exists: ${existing.url}\n`);
    return { prUrl: existing.url, alreadyExisted: true };
  }

  // Push branch to origin before creating PR
  pushBranch(branch, worktreePath);

  // Create draft PR
  try {
    const prUrl = execFileSync(
      'gh',
      [
        'pr',
        'create',
        '--draft',
        '--title',
        `Story: ${storyId}`,
        '--body',
        `Automated draft PR for story \`${storyId}\`.\n\nCreated by SAGA worker.`,
      ],
      { cwd: worktreePath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();

    process.stdout.write(`[worker] Created draft PR: ${prUrl}\n`);
    return { prUrl, alreadyExisted: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create draft PR: ${message}`);
  }
}

export type { CreateDraftPrResult };
export { createDraftPr };
