/**
 * saga init command - Initialize .saga/ directory structure
 *
 * This command creates the .saga/ directory structure for a SAGA project:
 *   .saga/epics/
 *   .saga/archive/
 *   .saga/worktrees/
 *
 * It also updates .gitignore to ignore worktrees/
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { findProjectRoot } from '../utils/project-discovery.ts';

/**
 * Options for the init command
 */
interface InitOptions {
  path?: string;
  dryRun?: boolean;
}

const WORKTREES_PATTERN = '.saga/worktrees/';

/**
 * Result of dry run for init command
 */
interface InitDryRunResult {
  targetPath: string;
  sagaExists: boolean;
  directories: { path: string; exists: boolean; action: string }[];
  gitignore: { path: string; exists: boolean; hasPattern: boolean; action: string };
}

/**
 * Run dry-run validation for init command
 */
function runInitDryRun(targetPath: string): InitDryRunResult {
  const sagaDir = join(targetPath, '.saga');
  const sagaExists = existsSync(sagaDir);

  const directories = [
    { name: 'epics', path: join(sagaDir, 'epics') },
    { name: 'archive', path: join(sagaDir, 'archive') },
    { name: 'worktrees', path: join(sagaDir, 'worktrees') },
  ].map((dir) => ({
    path: dir.path,
    exists: existsSync(dir.path),
    action: existsSync(dir.path) ? 'exists (skip)' : 'will create',
  }));

  const gitignorePath = join(targetPath, '.gitignore');
  const gitignoreExists = existsSync(gitignorePath);
  let hasPattern = false;
  if (gitignoreExists) {
    const content = readFileSync(gitignorePath, 'utf-8');
    hasPattern = content.includes(WORKTREES_PATTERN);
  }

  let gitignoreAction: string;
  if (!gitignoreExists) {
    gitignoreAction = 'will create with worktrees pattern';
  } else if (hasPattern) {
    gitignoreAction = 'already has pattern (skip)';
  } else {
    gitignoreAction = 'will append worktrees pattern';
  }

  return {
    targetPath,
    sagaExists,
    directories,
    gitignore: {
      path: gitignorePath,
      exists: gitignoreExists,
      hasPattern,
      action: gitignoreAction,
    },
  };
}

/**
 * Print dry run results for init command
 */
function printInitDryRunResults(result: InitDryRunResult): void {
  console.log('Dry Run: SAGA Initialization');
  console.log(`Target: ${result.targetPath}`);
  console.log('');
  console.log('Directories:');
  for (const dir of result.directories) {
    const icon = dir.exists ? '-' : '+';
    console.log(`  ${icon} ${dir.path}: ${dir.action}`);
  }
  console.log('');
  console.log('.gitignore:');
  console.log(`  ${result.gitignore.action}`);
  console.log('');
  console.log('No changes made.');
}

/**
 * Resolve the target directory for initialization
 *
 * Logic:
 * 1. If --path is provided, use that path
 * 2. If no --path, try to find existing .saga/ by walking up
 * 3. If no existing .saga/, use current working directory
 */
function resolveTargetPath(explicitPath?: string): string {
  if (explicitPath) {
    return explicitPath;
  }

  // Try to find existing project root
  const existingRoot = findProjectRoot();
  if (existingRoot) {
    return existingRoot;
  }

  // No existing .saga/, use current directory
  return process.cwd();
}

/**
 * Create the .saga/ directory structure
 */
function createDirectoryStructure(projectRoot: string): void {
  const sagaDir = join(projectRoot, '.saga');

  mkdirSync(join(sagaDir, 'epics'), { recursive: true });
  mkdirSync(join(sagaDir, 'archive'), { recursive: true });
  mkdirSync(join(sagaDir, 'worktrees'), { recursive: true });
}

/**
 * Update .gitignore to include worktrees pattern
 */
function updateGitignore(projectRoot: string): void {
  const gitignorePath = join(projectRoot, '.gitignore');

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (content.includes(WORKTREES_PATTERN)) {
      // Pattern already exists in .gitignore, no action needed
    } else {
      appendFileSync(
        gitignorePath,
        `\n# Claude Tasks - Worktrees (git worktree isolation for stories)\n${WORKTREES_PATTERN}\n`,
      );
    }
  } else {
    writeFileSync(
      gitignorePath,
      `# Claude Tasks - Worktrees (git worktree isolation for stories)\n${WORKTREES_PATTERN}\n`,
    );
  }
}

/**
 * Execute the init command
 */
function initCommand(options: InitOptions): void {
  // Validate explicit path exists and is a directory
  if (options.path) {
    if (!existsSync(options.path)) {
      console.error(`Error: Path does not exist: ${options.path}`);
      process.exit(1);
    }
    if (!statSync(options.path).isDirectory()) {
      console.error(`Error: Path is not a directory: ${options.path}`);
      process.exit(1);
    }
  }

  const targetPath = resolveTargetPath(options.path);

  // Handle dry-run mode
  if (options.dryRun) {
    const dryRunResult = runInitDryRun(targetPath);
    printInitDryRunResults(dryRunResult);
    return;
  }

  // Create directory structure
  createDirectoryStructure(targetPath);

  // Update .gitignore
  updateGitignore(targetPath);

  // Report success
  console.log(`Created .saga/ at ${targetPath}`);
}

// Export types and functions at the end of the file
export type { InitOptions };
export { initCommand };
