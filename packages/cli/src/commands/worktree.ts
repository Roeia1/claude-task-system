/**
 * saga worktree command - Create git worktree for a story
 *
 * This command creates the git infrastructure for story isolation:
 *   - Creates a branch: story-<story-slug>-epic-<epic-slug>
 *   - Creates a worktree: .saga/worktrees/<epic-slug>/<story-slug>/
 *
 * Usage:
 *   saga worktree <epic-slug> <story-slug>
 *   saga worktree <epic-slug> <story-slug> --path /path/to/project
 *
 * Output (JSON):
 *   { "success": true, "worktreePath": "...", "branch": "..." }
 *   { "success": false, "error": "..." }
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { resolveProjectPath } from '../utils/project-discovery.ts';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the worktree command
 */
// biome-ignore lint/style/useExportsLast: Interface exported for type safety at point of definition
export interface WorktreeOptions {
  path?: string;
}

/**
 * Result of worktree creation
 */
interface WorktreeResult {
  success: boolean;
  worktreePath?: string;
  branch?: string;
  error?: string;
}

// ============================================================================
// Git Helpers
// ============================================================================

/**
 * Run a git command and return the result
 */
function runGitCommand(args: string[], cwd: string): { success: boolean; output: string } {
  try {
    const output = execSync(`git ${args.join(' ')}`, {
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

/**
 * Check if a git branch exists
 */
function branchExists(branchName: string, cwd: string): boolean {
  const result = runGitCommand(['rev-parse', '--verify', branchName], cwd);
  return result.success;
}

/**
 * Get the main branch name (main or master)
 */
function getMainBranch(cwd: string): string {
  const result = runGitCommand(['symbolic-ref', 'refs/remotes/origin/HEAD'], cwd);
  if (result.success) {
    return result.output.replace('refs/remotes/origin/', '');
  }
  return 'main';
}

// ============================================================================
// Worktree Creation
// ============================================================================

/**
 * Create a git worktree for a story
 */
function createWorktree(projectPath: string, epicSlug: string, storySlug: string): WorktreeResult {
  const branchName = `story-${storySlug}-epic-${epicSlug}`;
  const worktreePath = join(projectPath, '.saga', 'worktrees', epicSlug, storySlug);

  // Check if branch already exists
  if (branchExists(branchName, projectPath)) {
    return {
      success: false,
      error: `Branch already exists: ${branchName}`,
    };
  }

  // Check if worktree directory already exists
  if (existsSync(worktreePath)) {
    return {
      success: false,
      error: `Worktree directory already exists: ${worktreePath}`,
    };
  }

  // Get the main branch name
  const mainBranch = getMainBranch(projectPath);

  // Fetch latest main branch
  runGitCommand(['fetch', 'origin', mainBranch], projectPath);

  // Create the branch from latest main
  const createBranchResult = runGitCommand(
    ['branch', branchName, `origin/${mainBranch}`],
    projectPath,
  );
  if (!createBranchResult.success) {
    return {
      success: false,
      error: `Failed to create branch: ${createBranchResult.output}`,
    };
  }

  // Create parent directory for worktree
  const worktreeParent = join(projectPath, '.saga', 'worktrees', epicSlug);
  mkdirSync(worktreeParent, { recursive: true });

  // Create the worktree
  const createWorktreeResult = runGitCommand(
    ['worktree', 'add', worktreePath, branchName],
    projectPath,
  );
  if (!createWorktreeResult.success) {
    return {
      success: false,
      error: `Failed to create worktree: ${createWorktreeResult.output}`,
    };
  }

  return {
    success: true,
    worktreePath,
    branch: branchName,
  };
}

// ============================================================================
// Command Entry Point
// ============================================================================

/**
 * Execute the worktree command
 */
export function worktreeCommand(
  epicSlug: string,
  storySlug: string,
  options: WorktreeOptions,
): void {
  // Resolve project path
  let projectPath: string;
  try {
    projectPath = resolveProjectPath(options.path);
  } catch (error) {
    const _result: WorktreeResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    process.exit(1);
  }

  // Create the worktree
  const result = createWorktree(projectPath, epicSlug, storySlug);

  // Exit with appropriate code
  if (!result.success) {
    process.exit(1);
  }
}
