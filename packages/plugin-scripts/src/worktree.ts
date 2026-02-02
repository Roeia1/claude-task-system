/**
 * saga worktree script - Create git worktree for a story
 *
 * This script creates the git infrastructure for story isolation:
 *   - Creates a branch: story-<story-slug>-epic-<epic-slug>
 *   - Creates a worktree: .saga/worktrees/<epic-slug>/<story-slug>/
 *
 * Usage:
 *   node worktree.js <epic-slug> <story-slug>
 *   node worktree.js <epic-slug> <story-slug> --path /path/to/project
 *
 * Output (JSON):
 *   { "success": true, "worktreePath": "...", "branch": "..." }
 *   { "success": false, "error": "..." }
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

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
 * Resolve the project path, using explicit path or cwd
 * @param explicitPath - Explicit path to use (optional)
 * @returns The resolved project path
 * @throws Error if project not found
 */
function resolveProjectPath(explicitPath?: string): string {
  const targetPath = explicitPath ?? process.cwd();

  // Check if the path contains .saga/
  const sagaDir = join(targetPath, '.saga');
  if (!existsSync(sagaDir)) {
    throw new Error(
      `No .saga/ directory found at specified path: ${targetPath}\n` +
        'Make sure the path points to a SAGA project root.',
    );
  }
  return targetPath;
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
// CLI Argument Parsing
// ============================================================================

function printHelp(): void {
  console.log(`Usage: worktree <epic-slug> <story-slug> [options]

Create a git worktree for story isolation.

Arguments:
  epic-slug    The epic identifier
  story-slug   The story identifier

Options:
  --path <path>  Path to the SAGA project (defaults to current directory)
  --help         Show this help message

Output (JSON):
  { "success": true, "worktreePath": "...", "branch": "..." }
  { "success": false, "error": "..." }

Examples:
  worktree my-epic my-story
  worktree my-epic my-story --path /path/to/project
`);
}

function parseArgs(args: string[]): { epicSlug?: string; storySlug?: string; path?: string; help: boolean } {
  const result: { epicSlug?: string; storySlug?: string; path?: string; help: boolean } = { help: false };
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--path') {
      result.path = args[++i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (positional.length >= 1) result.epicSlug = positional[0];
  if (positional.length >= 2) result.storySlug = positional[1];

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

  if (!args.epicSlug || !args.storySlug) {
    console.error('Error: Both epic-slug and story-slug are required.\n');
    printHelp();
    process.exit(1);
  }

  // Resolve project path
  let projectPath: string;
  try {
    projectPath = resolveProjectPath(args.path);
  } catch (error) {
    const result: WorktreeResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Create the worktree
  const result = createWorktree(projectPath, args.epicSlug, args.storySlug);

  // Output JSON result
  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  if (!result.success) {
    process.exit(1);
  }
}

// Run main
main();
