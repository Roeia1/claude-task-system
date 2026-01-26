/**
 * saga implement command - Run story implementation
 *
 * This command invokes the implementation orchestrator that spawns
 * worker Claude instances to autonomously implement story tasks.
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolveProjectPath } from '../utils/project-discovery.js';

// In bundled CJS output, __dirname is available
declare const __dirname: string;

/**
 * Options for the implement command
 */
export interface ImplementOptions {
  path?: string;
  maxCycles?: number;
  maxTime?: number;
  model?: string;
}

/**
 * Story info extracted from story.md or file structure
 */
interface StoryInfo {
  epicSlug: string;
  storySlug: string;
  storyPath: string;
  worktreePath: string;
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
 * Find a story by slug in the SAGA project
 *
 * Searches through all epics to find a story matching the given slug.
 * Returns the epic slug and story path if found.
 */
function findStory(projectPath: string, storySlug: string): StoryInfo | null {
  const epicsDir = join(projectPath, '.saga', 'epics');

  if (!existsSync(epicsDir)) {
    return null;
  }

  // Search through all epics
  const epicDirs = readdirSync(epicsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const epicSlug of epicDirs) {
    const storiesDir = join(epicsDir, epicSlug, 'stories');
    if (!existsSync(storiesDir)) {
      continue;
    }

    const storyDir = join(storiesDir, storySlug);
    const storyPath = join(storyDir, 'story.md');

    if (existsSync(storyPath)) {
      const worktreePath = join(projectPath, '.saga', 'worktrees', epicSlug, storySlug);
      return {
        epicSlug,
        storySlug,
        storyPath,
        worktreePath,
      };
    }
  }

  return null;
}

/**
 * Execute the implement command
 */
export async function implementCommand(storySlug: string, options: ImplementOptions): Promise<void> {
  // Resolve project path
  let projectPath: string;
  try {
    projectPath = resolveProjectPath(options.path);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }

  // Find the story
  const storyInfo = findStory(projectPath, storySlug);
  if (!storyInfo) {
    console.error(`Error: Story '${storySlug}' not found in SAGA project.`);
    console.error(`\nSearched in: ${join(projectPath, '.saga', 'epics')}`);
    console.error('\nMake sure the story exists and has a story.md file.');
    process.exit(1);
  }

  // Check if worktree exists
  if (!existsSync(storyInfo.worktreePath)) {
    console.error(`Error: Worktree not found at ${storyInfo.worktreePath}`);
    console.error('\nThe story worktree has not been created yet.');
    console.error('Make sure the story was properly generated with /generate-stories.');
    process.exit(1);
  }

  // Verify scripts directory and implement.py exist
  const scriptsDir = getScriptsDir();
  const scriptPath = join(scriptsDir, 'implement.py');

  if (!existsSync(scriptPath)) {
    console.error(`Error: implement script not found at ${scriptPath}`);
    console.error('This is likely an installation issue with the CLI package.');
    process.exit(1);
  }

  // Build script arguments
  const scriptArgs: string[] = [
    '-u', // unbuffered output
    scriptPath,
    storyInfo.epicSlug,
    storyInfo.storySlug,
  ];

  if (options.maxCycles !== undefined) {
    scriptArgs.push('--max-cycles', String(options.maxCycles));
  }
  if (options.maxTime !== undefined) {
    scriptArgs.push('--max-time', String(options.maxTime));
  }
  if (options.model !== undefined) {
    scriptArgs.push('--model', options.model);
  }

  // Set up environment variables for the script
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SAGA_PROJECT_DIR: projectPath,
    // SAGA_PLUGIN_ROOT needs to be set by the caller (plugin skill) or from env
    // The script requires it for loading worker-prompt.md
  };

  // If SAGA_PLUGIN_ROOT is not set, provide a helpful error before spawning
  if (!env.SAGA_PLUGIN_ROOT) {
    console.error('Error: SAGA_PLUGIN_ROOT environment variable is not set.');
    console.error('\nThis variable is required for the implementation script.');
    console.error('When running via the /implement skill, this is set automatically.');
    console.error('\nIf running manually, set it to the plugin root directory:');
    console.error('  export SAGA_PLUGIN_ROOT=/path/to/plugin');
    process.exit(1);
  }

  console.log('Starting story implementation...');
  console.log(`  Epic: ${storyInfo.epicSlug}`);
  console.log(`  Story: ${storyInfo.storySlug}`);
  console.log(`  Worktree: ${storyInfo.worktreePath}`);
  console.log('');

  return new Promise<void>((resolve, reject) => {
    const pythonProcess = spawn('python3', scriptArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
      cwd: storyInfo.worktreePath,
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
      console.error(`Error: Failed to run implement script: ${err.message}`);
      console.error('Make sure Python 3 is installed and available as "python3".');
      process.exit(1);
    });
  });
}
