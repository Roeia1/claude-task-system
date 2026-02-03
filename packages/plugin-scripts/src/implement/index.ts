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
import { createWorktreePaths } from '@saga-ai/types';

import type { DryRunCheck, DryRunResult, ImplementOptions, StoryInfo } from './types.ts';
import { DEFAULT_MAX_CYCLES, DEFAULT_MAX_TIME, DEFAULT_MODEL, WORKER_PROMPT_RELATIVE } from './types.ts';
import { runLoop, getSkillRoot, getWorktreePath } from './orchestrator.ts';
import { createSession, buildDetachedCommand } from './session-manager.ts';
import { findStory as finderFindStory } from '../find/finder.ts';
import { getPluginRoot, getProjectDir } from '../shared/env.ts';

// ============================================================================
// Story Finding
// ============================================================================

/**
 * Find a story by slug in the SAGA project
 *
 * Uses the shared finder utility to search through worktrees.
 * Uses SAGA_PROJECT_DIR from environment.
 * Supports fuzzy matching by slug or title.
 *
 * Returns the story info if a single match is found, null otherwise.
 */
async function findStory(storySlug: string): Promise<StoryInfo | null> {
  const projectDir = getProjectDir();
  const result = await finderFindStory(projectDir, storySlug);

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
 * Check SAGA_PROJECT_DIR environment variable
 */
function checkProjectDir(): DryRunCheck {
  const projectDir = process.env.SAGA_PROJECT_DIR;
  if (projectDir) {
    return { name: 'SAGA_PROJECT_DIR', path: projectDir, passed: true };
  }
  return { name: 'SAGA_PROJECT_DIR', passed: false, error: 'Environment variable not set' };
}

/**
 * Check SAGA_PLUGIN_ROOT environment variable
 */
function checkPluginRoot(): DryRunCheck {
  const pluginRoot = process.env.SAGA_PLUGIN_ROOT;
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
 * Uses SAGA_PLUGIN_ROOT from environment
 */
function checkWorkerPrompt(): DryRunCheck {
  const pluginRoot = process.env.SAGA_PLUGIN_ROOT;
  if (!pluginRoot) {
    return { name: 'Worker prompt', passed: false, error: 'SAGA_PLUGIN_ROOT not set' };
  }
  const skillRoot = getSkillRoot();
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
 * Uses SAGA_PROJECT_DIR from environment
 */
function checkStoryMdExists(storyInfo: StoryInfo): DryRunCheck | null {
  const projectDir = process.env.SAGA_PROJECT_DIR;
  if (!projectDir) {
    return null;
  }
  const worktreePaths = createWorktreePaths(projectDir, storyInfo.epicSlug, storyInfo.storySlug);
  if (!existsSync(worktreePaths.worktreeDir)) {
    return null;
  }
  const exists = existsSync(worktreePaths.storyMdInWorktree);
  return {
    name: 'story.md in worktree',
    path: worktreePaths.storyMdInWorktree,
    passed: exists,
    error: exists ? undefined : 'File not found',
  };
}

/**
 * Run dry-run validation to check all dependencies
 * Uses SAGA_PROJECT_DIR and SAGA_PLUGIN_ROOT from environment
 */
function runDryRun(storyInfo: StoryInfo): DryRunResult {
  const checks: DryRunCheck[] = [];
  const projectDir = process.env.SAGA_PROJECT_DIR;

  // Check 1: SAGA_PROJECT_DIR environment variable
  checks.push(checkProjectDir());

  // Check 2: SAGA_PLUGIN_ROOT environment variable
  checks.push(checkPluginRoot());

  // Check 3: claude CLI is available
  checks.push(checkClaudeCli());

  // Check 4: Worker prompt file
  checks.push(checkWorkerPrompt());

  // Check 5: Story exists
  checks.push({
    name: 'Story found',
    path: `${storyInfo.storySlug} (epic: ${storyInfo.epicSlug})`,
    passed: true,
  });

  // Check 6: Worktree exists
  if (projectDir) {
    const worktreePaths = createWorktreePaths(projectDir, storyInfo.epicSlug, storyInfo.storySlug);
    checks.push(checkWorktreeExists(worktreePaths.worktreeDir));

    // Check 7: story.md in worktree
    const storyMdCheck = checkStoryMdExists(storyInfo);
    if (storyMdCheck) {
      checks.push(storyMdCheck);
    }
  }

  const allPassed = checks.every((check) => check.passed);
  const worktreePath = projectDir
    ? createWorktreePaths(projectDir, storyInfo.epicSlug, storyInfo.storySlug).worktreeDir
    : '';

  return {
    success: allPassed,
    checks,
    story: {
      epicSlug: storyInfo.epicSlug,
      storySlug: storyInfo.storySlug,
      worktreePath,
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
function handleDryRun(storyInfo: StoryInfo): never {
  const dryRunResult = runDryRun(storyInfo);
  printDryRunResults(dryRunResult);
  process.exit(dryRunResult.success ? 0 : 1);
}

/**
 * Handle detached mode - create tmux session
 * Uses SAGA_PROJECT_DIR from environment
 */
async function handleDetachedMode(
  storySlug: string,
  storyInfo: StoryInfo,
  options: ImplementOptions,
): Promise<void> {
  const pluginRoot = getPluginRoot();
  const detachedCommand = buildDetachedCommand(storySlug, pluginRoot, {
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
 * Uses SAGA_PROJECT_DIR and SAGA_PLUGIN_ROOT from environment
 */
async function handleInternalSession(
  storyInfo: StoryInfo,
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
 * Uses SAGA_PROJECT_DIR and SAGA_PLUGIN_ROOT from environment
 */
export async function implementCommand(storySlug: string, options: ImplementOptions): Promise<void> {
  // Verify required env vars are set
  try {
    getProjectDir();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const storyInfo = await findStory(storySlug);
  if (!storyInfo) {
    console.error(`Error: Story '${storySlug}' not found in project.`);
    console.error('Use /generate-stories to create stories for an epic first.');
    process.exit(1);
  }

  if (options.dryRun) {
    handleDryRun(storyInfo);
  }

  // Verify SAGA_PLUGIN_ROOT is set
  try {
    getPluginRoot();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const worktreePath = getWorktreePath(storyInfo.epicSlug, storyInfo.storySlug);
  if (!existsSync(worktreePath)) {
    console.error(`Error: Worktree not found at ${worktreePath}`);
    process.exit(1);
  }

  const isInternalSession = process.env.SAGA_INTERNAL_SESSION === '1';
  if (isInternalSession) {
    await handleInternalSession(storyInfo, options);
  } else {
    await handleDetachedMode(storySlug, storyInfo, options);
  }
}

// Re-export types for external use
export type { ImplementOptions } from './types.ts';
