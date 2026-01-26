/**
 * Project discovery utility for SAGA CLI
 *
 * Walks up from the current working directory to find the .saga/ directory,
 * similar to how git discovers the .git/ directory.
 */

import { existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';

/**
 * Find the project root by walking up from startDir looking for .saga/
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns The directory containing .saga/, or null if not found
 */
export function findProjectRoot(startDir?: string): string | null {
  let currentDir = startDir ?? process.cwd();

  // Walk up the directory tree
  while (true) {
    const sagaDir = join(currentDir, '.saga');
    if (existsSync(sagaDir)) {
      return currentDir;
    }

    // Get parent directory
    const parentDir = dirname(currentDir);

    // Stop if we've reached the filesystem root
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

/**
 * Resolve the project path, using explicit path or discovery
 * @param explicitPath - Explicit path to use (optional)
 * @returns The resolved project path
 * @throws Error if project not found
 */
export function resolveProjectPath(explicitPath?: string): string {
  if (explicitPath) {
    // Check if the explicit path contains .saga/
    const sagaDir = join(explicitPath, '.saga');
    if (!existsSync(sagaDir)) {
      throw new Error(
        `No .saga/ directory found at specified path: ${explicitPath}\n` +
          'Make sure the path points to a SAGA project root.'
      );
    }
    return explicitPath;
  }

  // Use discovery from cwd
  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    throw new Error(
      'Could not find a SAGA project.\n' +
        'No .saga/ directory found in the current directory or any parent.\n' +
        'Run "saga init" to initialize a new project, or use --path to specify the project location.'
    );
  }

  return projectRoot;
}
