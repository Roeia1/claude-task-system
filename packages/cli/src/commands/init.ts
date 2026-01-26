/**
 * saga init command - Initialize .saga/ directory structure
 *
 * This command creates the .saga/ directory structure for a SAGA project.
 * It calls the init_structure.py script to do the actual work.
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findProjectRoot } from '../utils/project-discovery.js';

// In bundled CJS output, __dirname is available
declare const __dirname: string;

/**
 * Options for the init command
 */
export interface InitOptions {
  path?: string;
}

/**
 * Get the path to the scripts directory
 */
function getScriptsDir(): string {
  // __dirname will be dist/ in the bundled output
  // scripts/ is at the same level as dist/
  return join(__dirname, '..', 'scripts');
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
 * Execute the init command
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const scriptsDir = getScriptsDir();
  const scriptPath = join(scriptsDir, 'init_structure.py');

  // Verify script exists
  if (!existsSync(scriptPath)) {
    console.error(`Error: init script not found at ${scriptPath}`);
    console.error('This is likely an installation issue with the CLI package.');
    process.exit(1);
  }

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

  return new Promise<void>((resolve, reject) => {
    const pythonProcess = spawn('python3', [scriptPath, targetPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        process.exit(code || 1);
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`Error: Failed to run init script: ${err.message}`);
      console.error('Make sure Python 3 is installed and available as "python3".');
      process.exit(1);
    });
  });
}
