/**
 * saga implement command - Run story implementation
 *
 * This command implements the orchestration loop that spawns worker Claude
 * instances to autonomously implement story tasks.
 *
 * The orchestrator:
 * 1. Validates story files exist in the worktree
 * 2. Loads the worker prompt template
 * 3. Spawns workers in a loop until completion
 *
 * Workers exit with status:
 * - FINISH: All tasks completed
 * - BLOCKED: Human input needed
 * - ONGOING: More work to do (triggers next worker spawn)
 *
 * Loop exits with:
 * - FINISH: All tasks completed
 * - BLOCKED: Human input needed
 * - TIMEOUT: Max time exceeded
 * - MAX_CYCLES: Max spawns reached
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

import type { DryRunCheck, DryRunResult, ImplementOptions, StoryInfo } from './types.ts';
import { DEFAULT_MAX_CYCLES, DEFAULT_MAX_TIME, DEFAULT_MODEL, WORKER_PROMPT_RELATIVE } from './types.ts';
import { runLoop, getSkillRoot, computeStoryPath, getWorktreePath } from './orchestrator.ts';
import { createSession, buildDetachedCommand } from './session-manager.ts';
import { findStory as finderFindStory } from '../find/finder.ts';

// ============================================================================
// Project Discovery
// ============================================================================

/**
 * Resolve the project path from option or environment
 *
 * @param pathOption - Optional path from CLI argument
 * @returns Resolved project path
 * @throws Error if no valid project path found
 */
function resolveProjectPath(pathOption?: string): string {
  // If path is provided, use it directly
  if (pathOption) {
    if (!existsSync(join(pathOption, '.saga'))) {
      throw new Error(`Not a SAGA project: ${pathOption} (no .saga directory)`);
    }
    return pathOption;
  }

  // Try SAGA_PROJECT_DIR environment variable
  const envPath = process.env.SAGA_PROJECT_DIR;
  if (envPath && existsSync(join(envPath, '.saga'))) {
    return envPath;
  }

  // Try current directory
  if (existsSync(join(process.cwd(), '.saga'))) {
    return process.cwd();
  }

  // Walk up the directory tree
  let dir = process.cwd();
  while (dir !== '/') {
    if (existsSync(join(dir, '.saga'))) {
      return dir;
    }
    dir = join(dir, '..');
  }

  throw new Error('SAGA project not found. Run saga init first or use --path option.');
}

// ============================================================================
// Story Finding
// ============================================================================

/**
 * Find a story by slug in the SAGA project
 *
 * Uses the shared finder utility to search through worktrees.
 * Supports fuzzy matching by slug or title.
 *
 * Returns the story info if a single match is found, null otherwise.
 */
async function findStory(projectPath: string, storySlug: string): Promise<StoryInfo | null> {
  const result = await finderFindStory(projectPath, storySlug);

  if (!result.found) {
    return null;
  }

  // Map from finder's StoryInfo to implement's StoryInfo
  return {
    epicSlug: result.data.epicSlug,
    storySlug: result.data.slug,
    storyPath: result.data.storyPath,
    worktreePath: result.data.worktreePath,
  };
}

// ============================================================================
// Dry Run Checks
// ============================================================================

/**
 * Check if a command exists in PATH
 */
function checkCommandExists(command: string): { exists: boolean; path?: string } {
  try {
    const result = spawnSync('which', [command], { encoding: 'utf-8' });
    if (result.status === 0 && result.stdout.trim()) {
      return { exists: true, path: result.stdout.trim() };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * Check SAGA_PLUGIN_ROOT environment variable
 */
function checkPluginRoot(pluginRoot: string | undefined): DryRunCheck {
  if (pluginRoot) {
    return { name: 'SAGA_PLUGIN_ROOT', path: pluginRoot, passed: true };
  }
  return { name: 'SAGA_PLUGIN_ROOT', passed: false, error: 'Environment variable not set' };
}

/**
 * Check claude CLI availability
 */
function checkClaudeCli(): DryRunCheck {
  const claudeCheck = checkCommandExists('claude');
  return {
    name: 'claude CLI',
    path: claudeCheck.path,
    passed: claudeCheck.exists,
    error: claudeCheck.exists ? undefined : 'Command not found in PATH',
  };
}

/**
 * Check worker prompt file exists
 */
function checkWorkerPrompt(pluginRoot: string): DryRunCheck {
  const skillRoot = getSkillRoot(pluginRoot);
  const workerPromptPath = join(skillRoot, WORKER_PROMPT_RELATIVE);
  const exists = existsSync(workerPromptPath);
  return {
    name: 'Worker prompt',
    path: workerPromptPath,
    passed: exists,
    error: exists ? undefined : 'File not found',
  };
}

/**
 * Check worktree directory exists
 */
function checkWorktreeExists(worktreePath: string): DryRunCheck {
  const exists = existsSync(worktreePath);
  return {
    name: 'Worktree exists',
    path: worktreePath,
    passed: exists,
    error: exists ? undefined : 'Directory not found',
  };
}

/**
 * Check story.md file exists in worktree
 */
function checkStoryMdExists(storyInfo: StoryInfo): DryRunCheck | null {
  if (!existsSync(storyInfo.worktreePath)) {
    return null;
  }
  const storyMdPath = computeStoryPath(
    storyInfo.worktreePath,
    storyInfo.epicSlug,
    storyInfo.storySlug,
  );
  const exists = existsSync(storyMdPath);
  return {
    name: 'story.md in worktree',
    path: storyMdPath,
    passed: exists,
    error: exists ? undefined : 'File not found',
  };
}

/**
 * Run dry-run validation to check all dependencies
 */
function runDryRun(
  storyInfo: StoryInfo,
  _projectPath: string,
  pluginRoot: string | undefined,
): DryRunResult {
  const checks: DryRunCheck[] = [];

  // Check 1: SAGA_PLUGIN_ROOT environment variable
  checks.push(checkPluginRoot(pluginRoot));

  // Check 2: claude CLI is available
  checks.push(checkClaudeCli());

  // Check 3: Worker prompt file
  if (pluginRoot) {
    checks.push(checkWorkerPrompt(pluginRoot));
  }

  // Check 4: Story exists
  checks.push({
    name: 'Story found',
    path: `${storyInfo.storySlug} (epic: ${storyInfo.epicSlug})`,
    passed: true,
  });

  // Check 5: Worktree exists
  checks.push(checkWorktreeExists(storyInfo.worktreePath));

  // Check 6: story.md in worktree
  const storyMdCheck = checkStoryMdExists(storyInfo);
  if (storyMdCheck) {
    checks.push(storyMdCheck);
  }

  const allPassed = checks.every((check) => check.passed);

  return {
    success: allPassed,
    checks,
    story: {
      epicSlug: storyInfo.epicSlug,
      storySlug: storyInfo.storySlug,
      worktreePath: storyInfo.worktreePath,
    },
  };
}

/**
 * Format a single check result for display
 */
function formatCheckResult(check: DryRunCheck): string[] {
  const icon = check.passed ? '\u2713' : '\u2717';
  const status = check.passed ? 'OK' : 'FAILED';
  const lines: string[] = [];

  if (check.passed) {
    const pathSuffix = check.path ? ` (${check.path})` : '';
    lines.push(`  ${icon} ${check.name}: ${status}${pathSuffix}`);
  } else {
    const errorSuffix = check.error ? ` - ${check.error}` : '';
    lines.push(`  ${icon} ${check.name}: ${status}${errorSuffix}`);
    if (check.path) {
      lines.push(`      Path: ${check.path}`);
    }
  }
  return lines;
}

/**
 * Print dry run results to console
 */
function printDryRunResults(result: DryRunResult): void {
  console.log('Dry Run: Implement Story Validation');
  console.log('');
  console.log('Checks:');
  for (const check of result.checks) {
    for (const line of formatCheckResult(check)) {
      console.log(line);
    }
  }
  console.log('');
  const summary = result.success
    ? 'All checks passed. Ready to implement.'
    : 'Some checks failed. Please resolve the issues above.';
  console.log(summary);
}

// ============================================================================
// Mode Handlers
// ============================================================================

/**
 * Handle dry-run mode for implement command
 */
function handleDryRun(
  storyInfo: StoryInfo,
  projectPath: string,
  pluginRoot: string | undefined,
): never {
  const dryRunResult = runDryRun(storyInfo, projectPath, pluginRoot);
  printDryRunResults(dryRunResult);
  process.exit(dryRunResult.success ? 0 : 1);
}

/**
 * Handle detached mode - create tmux session
 */
async function handleDetachedMode(
  storySlug: string,
  storyInfo: StoryInfo,
  projectPath: string,
  options: ImplementOptions,
): Promise<void> {
  const detachedCommand = buildDetachedCommand(storySlug, projectPath, {
    maxCycles: options.maxCycles,
    maxTime: options.maxTime,
    model: options.model,
  });

  try {
    const sessionInfo = createSession(
      storyInfo.epicSlug,
      storyInfo.storySlug,
      detachedCommand,
    );
    // Output session info as JSON for programmatic use
    console.log(JSON.stringify(sessionInfo, null, 2));
  } catch (error) {
    console.error(
      `Error creating session: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

/**
 * Handle internal session mode - run the orchestration loop
 */
async function handleInternalSession(
  storyInfo: StoryInfo,
  projectPath: string,
  pluginRoot: string,
  options: ImplementOptions,
): Promise<void> {
  const maxCycles = options.maxCycles ?? DEFAULT_MAX_CYCLES;
  const maxTime = options.maxTime ?? DEFAULT_MAX_TIME;
  const model = options.model ?? DEFAULT_MODEL;

  console.log('Starting story implementation...');
  console.log(`Story: ${storyInfo.storySlug} (epic: ${storyInfo.epicSlug})`);
  console.log(`Max cycles: ${maxCycles}, Max time: ${maxTime}min, Model: ${model}`);
  console.log('');

  const result = await runLoop(
    storyInfo.epicSlug,
    storyInfo.storySlug,
    maxCycles,
    maxTime,
    model,
    projectPath,
    pluginRoot,
  );

  if (result.status === 'ERROR') {
    console.error(`Error: ${result.summary}`);
    process.exit(1);
  }

  console.log(`\nImplementation ${result.status}: ${result.summary}`);
}

// ============================================================================
// Main Command Entry Point
// ============================================================================

/**
 * Execute the implement command
 */
export async function implementCommand(storySlug: string, options: ImplementOptions): Promise<void> {
  let projectPath: string;
  try {
    projectPath = resolveProjectPath(options.path);
  } catch (_error) {
    console.error('Error: SAGA project not found. Run saga init first or use --path option.');
    process.exit(1);
  }

  const storyInfo = await findStory(projectPath, storySlug);
  if (!storyInfo) {
    console.error(`Error: Story '${storySlug}' not found in project.`);
    console.error('Use /generate-stories to create stories for an epic first.');
    process.exit(1);
  }

  const pluginRoot = process.env.SAGA_PLUGIN_ROOT;

  if (options.dryRun) {
    handleDryRun(storyInfo, projectPath, pluginRoot);
  }

  if (!pluginRoot) {
    console.error('Error: SAGA_PLUGIN_ROOT environment variable is not set.');
    console.error('This is required to find the worker prompt template.');
    process.exit(1);
  }

  if (!existsSync(storyInfo.worktreePath)) {
    console.error(`Error: Worktree not found at ${storyInfo.worktreePath}`);
    process.exit(1);
  }

  const isInternalSession = process.env.SAGA_INTERNAL_SESSION === '1';
  if (isInternalSession) {
    await handleInternalSession(storyInfo, projectPath, pluginRoot, options);
  } else {
    await handleDetachedMode(storySlug, storyInfo, projectPath, options);
  }
}

// Re-export types for external use
export type { ImplementOptions } from './types.ts';
