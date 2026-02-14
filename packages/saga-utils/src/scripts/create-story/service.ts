/**
 * create-story service - Deterministic story creation with git infrastructure
 *
 * Single exported function that runs 5 steps:
 *   1. Create worktree (git fetch, branch, worktree add)
 *   2. Install deps (detect package manager, run install)
 *   3. Write files (story.json + task JSONs)
 *   4. Commit & push
 *   5. Create draft PR (gh pr create --draft)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createSagaPaths, createWorktreePaths } from '../../directory.ts';
import type { Story } from '../../schemas/story.ts';
import type { Task } from '../../schemas/task.ts';
import { writeStory, writeTask } from '../../storage.ts';

// ============================================================================
// Types
// ============================================================================

interface CreateStoryOptions {
  projectDir: string;
  story: Story;
  tasks: Task[];
  skipInstall?: boolean;
  skipPr?: boolean;
}

interface CreateStorySuccess {
  success: true;
  storyId: string;
  storyTitle: string;
  branch: string;
  worktreePath: string;
  prUrl: string | null;
}

interface CreateStoryFailure {
  success: false;
  error: string;
}

type CreateStoryResult = CreateStorySuccess | CreateStoryFailure;

// ============================================================================
// Git Helpers
// ============================================================================

function runGitCommand(args: string[], cwd: string): { success: boolean; output: string } {
  try {
    const output = execFileSync('git', args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    const execError = error as { stderr?: Buffer; message?: string };
    const stderr = execError.stderr?.toString().trim() || execError.message || String(error);
    return { success: false, output: stderr };
  }
}

function branchExists(branchName: string, cwd: string): boolean {
  const result = runGitCommand(['rev-parse', '--verify', branchName], cwd);
  return result.success;
}

function getMainBranch(cwd: string): string {
  const result = runGitCommand(['symbolic-ref', 'refs/remotes/origin/HEAD'], cwd);
  if (result.success) {
    return result.output.replace('refs/remotes/origin/', '');
  }
  return 'main';
}

// ============================================================================
// Package Manager Detection
// ============================================================================

function detectPackageManager(worktreePath: string): string | null {
  if (existsSync(`${worktreePath}/pnpm-lock.yaml`)) {
    return 'pnpm';
  }
  if (existsSync(`${worktreePath}/yarn.lock`)) {
    return 'yarn';
  }
  if (existsSync(`${worktreePath}/bun.lockb`) || existsSync(`${worktreePath}/bun.lock`)) {
    return 'bun';
  }
  if (existsSync(`${worktreePath}/package-lock.json`)) {
    return 'npm';
  }
  if (existsSync(`${worktreePath}/package.json`)) {
    return 'npm';
  }
  return null;
}

// ============================================================================
// Step Functions
// ============================================================================

function fail(error: string): CreateStoryFailure {
  return { success: false, error };
}

function stepCreateWorktree(
  projectDir: string,
  storyId: string,
  branchName: string,
): CreateStoryFailure | { worktreeDir: string } {
  const worktreePaths = createWorktreePaths(projectDir, storyId);

  if (branchExists(branchName, projectDir)) {
    return fail(`Branch already exists: ${branchName}`);
  }
  if (existsSync(worktreePaths.worktreeDir)) {
    return fail(`Worktree directory already exists: ${worktreePaths.worktreeDir}`);
  }

  const mainBranch = getMainBranch(projectDir);
  runGitCommand(['fetch', 'origin', mainBranch], projectDir);

  const createBranch = runGitCommand(['branch', branchName, `origin/${mainBranch}`], projectDir);
  if (!createBranch.success) {
    return fail(`Failed to create branch: ${createBranch.output}`);
  }

  mkdirSync(dirname(worktreePaths.worktreeDir), { recursive: true });

  const createWt = runGitCommand(
    ['worktree', 'add', worktreePaths.worktreeDir, branchName],
    projectDir,
  );
  if (!createWt.success) {
    return fail(`Failed to create worktree: ${createWt.output}`);
  }

  return { worktreeDir: worktreePaths.worktreeDir };
}

function stepInstallDeps(worktreeDir: string): CreateStoryFailure | null {
  const pm = detectPackageManager(worktreeDir);
  if (!pm) {
    return null;
  }
  try {
    execFileSync(pm, ['install'], {
      cwd: worktreeDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return null;
  } catch (error) {
    const execError = error as { stderr?: Buffer; message?: string };
    const stderr = execError.stderr?.toString().trim() || execError.message || String(error);
    return fail(`Failed to install dependencies: ${stderr}`);
  }
}

function stepCommitAndPush(
  worktreeDir: string,
  storyId: string,
  branchName: string,
): CreateStoryFailure | null {
  const storyDir = `.saga/stories/${storyId}/`;
  runGitCommand(['add', storyDir], worktreeDir);

  const commitResult = runGitCommand(
    ['commit', '-m', `docs(${storyId}): add story definition`],
    worktreeDir,
  );
  if (!commitResult.success) {
    return fail(`Failed to commit: ${commitResult.output}`);
  }

  const pushResult = runGitCommand(['push', '-u', 'origin', branchName], worktreeDir);
  if (!pushResult.success) {
    return fail(`Failed to push: ${pushResult.output}`);
  }
  return null;
}

function stepCreatePr(
  worktreeDir: string,
  storyId: string,
  branchName: string,
  enrichedStory: Story,
): string | null {
  try {
    const prBody = `## Story: ${enrichedStory.title}\n\n**ID**: \`${storyId}\`\n\nTo execute this story, run:\n\`\`\`\n/execute-story ${storyId}\n\`\`\``;
    const prOutput = execFileSync(
      'gh',
      [
        'pr',
        'create',
        '--draft',
        '--title',
        `Story: ${storyId}`,
        '--body',
        prBody,
        '--head',
        branchName,
      ],
      { cwd: worktreeDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const prUrl = prOutput.trim();

    // Update story.json with PR URL and amend+force-push
    const storyDir = `.saga/stories/${storyId}/`;
    writeStory(worktreeDir, { ...enrichedStory, pr: prUrl });
    runGitCommand(['add', storyDir], worktreeDir);
    runGitCommand(['commit', '--amend', '--no-edit'], worktreeDir);
    runGitCommand(['push', '--force-with-lease'], worktreeDir);
    return prUrl;
  } catch {
    // PR creation is best-effort; continue without it
    return null;
  }
}

// ============================================================================
// Service
// ============================================================================

function createStory(options: CreateStoryOptions): CreateStoryResult {
  const { projectDir, story, tasks, skipInstall = false, skipPr = false } = options;
  const storyId = story.id;
  const branchName = `story/${storyId}`;

  // Validate .saga/ exists
  const sagaPaths = createSagaPaths(projectDir);
  if (!existsSync(sagaPaths.saga)) {
    return fail(`No .saga/ directory found at: ${projectDir}`);
  }

  // Step 1: Create worktree
  const wtResult = stepCreateWorktree(projectDir, storyId, branchName);
  if ('success' in wtResult) {
    return wtResult;
  }
  const { worktreeDir } = wtResult;

  // Step 2: Install dependencies
  if (!skipInstall) {
    const installErr = stepInstallDeps(worktreeDir);
    if (installErr) {
      return installErr;
    }
  }

  // Step 3: Write files
  const enrichedStory: Story = {
    ...story,
    branch: branchName,
    worktree: `.saga/worktrees/${storyId}/`,
  };
  writeStory(worktreeDir, enrichedStory);
  for (const task of tasks) {
    writeTask(worktreeDir, storyId, task);
  }

  // Step 4: Commit & push
  const commitErr = stepCommitAndPush(worktreeDir, storyId, branchName);
  if (commitErr) {
    return commitErr;
  }

  // Step 5: Create draft PR
  const prUrl = skipPr ? null : stepCreatePr(worktreeDir, storyId, branchName, enrichedStory);

  return {
    success: true,
    storyId,
    storyTitle: enrichedStory.title,
    branch: branchName,
    worktreePath: worktreeDir,
    prUrl,
  };
}

export { createStory };
export type { CreateStoryOptions, CreateStoryResult };
