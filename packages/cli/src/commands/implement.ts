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

import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolveProjectPath } from '../utils/project-discovery.js';
import { findStory as findStoryUtil, type StoryInfo as FinderStoryInfo } from '../utils/finder.js';
import { createSession, shellEscapeArgs } from '../lib/sessions.js';

/**
 * Options for the implement command
 */
export interface ImplementOptions {
  path?: string;
  maxCycles?: number;
  maxTime?: number;
  model?: string;
  dryRun?: boolean;
  stream?: boolean;
  attached?: boolean;
}

/**
 * Story info extracted from story.md or file structure
 * Maps from the finder utility's StoryInfo
 */
interface StoryInfo {
  epicSlug: string;
  storySlug: string;
  storyPath: string;
  worktreePath: string;
}

/**
 * Result from the orchestration loop
 */
interface LoopResult {
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
interface WorkerOutput {
  status: 'ONGOING' | 'FINISH' | 'BLOCKED';
  summary: string;
  blocker?: string | null;
}

// Constants
const DEFAULT_MAX_CYCLES = 10;
const DEFAULT_MAX_TIME = 60; // minutes
const DEFAULT_MODEL = 'opus';
const VALID_STATUSES = new Set(['ONGOING', 'FINISH', 'BLOCKED']);
const WORKER_PROMPT_RELATIVE = 'worker-prompt.md';

// JSON schema for worker output validation
const WORKER_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['ONGOING', 'FINISH', 'BLOCKED'],
    },
    summary: {
      type: 'string',
      description: 'What was accomplished this session',
    },
    blocker: {
      type: ['string', 'null'],
      description: 'Brief description if BLOCKED, null otherwise',
    },
  },
  required: ['status', 'summary'],
};

/**
 * Find a story by slug in the SAGA project
 *
 * Uses the shared finder utility to search through worktrees.
 * Supports fuzzy matching by slug or title.
 *
 * Returns the story info if a single match is found, null otherwise.
 */
async function findStory(projectPath: string, storySlug: string): Promise<StoryInfo | null> {
  const result = await findStoryUtil(projectPath, storySlug);

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

/**
 * Compute the path to story.md within a worktree
 */
function computeStoryPath(worktree: string, epicSlug: string, storySlug: string): string {
  return join(worktree, '.saga', 'epics', epicSlug, 'stories', storySlug, 'story.md');
}

/**
 * Validate that the worktree and story.md exist
 */
function validateStoryFiles(
  worktree: string,
  epicSlug: string,
  storySlug: string
): { valid: boolean; error?: string } {
  // Check worktree exists
  if (!existsSync(worktree)) {
    return {
      valid: false,
      error:
        `Worktree not found at ${worktree}\n\n` +
        `The story worktree has not been created yet. This can happen if:\n` +
        `1. The story was generated but the worktree wasn't set up\n` +
        `2. The worktree was deleted or moved\n\n` +
        `To create the worktree, use: /task-resume ${storySlug}`,
    };
  }

  // Check story.md exists
  const storyPath = computeStoryPath(worktree, epicSlug, storySlug);
  if (!existsSync(storyPath)) {
    return {
      valid: false,
      error:
        `story.md not found in worktree.\n\n` +
        `Expected location: ${storyPath}\n\n` +
        `The worktree exists but the story definition file is missing.\n` +
        `This may indicate an incomplete story setup.`,
    };
  }

  return { valid: true };
}

/**
 * Get the execute-story skill root directory
 */
function getSkillRoot(pluginRoot: string): string {
  return join(pluginRoot, 'skills', 'execute-story');
}

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
 * Result of a dry run validation check
 */
interface DryRunCheck {
  name: string;
  path?: string;
  passed: boolean;
  error?: string;
}

/**
 * Result of the dry run validation
 */
interface DryRunResult {
  success: boolean;
  checks: DryRunCheck[];
  story?: {
    epicSlug: string;
    storySlug: string;
    worktreePath: string;
  };
}

/**
 * Run dry-run validation to check all dependencies
 */
function runDryRun(
  storyInfo: StoryInfo,
  projectPath: string,
  pluginRoot: string | undefined
): DryRunResult {
  const checks: DryRunCheck[] = [];
  let allPassed = true;

  // Check 1: SAGA_PLUGIN_ROOT environment variable
  if (pluginRoot) {
    checks.push({
      name: 'SAGA_PLUGIN_ROOT',
      path: pluginRoot,
      passed: true,
    });
  } else {
    checks.push({
      name: 'SAGA_PLUGIN_ROOT',
      passed: false,
      error: 'Environment variable not set',
    });
    allPassed = false;
  }

  // Check 2: claude CLI is available
  const claudeCheck = checkCommandExists('claude');
  checks.push({
    name: 'claude CLI',
    path: claudeCheck.path,
    passed: claudeCheck.exists,
    error: claudeCheck.exists ? undefined : 'Command not found in PATH',
  });
  if (!claudeCheck.exists) allPassed = false;

  // Check 3: Worker prompt file
  if (pluginRoot) {
    const skillRoot = getSkillRoot(pluginRoot);
    const workerPromptPath = join(skillRoot, WORKER_PROMPT_RELATIVE);
    if (existsSync(workerPromptPath)) {
      checks.push({
        name: 'Worker prompt',
        path: workerPromptPath,
        passed: true,
      });
    } else {
      checks.push({
        name: 'Worker prompt',
        path: workerPromptPath,
        passed: false,
        error: 'File not found',
      });
      allPassed = false;
    }

  }

  // Check 4: Story exists
  checks.push({
    name: 'Story found',
    path: `${storyInfo.storySlug} (epic: ${storyInfo.epicSlug})`,
    passed: true,
  });

  // Check 5: Worktree exists
  if (existsSync(storyInfo.worktreePath)) {
    checks.push({
      name: 'Worktree exists',
      path: storyInfo.worktreePath,
      passed: true,
    });
  } else {
    checks.push({
      name: 'Worktree exists',
      path: storyInfo.worktreePath,
      passed: false,
      error: 'Directory not found',
    });
    allPassed = false;
  }

  // Check 6: story.md in worktree
  if (existsSync(storyInfo.worktreePath)) {
    const storyMdPath = computeStoryPath(
      storyInfo.worktreePath,
      storyInfo.epicSlug,
      storyInfo.storySlug
    );
    if (existsSync(storyMdPath)) {
      checks.push({
        name: 'story.md in worktree',
        path: storyMdPath,
        passed: true,
      });
    } else {
      checks.push({
        name: 'story.md in worktree',
        path: storyMdPath,
        passed: false,
        error: 'File not found',
      });
      allPassed = false;
    }
  }

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
 * Print dry run results to console
 */
function printDryRunResults(result: DryRunResult): void {
  console.log('Dry Run Validation');
  console.log('==================\n');

  for (const check of result.checks) {
    const icon = check.passed ? '\u2713' : '\u2717';
    const status = check.passed ? 'OK' : 'FAILED';

    if (check.passed) {
      console.log(`${icon} ${check.name}: ${check.path || status}`);
    } else {
      console.log(`${icon} ${check.name}: ${check.error}`);
      if (check.path) {
        console.log(`  Expected: ${check.path}`);
      }
    }
  }

  console.log('');
  if (result.success) {
    console.log('Dry run complete. All checks passed. Ready to implement.');
  } else {
    console.log('Dry run failed. Please fix the issues above before running implement.');
  }
}

/**
 * Load the worker prompt template
 */
function loadWorkerPrompt(pluginRoot: string): string {
  const skillRoot = getSkillRoot(pluginRoot);
  const promptPath = join(skillRoot, WORKER_PROMPT_RELATIVE);

  if (!existsSync(promptPath)) {
    throw new Error(`Worker prompt not found at ${promptPath}`);
  }

  return readFileSync(promptPath, 'utf-8');
}

/**
 * Build the settings JSON for scope enforcement hooks
 */
function buildScopeSettings(): Record<string, unknown> {
  // Use npx to run the CLI's scope-validator command
  // This avoids dependency on Python and keeps everything in TypeScript
  const hookCommand = 'npx @saga-ai/cli scope-validator';

  return {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Read|Write|Edit|Glob|Grep',
          hooks: [hookCommand],
        },
      ],
    },
  };
}

/**
 * Parse and validate worker JSON output
 */
function parseWorkerOutput(output: string): WorkerOutput {
  if (!output || !output.trim()) {
    throw new Error('Worker output is empty');
  }

  // Parse the claude CLI JSON response
  let cliResponse: Record<string, unknown>;
  try {
    cliResponse = JSON.parse(output.trim());
  } catch (e) {
    throw new Error(`Invalid JSON in worker output: ${e}`);
  }

  // Extract structured_output from the CLI response
  if (!('structured_output' in cliResponse)) {
    // Check if this is an error response
    if (cliResponse.is_error) {
      const errorMsg = cliResponse.result || 'Unknown error';
      throw new Error(`Worker failed: ${errorMsg}`);
    }
    throw new Error(`Worker output missing structured_output field. Got keys: ${Object.keys(cliResponse).join(', ')}`);
  }

  const parsed = cliResponse.structured_output as Record<string, unknown>;

  // Validate required fields
  if (!('status' in parsed)) {
    throw new Error('Worker output missing required field: status');
  }

  if (!('summary' in parsed)) {
    throw new Error('Worker output missing required field: summary');
  }

  // Validate status value
  if (!VALID_STATUSES.has(parsed.status as string)) {
    throw new Error(`Invalid status value: ${parsed.status}. Must be one of: ${[...VALID_STATUSES].join(', ')}`);
  }

  return {
    status: parsed.status as WorkerOutput['status'],
    summary: parsed.summary as string,
    blocker: (parsed.blocker as string | null) ?? null,
  };
}

/**
 * Spawn a worker Claude instance (synchronous, no streaming)
 */
function spawnWorker(
  prompt: string,
  model: string,
  settings: Record<string, unknown>,
  workingDir: string
): string {
  // Build command arguments
  const args = [
    '-p',
    prompt,
    '--model',
    model,
    '--output-format',
    'json',
    '--json-schema',
    JSON.stringify(WORKER_OUTPUT_SCHEMA),
    '--settings',
    JSON.stringify(settings),
    '--dangerously-skip-permissions',
  ];

  const result = spawnSync('claude', args, {
    cwd: workingDir,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
  });

  if (result.error) {
    throw new Error(`Failed to spawn worker: ${result.error.message}`);
  }

  // Return stdout even if exit code is non-zero
  // Worker might have output before failing
  return result.stdout || '';
}

/**
 * Parse a stream-json line and extract displayable content
 * Returns the text to display, or null if nothing to display
 */
function formatStreamLine(line: string): string | null {
  try {
    const data = JSON.parse(line);

    // Assistant message with text content
    if (data.type === 'assistant' && data.message?.content) {
      for (const block of data.message.content) {
        if (block.type === 'text' && block.text) {
          return block.text;
        }
        if (block.type === 'tool_use') {
          return `[Tool: ${block.name}]`;
        }
      }
    }

    // System init message
    if (data.type === 'system' && data.subtype === 'init') {
      return `[Session started: ${data.session_id}]`;
    }

    // Result message (final)
    if (data.type === 'result') {
      const status = data.subtype === 'success' ? 'completed' : 'failed';
      return `\n[Worker ${status} in ${Math.round(data.duration_ms / 1000)}s]`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract StructuredOutput tool call input from streaming output
 * Searches for assistant messages containing a StructuredOutput tool_use block
 * Returns the input object if found, null otherwise
 */
function extractStructuredOutputFromToolCall(
  lines: string[]
): Record<string, unknown> | null {
  // Search backwards to find the most recent StructuredOutput tool call
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(lines[i]);
      if (data.type === 'assistant' && data.message?.content) {
        for (const block of data.message.content) {
          if (block.type === 'tool_use' && block.name === 'StructuredOutput') {
            return block.input as Record<string, unknown>;
          }
        }
      }
    } catch {
      // Not valid JSON, continue
    }
  }
  return null;
}

/**
 * Parse the final result from stream-json output
 * Looks for the {"type":"result",...} line and extracts structured_output.
 * Falls back to extracting from StructuredOutput tool call if structured_output
 * is missing (can happen with error_during_execution subtype).
 */
function parseStreamingResult(buffer: string): WorkerOutput {
  const lines = buffer.split('\n').filter(line => line.trim());

  // Find the result line (should be the last one)
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const data = JSON.parse(lines[i]);
      if (data.type === 'result') {
        if (data.is_error) {
          throw new Error(`Worker failed: ${data.result || 'Unknown error'}`);
        }

        // Try to get structured_output from result, fall back to tool call
        let output = data.structured_output;
        if (!output) {
          // Fallback: extract from StructuredOutput tool call
          // This handles error_during_execution cases where structured_output
          // is missing from the result but the tool was called successfully
          output = extractStructuredOutputFromToolCall(lines);
        }

        if (!output) {
          throw new Error('Worker result missing structured_output');
        }

        if (!VALID_STATUSES.has(output.status as string)) {
          throw new Error(`Invalid status: ${output.status}`);
        }

        return {
          status: output.status as WorkerOutput['status'],
          summary: (output.summary as string) || '',
          blocker: (output.blocker as string | null) ?? null,
        };
      }
    } catch (e) {
      // Not a valid JSON line or not a result, continue searching
      if (e instanceof Error && e.message.startsWith('Worker')) {
        throw e;
      }
    }
  }

  throw new Error('No result found in worker output');
}

/**
 * Spawn a worker Claude instance with streaming output
 * Streams output to stdout in real-time while collecting the final result
 */
function spawnWorkerAsync(
  prompt: string,
  model: string,
  settings: Record<string, unknown>,
  workingDir: string
): Promise<WorkerOutput> {
  return new Promise((resolve, reject) => {
    let buffer = '';

    // Build command arguments for streaming
    const args = [
      '-p',
      prompt,
      '--model',
      model,
      '--output-format',
      'stream-json',
      '--verbose',
      '--json-schema',
      JSON.stringify(WORKER_OUTPUT_SCHEMA),
      '--settings',
      JSON.stringify(settings),
      '--dangerously-skip-permissions',
    ];

    const child = spawn('claude', args, {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      buffer += text;

      // Parse and display each line
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const formatted = formatStreamLine(line);
          if (formatted) {
            process.stdout.write(formatted);
          }
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn worker: ${err.message}`));
    });

    child.on('close', (code) => {
      // Add newline after streaming output
      process.stdout.write('\n');

      try {
        const result = parseStreamingResult(buffer);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Main orchestration loop that spawns workers until completion
 */
async function runLoop(
  epicSlug: string,
  storySlug: string,
  maxCycles: number,
  maxTime: number,
  model: string,
  projectDir: string,
  pluginRoot: string,
  stream: boolean = false
): Promise<LoopResult> {
  // Compute worktree path
  const worktree = join(projectDir, '.saga', 'worktrees', epicSlug, storySlug);

  // Validate story files (this is the authoritative validation point)
  const validation = validateStoryFiles(worktree, epicSlug, storySlug);
  if (!validation.valid) {
    return {
      status: 'ERROR',
      summary: validation.error || 'Story validation failed',
      cycles: 0,
      elapsedMinutes: 0,
      blocker: null,
      epicSlug,
      storySlug,
    };
  }

  // Load worker prompt
  let workerPrompt: string;
  try {
    workerPrompt = loadWorkerPrompt(pluginRoot);
  } catch (e: any) {
    return {
      status: 'ERROR',
      summary: e.message,
      cycles: 0,
      elapsedMinutes: 0,
      blocker: null,
      epicSlug,
      storySlug,
    };
  }

  // Build scope settings
  const settings = buildScopeSettings();

  // Initialize loop state
  const startTime = Date.now();
  let cycles = 0;
  const summaries: string[] = [];
  let lastBlocker: string | null = null;
  let finalStatus: LoopResult['status'] | null = null;

  // Compute max time in milliseconds
  const maxTimeMs = maxTime * 60 * 1000;

  while (cycles < maxCycles) {
    // Check time limit
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs >= maxTimeMs) {
      finalStatus = 'TIMEOUT';
      break;
    }

    // Spawn worker
    cycles += 1;
    let parsed: WorkerOutput;

    if (stream) {
      // Streaming mode: use async spawn with real-time output
      console.log(`\n--- Worker ${cycles} started ---\n`);
      try {
        parsed = await spawnWorkerAsync(workerPrompt, model, settings, worktree);
      } catch (e: any) {
        return {
          status: 'ERROR',
          summary: e.message,
          cycles,
          elapsedMinutes: (Date.now() - startTime) / 60000,
          blocker: null,
          epicSlug,
          storySlug,
        };
      }
      console.log(`\n--- Worker ${cycles} result: ${parsed.status} ---\n`);
    } else {
      // Non-streaming mode: use sync spawn
      let output: string;
      try {
        output = spawnWorker(workerPrompt, model, settings, worktree);
      } catch (e: any) {
        return {
          status: 'ERROR',
          summary: e.message,
          cycles,
          elapsedMinutes: (Date.now() - startTime) / 60000,
          blocker: null,
          epicSlug,
          storySlug,
        };
      }

      // Parse worker output
      try {
        parsed = parseWorkerOutput(output);
      } catch (e: any) {
        return {
          status: 'ERROR',
          summary: e.message,
          cycles,
          elapsedMinutes: (Date.now() - startTime) / 60000,
          blocker: null,
          epicSlug,
          storySlug,
        };
      }
    }

    summaries.push(parsed.summary);

    if (parsed.status === 'FINISH') {
      finalStatus = 'FINISH';
      break;
    } else if (parsed.status === 'BLOCKED') {
      finalStatus = 'BLOCKED';
      lastBlocker = parsed.blocker || null;
      break;
    }
    // ONGOING: continue loop
  }

  // Check if we hit max cycles
  if (finalStatus === null) {
    finalStatus = 'MAX_CYCLES';
  }

  // Calculate elapsed minutes
  const elapsedMinutes = (Date.now() - startTime) / 60000;

  // Combine summaries
  const combinedSummary = summaries.length === 1 ? summaries[0] : summaries.join(' | ');

  return {
    status: finalStatus,
    summary: combinedSummary,
    cycles,
    elapsedMinutes: Math.round(elapsedMinutes * 100) / 100,
    blocker: lastBlocker,
    epicSlug,
    storySlug,
  };
}

/**
 * Build the command string to run in detached mode
 * Uses the same CLI with --attached flag to run synchronously inside tmux
 *
 * All arguments are properly shell-escaped to prevent command injection
 */
function buildDetachedCommand(
  storySlug: string,
  projectPath: string,
  options: {
    maxCycles?: number;
    maxTime?: number;
    model?: string;
    stream?: boolean;
  }
): string {
  const parts = ['saga', 'implement', storySlug, '--attached'];

  // Add project path
  parts.push('--path', projectPath);

  // Add options if specified
  if (options.maxCycles !== undefined) {
    parts.push('--max-cycles', String(options.maxCycles));
  }
  if (options.maxTime !== undefined) {
    parts.push('--max-time', String(options.maxTime));
  }
  if (options.model !== undefined) {
    parts.push('--model', options.model);
  }
  if (options.stream) {
    parts.push('--stream');
  }

  // Use shell escaping to prevent command injection
  return shellEscapeArgs(parts);
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
  const storyInfo = await findStory(projectPath, storySlug);
  if (!storyInfo) {
    console.error(`Error: Story '${storySlug}' not found in SAGA project.`);
    console.error(`\nSearched in: ${join(projectPath, '.saga', 'worktrees')}`);
    console.error('\nMake sure the story worktree exists and has a story.md file.');
    console.error('Run /generate-stories to create story worktrees.');
    process.exit(1);
  }

  // Get plugin root (may be undefined for dry-run validation)
  const pluginRoot = process.env.SAGA_PLUGIN_ROOT;

  // Handle dry-run mode
  if (options.dryRun) {
    const dryRunResult = runDryRun(storyInfo, projectPath, pluginRoot);
    printDryRunResults(dryRunResult);
    process.exit(dryRunResult.success ? 0 : 1);
  }

  // Check if worktree exists
  if (!existsSync(storyInfo.worktreePath)) {
    console.error(`Error: Worktree not found at ${storyInfo.worktreePath}`);
    console.error('\nThe story worktree has not been created yet.');
    console.error('Make sure the story was properly generated with /generate-stories.');
    process.exit(1);
  }

  // If SAGA_PLUGIN_ROOT is not set, provide a helpful error
  if (!pluginRoot) {
    console.error('Error: SAGA_PLUGIN_ROOT environment variable is not set.');
    console.error('\nThis variable is required for the implementation script.');
    console.error('When running via the /implement skill, this is set automatically.');
    console.error('\nIf running manually, set it to the plugin root directory:');
    console.error('  export SAGA_PLUGIN_ROOT=/path/to/plugin');
    process.exit(1);
  }

  // Get options with defaults
  const maxCycles = options.maxCycles ?? DEFAULT_MAX_CYCLES;
  const maxTime = options.maxTime ?? DEFAULT_MAX_TIME;
  const model = options.model ?? DEFAULT_MODEL;
  const stream = options.stream ?? false;
  const attached = options.attached ?? false;

  // Detached mode (default): create tmux session
  if (!attached) {
    // Warn if --stream is used with detached mode
    if (stream) {
      console.error('Warning: --stream is ignored in detached mode. Use --attached --stream for streaming output.');
    }

    // Build the command to run inside the tmux session
    const detachedCommand = buildDetachedCommand(storySlug, projectPath, {
      maxCycles: options.maxCycles,
      maxTime: options.maxTime,
      model: options.model,
      stream: true, // Always use streaming in detached mode so output is captured
    });

    try {
      const sessionResult = await createSession(
        storyInfo.epicSlug,
        storyInfo.storySlug,
        detachedCommand
      );

      // Output session info as JSON
      console.log(JSON.stringify({
        mode: 'detached',
        sessionName: sessionResult.sessionName,
        outputFile: sessionResult.outputFile,
        epicSlug: storyInfo.epicSlug,
        storySlug: storyInfo.storySlug,
        worktreePath: storyInfo.worktreePath,
      }, null, 2));

      // Exit immediately - worker runs in background
      return;
    } catch (error: any) {
      console.error(`Error: Failed to create detached session: ${error.message}`);
      process.exit(1);
    }
  }

  // Attached mode: run synchronously
  console.log('Starting story implementation...');
  console.log(`  Epic: ${storyInfo.epicSlug}`);
  console.log(`  Story: ${storyInfo.storySlug}`);
  console.log(`  Worktree: ${storyInfo.worktreePath}`);
  console.log(`  Streaming: ${stream ? 'enabled' : 'disabled'}`);
  console.log('');

  // Run the orchestration loop
  const result = await runLoop(
    storyInfo.epicSlug,
    storyInfo.storySlug,
    maxCycles,
    maxTime,
    model,
    projectPath,
    pluginRoot,
    stream
  );

  // Output result as JSON
  console.log(JSON.stringify(result, null, 2));

  // Exit with appropriate code
  if (result.status === 'ERROR') {
    process.exit(1);
  }
}
