/**
 * saga worktree script - Create git worktree for a story
 *
 * This script creates the git infrastructure for story isolation:
 *   - Creates a branch: story/<storyId>
 *   - Creates a worktree: .saga/worktrees/<storyId>/
 *
 * Usage:
 *   node worktree.js <storyId>
 *
 * Output (JSON):
 *   { "success": true, "worktreePath": "...", "branch": "..." }
 *   { "success": false, "error": "..." }
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';
import { createSagaPaths, createWorktreePaths } from '../directory.ts';
import { getProjectDir as getProjectDirEnv } from './shared/env.ts';

// ============================================================================
// Types
// ============================================================================

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
// Project Discovery
// ============================================================================

/**
 * Get SAGA_PROJECT_DIR from environment and validate .saga/ exists
 * @throws Error if not set or invalid
 */
function getProjectDir(): string {
  const projectDir = getProjectDirEnv();

  const sagaPaths = createSagaPaths(projectDir);
  if (!existsSync(sagaPaths.saga)) {
    throw new Error(
      `No .saga/ directory found at SAGA_PROJECT_DIR: ${projectDir}\n` +
        'Make sure SAGA_PROJECT_DIR points to a SAGA project root.',
    );
  }

  return projectDir;
}

// ============================================================================
// Git Helpers
// ============================================================================

/**
 * Run a git command and return the result
 */
function runGitCommand(args: string[], cwd: string): { success: boolean; output: string } {
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
function createWorktree(projectPath: string, storyId: string): WorktreeResult {
  const branchName = `story/${storyId}`;
  const worktreePaths = createWorktreePaths(projectPath, storyId);

  // Check if branch already exists
  if (branchExists(branchName, projectPath)) {
    return {
      success: false,
      error: `Branch already exists: ${branchName}`,
    };
  }

  // Check if worktree directory already exists
  if (existsSync(worktreePaths.worktreeDir)) {
    return {
      success: false,
      error: `Worktree directory already exists: ${worktreePaths.worktreeDir}`,
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
  const worktreeParent = dirname(worktreePaths.worktreeDir);
  mkdirSync(worktreeParent, { recursive: true });

  // Create the worktree
  const createWorktreeResult = runGitCommand(
    ['worktree', 'add', worktreePaths.worktreeDir, branchName],
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
    worktreePath: worktreePaths.worktreeDir,
    branch: branchName,
  };
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function printHelp(): void {
  console.log(`Usage: worktree <storyId>

Create a git worktree for story isolation.

Arguments:
  storyId      The story identifier

Options:
  --help       Show this help message

Environment (required):
  SAGA_PROJECT_DIR   Project root directory

Output (JSON):
  { "success": true, "worktreePath": "...", "branch": "..." }
  { "success": false, "error": "..." }

Examples:
  worktree my-story-id
`);
}

function parseArgs(args: string[]): {
  storyId?: string;
  help: boolean;
} {
  const result: { storyId?: string; help: boolean } = {
    help: false,
  };
  const positional: string[] = [];

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    result.storyId = positional[0];
  }

  return result;
}

// ============================================================================
// Main Entry Point
// ============================================================================

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.storyId) {
    console.error('Error: storyId is required.\n');
    printHelp();
    process.exit(1);
  }

  // Get project path from environment
  let projectPath: string;
  try {
    projectPath = getProjectDir();
  } catch (error) {
    const result: WorktreeResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Create the worktree
  const result = createWorktree(projectPath, args.storyId);

  // Output JSON result
  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  if (!result.success) {
    process.exit(1);
  }
}

// Run main
main();
