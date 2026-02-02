/**
 * Worker orchestrator - Main execution loop
 *
 * Manages the worker spawning loop that runs Claude instances to
 * implement story tasks. Handles cycle management, timeouts, and
 * result aggregation.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { LoopResult, LoopState, StoryInfo, WorkerLoopConfig } from './types.ts';
import {
  MS_PER_MINUTE,
  MS_PER_SECOND,
  ROUNDING_PRECISION,
  SECONDS_PER_MINUTE,
  WORKER_PROMPT_RELATIVE,
} from './types.ts';
import { buildScopeSettings } from './scope-config.ts';
import { spawnWorkerAsync } from './session-manager.ts';

/**
 * Get the execute-story skill root directory
 */
export function getSkillRoot(pluginRoot: string): string {
  return join(pluginRoot, 'skills', 'execute-story');
}

/**
 * Compute the path to story.md within a worktree
 */
export function computeStoryPath(worktree: string, epicSlug: string, storySlug: string): string {
  return join(worktree, '.saga', 'epics', epicSlug, 'stories', storySlug, 'story.md');
}

/**
 * Validate that the worktree and story.md exist
 */
export function validateStoryFiles(
  worktree: string,
  epicSlug: string,
  storySlug: string,
): { valid: boolean; error?: string } {
  // Check worktree exists
  if (!existsSync(worktree)) {
    return {
      valid: false,
      error:
        `Worktree not found at ${worktree}\n\n` +
        'The story worktree has not been created yet. This can happen if:\n' +
        `1. The story was generated but the worktree wasn't set up\n` +
        '2. The worktree was deleted or moved\n\n' +
        `To create the worktree, use: /task-resume ${storySlug}`,
    };
  }

  // Check story.md exists
  const storyPath = computeStoryPath(worktree, epicSlug, storySlug);
  if (!existsSync(storyPath)) {
    return {
      valid: false,
      error:
        'story.md not found in worktree.\n\n' +
        `Expected location: ${storyPath}\n\n` +
        'The worktree exists but the story definition file is missing.\n' +
        'This may indicate an incomplete story setup.',
    };
  }

  return { valid: true };
}

/**
 * Load the worker prompt template
 */
export function loadWorkerPrompt(pluginRoot: string): string {
  const skillRoot = getSkillRoot(pluginRoot);
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
 */
export function validateLoopResources(
  worktree: string,
  epicSlug: string,
  storySlug: string,
  pluginRoot: string,
): { valid: true; workerPrompt: string } | { valid: false; error: string } {
  const validation = validateStoryFiles(worktree, epicSlug, storySlug);
  if (!validation.valid) {
    return { valid: false, error: validation.error || 'Story validation failed' };
  }

  try {
    const workerPrompt = loadWorkerPrompt(pluginRoot);
    return { valid: true, workerPrompt };
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
    const parsed = await spawnWorkerAsync(
      config.workerPrompt,
      config.model,
      config.settings,
      config.worktree,
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
 * Execute the worker spawning loop using recursion
 */
function executeWorkerLoop(
  workerPrompt: string,
  model: string,
  settings: Record<string, unknown>,
  worktree: string,
  maxCycles: number,
  maxTimeMs: number,
  startTime: number,
  epicSlug: string,
  storySlug: string,
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
  };
  const state: LoopState = { summaries: [], cycles: 0, lastBlocker: null, finalStatus: null };

  // Use recursive async function to avoid await in loop
  const runNextCycle = async (): Promise<LoopState | LoopResult> => {
    const cycleResult = await executeWorkerCycle(config, state);

    if (cycleResult.result) {
      return cycleResult.result;
    }

    if (cycleResult.continue) {
      return runNextCycle();
    }

    return state;
  };

  return runNextCycle();
}

/**
 * Main orchestration loop that spawns workers until completion
 */
export async function runLoop(
  epicSlug: string,
  storySlug: string,
  maxCycles: number,
  maxTime: number,
  model: string,
  projectDir: string,
  pluginRoot: string,
): Promise<LoopResult> {
  const worktree = join(projectDir, '.saga', 'worktrees', epicSlug, storySlug);

  const resources = validateLoopResources(worktree, epicSlug, storySlug, pluginRoot);
  if (!resources.valid) {
    return createErrorResult(epicSlug, storySlug, resources.error, 0, 0);
  }

  const settings = buildScopeSettings();
  const startTime = Date.now();
  const maxTimeMs = maxTime * SECONDS_PER_MINUTE * MS_PER_SECOND;

  const result = await executeWorkerLoop(
    resources.workerPrompt,
    model,
    settings,
    worktree,
    maxCycles,
    maxTimeMs,
    startTime,
    epicSlug,
    storySlug,
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
 * Compute worktree path from project dir and slugs
 */
export function getWorktreePath(projectDir: string, epicSlug: string, storySlug: string): string {
  return join(projectDir, '.saga', 'worktrees', epicSlug, storySlug);
}

// Re-export types for convenience
export type { StoryInfo };
