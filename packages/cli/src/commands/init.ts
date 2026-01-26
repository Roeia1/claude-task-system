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

import { join } from 'node:path';
import { existsSync, statSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { findProjectRoot } from '../utils/project-discovery.js';

/**
 * Options for the init command
 */
export interface InitOptions {
  path?: string;
}

const WORKTREES_PATTERN = '.saga/worktrees/';

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

  console.log('Created .saga/ directory structure');
}

/**
 * Update .gitignore to include worktrees pattern
 */
function updateGitignore(projectRoot: string): void {
  const gitignorePath = join(projectRoot, '.gitignore');

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (content.includes(WORKTREES_PATTERN)) {
      console.log('.gitignore already contains worktrees pattern');
    } else {
      appendFileSync(
        gitignorePath,
        `\n# Claude Tasks - Worktrees (git worktree isolation for stories)\n${WORKTREES_PATTERN}\n`
      );
      console.log('Updated .gitignore with worktrees pattern');
    }
  } else {
    writeFileSync(
      gitignorePath,
      `# Claude Tasks - Worktrees (git worktree isolation for stories)\n${WORKTREES_PATTERN}\n`
    );
    console.log('Created .gitignore with worktrees pattern');
  }
}

/**
 * Execute the init command
 */
export async function initCommand(options: InitOptions): Promise<void> {
  // Validate explicit path exists and is a directory
  if (options.path) {
    if (!existsSync(options.path)) {
      console.error(`Error: Specified path '${options.path}' does not exist`);
      process.exit(1);
    }
    if (!statSync(options.path).isDirectory()) {
      console.error(`Error: Specified path '${options.path}' is not a directory`);
      process.exit(1);
    }
  }

  const targetPath = resolveTargetPath(options.path);

  // Create directory structure
  createDirectoryStructure(targetPath);

  // Update .gitignore
  updateGitignore(targetPath);

  console.log(`Initialized .saga/ at ${targetPath}`);
}
