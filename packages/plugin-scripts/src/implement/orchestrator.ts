/**
 * Worker orchestrator - Main execution loop
 *
 * Manages the worker spawning loop that runs Claude instances to
 * implement story tasks. Handles cycle management, timeouts, and
 * result aggregation.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createStoryPaths, createWorktreePaths } from '@saga-ai/types';
import { getPluginRoot, getProjectDir } from '../shared/env.ts';
import { buildScopeSettings } from './scope-config.ts';
import { spawnWorkerAsync, type WorkerEnv } from './session-manager.ts';
import type { LoopResult, LoopState, StoryInfo, WorkerLoopConfig } from './types.ts';
import {
  MS_PER_MINUTE,
  MS_PER_SECOND,
  ROUNDING_PRECISION,
  SECONDS_PER_MINUTE,
  WORKER_PROMPT_RELATIVE,
} from './types.ts';

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Get the execute-story skill root directory
 */
export function getSkillRoot(): string {
  const pluginRoot = getPluginRoot();
  return join(pluginRoot, 'skills', 'execute-story');
}

/**
 * Validate that the worktree and story.md exist
 * Uses SAGA_PROJECT_DIR from environment
 */
export function validateStoryFiles(
  epicSlug: string,
  storySlug: string,
): { valid: boolean; error?: string; worktreePaths?: ReturnType<typeof createWorktreePaths> } {
  const projectDir = getProjectDir();
  const worktreePaths = createWorktreePaths(projectDir, epicSlug, storySlug);

  // Check worktree exists
  if (!existsSync(worktreePaths.worktreeDir)) {
    return {
      valid: false,
      error:
        `Worktree not found at ${worktreePaths.worktreeDir}\n\n` +
        'The story worktree has not been created yet. This can happen if:\n' +
        `1. The story was generated but the worktree wasn't set up\n` +
        '2. The worktree was deleted or moved\n\n' +
        `To create the worktree, use: /task-resume ${storySlug}`,
    };
  }

  // Check story.md exists
  if (!existsSync(worktreePaths.storyMdInWorktree)) {
    return {
      valid: false,
      error:
        'story.md not found in worktree.\n\n' +
        `Expected location: ${worktreePaths.storyMdInWorktree}\n\n` +
        'The worktree exists but the story definition file is missing.\n' +
        'This may indicate an incomplete story setup.',
    };
  }

  return { valid: true, worktreePaths };
}

/**
 * Load the worker prompt template
 * Uses SAGA_PLUGIN_ROOT from environment
 */
export function loadWorkerPrompt(): string {
  const skillRoot = getSkillRoot();
  const promptPath = join(skillRoot, WORKER_PROMPT_RELATIVE);

  if (!existsSync(promptPath)) {
    throw new Error(`Worker prompt not found at ${promptPath}`);
  }

  return readFileSync(promptPath, 'utf-8');
}

/**
 * Create an error LoopResult
 */
export function createErrorResult(
  epicSlug: string,
  storySlug: string,
  summary: string,
  cycles: number,
  elapsedMinutes: number,
): LoopResult {
  return {
    status: 'ERROR',
    summary,
    cycles,
    elapsedMinutes,
    blocker: null,
    epicSlug,
    storySlug,
  };
}

/**
 * Validate and load resources for the orchestration loop
 * Uses SAGA_PROJECT_DIR and SAGA_PLUGIN_ROOT from environment
 */
export function validateLoopResources(
  epicSlug: string,
  storySlug: string,
): { valid: true; workerPrompt: string; worktreeDir: string } | { valid: false; error: string } {
  const validation = validateStoryFiles(epicSlug, storySlug);
  if (!validation.valid) {
    return { valid: false, error: validation.error || 'Story validation failed' };
  }

  try {
    const workerPrompt = loadWorkerPrompt();
    return { valid: true, workerPrompt, worktreeDir: validation.worktreePaths?.worktreeDir };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Build final LoopResult from loop state
 */
export function buildLoopResult(
  epicSlug: string,
  storySlug: string,
  finalStatus: LoopResult['status'],
  summaries: string[],
  cycles: number,
  elapsedMinutes: number,
  lastBlocker: string | null,
): LoopResult {
  const combinedSummary = summaries.length === 1 ? summaries[0] : summaries.join(' | ');
  return {
    status: finalStatus,
    summary: combinedSummary,
    cycles,
    elapsedMinutes: Math.round(elapsedMinutes * ROUNDING_PRECISION) / ROUNDING_PRECISION,
    blocker: lastBlocker,
    epicSlug,
    storySlug,
  };
}

/**
 * Execute a single worker cycle and return the result
 */
async function executeWorkerCycle(
  config: WorkerLoopConfig,
  state: LoopState,
): Promise<{ continue: boolean; result?: LoopResult }> {
  // Check timeout
  if (Date.now() - config.startTime >= config.maxTimeMs) {
    state.finalStatus = 'TIMEOUT';
    return { continue: false };
  }

  // Check max cycles
  if (state.cycles >= config.maxCycles) {
    return { continue: false };
  }

  state.cycles += 1;

  try {
    const workerEnv: WorkerEnv = {
      epicSlug: config.epicSlug,
      storySlug: config.storySlug,
      storyDir: config.storyDir,
    };

    const parsed = await spawnWorkerAsync(
      config.workerPrompt,
      config.model,
      config.settings,
      config.worktree,
      workerEnv,
    );

    state.summaries.push(parsed.summary);

    if (parsed.status === 'FINISH') {
      state.finalStatus = 'FINISH';
      return { continue: false };
    }
    if (parsed.status === 'BLOCKED') {
      state.finalStatus = 'BLOCKED';
      state.lastBlocker = parsed.blocker || null;
      return { continue: false };
    }

    return { continue: true };
  } catch (e) {
    const elapsed = (Date.now() - config.startTime) / MS_PER_MINUTE;
    return {
      continue: false,
      result: createErrorResult(
        config.epicSlug,
        config.storySlug,
        e instanceof Error ? e.message : String(e),
        state.cycles,
        elapsed,
      ),
    };
  }
}

/**
 * Execute the worker spawning loop
 */
async function executeWorkerLoop(
  workerPrompt: string,
  model: string,
  settings: Record<string, unknown>,
  worktree: string,
  maxCycles: number,
  maxTimeMs: number,
  startTime: number,
  epicSlug: string,
  storySlug: string,
  storyDir: string,
): Promise<LoopState | LoopResult> {
  const config: WorkerLoopConfig = {
    workerPrompt,
    model,
    settings,
    worktree,
    maxCycles,
    maxTimeMs,
    startTime,
    epicSlug,
    storySlug,
    storyDir,
  };
  const state: LoopState = { summaries: [], cycles: 0, lastBlocker: null, finalStatus: null };

  // biome-ignore lint: sequential worker cycles require await in loop
  while (true) {
    const cycleResult = await executeWorkerCycle(config, state);

    if (cycleResult.result) {
      return cycleResult.result;
    }

    if (!cycleResult.continue) {
      return state;
    }
  }
}

/**
 * Main orchestration loop that spawns workers until completion
 * Uses SAGA_PROJECT_DIR and SAGA_PLUGIN_ROOT from environment
 */
export async function runLoop(
  epicSlug: string,
  storySlug: string,
  maxCycles: number,
  maxTime: number,
  model: string,
): Promise<LoopResult> {
  const resources = validateLoopResources(epicSlug, storySlug);
  if (!resources.valid) {
    return createErrorResult(epicSlug, storySlug, resources.error, 0, 0);
  }

  const settings = buildScopeSettings();
  const startTime = Date.now();
  const maxTimeMs = maxTime * SECONDS_PER_MINUTE * MS_PER_SECOND;

  // Get the story directory path using saga-types (worktree contains nested .saga structure)
  const { storyDir } = createStoryPaths(resources.worktreeDir, epicSlug, storySlug);

  const result = await executeWorkerLoop(
    resources.workerPrompt,
    model,
    settings,
    resources.worktreeDir,
    maxCycles,
    maxTimeMs,
    startTime,
    epicSlug,
    storySlug,
    storyDir,
  );

  // If result is a LoopResult (error case), return it directly
  if ('status' in result && result.status === 'ERROR') {
    return result as LoopResult;
  }

  const state = result as LoopState;
  const finalStatus = state.finalStatus ?? 'MAX_CYCLES';
  const elapsedMinutes = (Date.now() - startTime) / MS_PER_MINUTE;

  return buildLoopResult(
    epicSlug,
    storySlug,
    finalStatus,
    state.summaries,
    state.cycles,
    elapsedMinutes,
    state.lastBlocker,
  );
}

/**
 * Compute worktree path from slugs
 * Uses SAGA_PROJECT_DIR from environment
 */
export function getWorktreePath(epicSlug: string, storySlug: string): string {
  const projectDir = getProjectDir();
  const worktreePaths = createWorktreePaths(projectDir, epicSlug, storySlug);
  return worktreePaths.worktreeDir;
}

// Re-export types for convenience
export type { StoryInfo };
