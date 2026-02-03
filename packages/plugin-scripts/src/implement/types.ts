/**
 * Types for the saga implement command
 *
 * Local type definitions for the worker orchestration system.
 * These are internal types not exported to @saga-ai/types.
 */

/**
 * Options for the implement command
 */
export interface ImplementOptions {
  maxCycles?: number;
  maxTime?: number;
  model?: string;
  dryRun?: boolean;
}

/**
 * Story info extracted from story.md or file structure
 * Maps from the finder utility's StoryInfo
 */
export interface StoryInfo {
  epicSlug: string;
  storySlug: string;
  storyPath: string;
  worktreePath: string;
}

/**
 * Result from the orchestration loop
 */
export interface LoopResult {
  status: 'FINISH' | 'BLOCKED' | 'TIMEOUT' | 'MAX_CYCLES' | 'ERROR';
  summary: string;
  cycles: number;
  elapsedMinutes: number;
  blocker: string | null;
  epicSlug: string;
  storySlug: string;
}

/**
 * Parsed worker output
 */
export interface WorkerOutput {
  status: 'ONGOING' | 'FINISH' | 'BLOCKED';
  summary: string;
  blocker?: string | null;
}

/**
 * Result of a dry run validation check
 */
export interface DryRunCheck {
  name: string;
  path?: string;
  passed: boolean;
  error?: string;
}

/**
 * Result of the dry run validation
 */
export interface DryRunResult {
  success: boolean;
  checks: DryRunCheck[];
  story?: {
    epicSlug: string;
    storySlug: string;
    worktreePath: string;
  };
}

/**
 * Loop state for worker orchestration
 */
export interface LoopState {
  summaries: string[];
  cycles: number;
  lastBlocker: string | null;
  finalStatus: LoopResult['status'] | null;
}

/**
 * Worker loop configuration
 */
export interface WorkerLoopConfig {
  workerPrompt: string;
  model: string;
  settings: Record<string, unknown>;
  worktree: string;
  maxCycles: number;
  maxTimeMs: number;
  startTime: number;
  epicSlug: string;
  storySlug: string;
  storyDir: string;
}

/**
 * Result from creating a session
 */
export interface CreateSessionResult {
  sessionName: string;
  outputFile: string;
}

// Constants
export const DEFAULT_MAX_CYCLES = 10;
export const DEFAULT_MAX_TIME = 60; // minutes
export const DEFAULT_MODEL = 'opus';

// Time conversion constants
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60_000;
export const SECONDS_PER_MINUTE = 60;

// Rounding precision constant
export const ROUNDING_PRECISION = 100;

// Worker prompt file name relative to skill root
export const WORKER_PROMPT_RELATIVE = 'worker-prompt.md';
