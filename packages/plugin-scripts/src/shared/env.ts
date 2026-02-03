/**
 * Shared environment variable helpers for plugin-scripts
 *
 * These functions read required SAGA environment variables and throw
 * descriptive errors if they are not set.
 */

import process from 'node:process';

/**
 * Get SAGA_PROJECT_DIR from environment
 * @throws Error if not set
 */
export function getProjectDir(): string {
  const projectDir = process.env.SAGA_PROJECT_DIR;
  if (!projectDir) {
    throw new Error(
      'SAGA_PROJECT_DIR environment variable is not set.\n' +
        'This script must be run from a SAGA session where env vars are set.',
    );
  }
  return projectDir;
}

/**
 * Get SAGA_PLUGIN_ROOT from environment
 * @throws Error if not set
 */
export function getPluginRoot(): string {
  const pluginRoot = process.env.SAGA_PLUGIN_ROOT;
  if (!pluginRoot) {
    throw new Error(
      'SAGA_PLUGIN_ROOT environment variable is not set.\n' +
        'This script must be run from a SAGA session where env vars are set.',
    );
  }
  return pluginRoot;
}
