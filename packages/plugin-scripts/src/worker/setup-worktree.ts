/**
 * Worktree and branch setup for the worker pipeline (step 1)
 *
 * Creates a git worktree and branch for a story:
 *   - Branch: story/<storyId>
 *   - Worktree: .saga/worktrees/<storyId>/
 *
 * Idempotent: if worktree already exists, skips creation.
 * If branch exists but worktree does not, re-creates the worktree.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { createWorktreePaths } from '@saga-ai/types';

interface SetupWorktreeResult {
  worktreePath: string;
  branch: string;
  alreadyExisted: boolean;
}

function runGit(args: string[], cwd: string): { success: boolean; output: string } {
  try {
    const output = execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    const execError = error as { stderr?: Buffer; message?: string };
    const stderr = execError.stderr?.toString().trim() || execError.message || String(error);
    return { success: false, output: stderr };
  }
}

function branchExists(branchName: string, cwd: string): boolean {
  return runGit(['rev-parse', '--verify', branchName], cwd).success;
}

function getMainBranch(cwd: string): string {
  const result = runGit(['symbolic-ref', 'refs/remotes/origin/HEAD'], cwd);
  if (result.success) {
    return result.output.replace('refs/remotes/origin/', '');
  }
  return 'main';
}

function setupWorktree(storyId: string, projectDir: string): SetupWorktreeResult {
  const branch = `story/${storyId}`;
  const { worktreeDir } = createWorktreePaths(projectDir, storyId);

  // Idempotent: if worktree directory already exists, skip
  if (existsSync(worktreeDir)) {
    process.stdout.write(`[worker] Worktree already exists: ${worktreeDir}\n`);
    return { worktreePath: worktreeDir, branch, alreadyExisted: true };
  }

  // Fetch latest main branch before creating
  const mainBranch = getMainBranch(projectDir);
  runGit(['fetch', 'origin', mainBranch], projectDir);

  // Ensure parent directory exists
  mkdirSync(dirname(worktreeDir), { recursive: true });

  if (branchExists(branch, projectDir)) {
    // Branch exists but worktree was removed — re-create worktree from existing branch
    process.stdout.write(`[worker] Branch ${branch} exists, re-creating worktree\n`);
    const result = runGit(['worktree', 'add', worktreeDir, branch], projectDir);
    if (!result.success) {
      throw new Error(`Failed to create worktree from existing branch: ${result.output}`);
    }
  } else {
    // Create new branch from latest main and attach worktree
    const result = runGit(
      ['worktree', 'add', '-b', branch, worktreeDir, `origin/${mainBranch}`],
      projectDir,
    );
    if (!result.success) {
      throw new Error(`Failed to create worktree and branch: ${result.output}`);
    }
  }

  process.stdout.write(`[worker] Created worktree: ${worktreeDir} (branch: ${branch})\n`);
  return { worktreePath: worktreeDir, branch, alreadyExisted: false };
}

export type { SetupWorktreeResult };
export { setupWorktree };
