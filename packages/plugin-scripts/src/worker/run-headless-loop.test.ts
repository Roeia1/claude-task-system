/**
 * Tests for worker/run-headless-loop.ts - Headless run loop with prompt injection
 *
 * Tests the runHeadlessLoop function which:
 *   - Builds a prompt from story metadata (omitting empty fields)
 *   - Spawns headless Claude runs with CLAUDE_CODE_ENABLE_TASKS and CLAUDE_CODE_TASK_LIST_ID env vars
 *   - Checks task completion after each cycle by reading SAGA task files
 *   - Respects maxCycles and maxTime limits
 *   - Returns allCompleted, cycles, and elapsedMinutes
 *
 * Tests the buildPrompt function which:
 *   - Includes all non-empty story metadata fields
 *   - Omits empty/undefined fields
 *   - Always includes the Tasks tool instruction footer
 */

import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoryMeta } from '../hydrate/service.ts';
import { buildPrompt, checkAllTasksCompleted, runHeadlessLoop } from './run-headless-loop.ts';

// Mock child_process.spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs for task status checking
vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import process from 'node:process';

const mockSpawn = vi.mocked(spawn);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

// Test constants
const MOCK_PID = 12_345;
const MAX_CYCLES_THREE = 3;
const MINUTES_25_MS = 1_500_000;
const MINUTES_5_MS = 300_000;
const MAX_CYCLES_HIGH = 100;
const DEFAULT_MAX_TIME = 60;
const DEFAULT_MAX_CYCLES = 10;

// Helper to create a mock child process
function createMockChild(): ChildProcess & EventEmitter {
  const child = new EventEmitter() as ChildProcess & EventEmitter;
  child.stdout = new EventEmitter() as ChildProcess['stdout'];
  child.stderr = new EventEmitter() as ChildProcess['stderr'];
  child.pid = MOCK_PID;
  child.killed = false;
  child.kill = vi.fn();
  return child;
}

// Helper to simulate a successful headless run that closes after a tick
function simulateChildClose(child: ChildProcess & EventEmitter, code = 0): void {
  process.nextTick(() => {
    child.emit('close', code);
  });
}

describe('buildPrompt', () => {
  it('should include all non-empty story metadata fields', () => {
    const meta: StoryMeta = {
      title: 'Auth Setup',
      description: 'Set up authentication',
      guidance: 'Use JWT tokens',
      doneWhen: 'All auth tests pass',
      avoid: 'Do not use sessions',
    };

    const prompt = buildPrompt(meta);

    expect(prompt).toContain('You are working on: Auth Setup');
    expect(prompt).toContain('Set up authentication');
    expect(prompt).toContain('Guidance: Use JWT tokens');
    expect(prompt).toContain('Done when: All auth tests pass');
    expect(prompt).toContain('Avoid: Do not use sessions');
  });

  it('should omit undefined fields', () => {
    const meta: StoryMeta = {
      title: 'Auth Setup',
      description: 'Set up authentication',
    };

    const prompt = buildPrompt(meta);

    expect(prompt).toContain('You are working on: Auth Setup');
    expect(prompt).toContain('Set up authentication');
    expect(prompt).not.toContain('Guidance:');
    expect(prompt).not.toContain('Done when:');
    expect(prompt).not.toContain('Avoid:');
  });

  it('should include Tasks tool instruction footer', () => {
    const meta: StoryMeta = {
      title: 'Auth Setup',
      description: 'Set up authentication',
    };

    const prompt = buildPrompt(meta);

    expect(prompt).toContain('TaskList');
    expect(prompt).toContain('TaskGet');
    expect(prompt).toContain('TaskUpdate');
  });

  it('should only include fields that have values', () => {
    const meta: StoryMeta = {
      title: 'Task Title',
      description: 'Task description',
      guidance: undefined,
      doneWhen: 'Tests pass',
      avoid: undefined,
    };

    const prompt = buildPrompt(meta);

    expect(prompt).toContain('Done when: Tests pass');
    expect(prompt).not.toContain('Guidance:');
    expect(prompt).not.toContain('Avoid:');
  });
});

describe('checkAllTasksCompleted', () => {
  const storyDir = '/project/.saga/stories/auth-setup-db';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return true when all tasks are completed', () => {
    mockReaddirSync.mockReturnValue(['t1.json', 't2.json', 'story.json'] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockImplementation((filePath) => {
      if (String(filePath).endsWith('story.json')) {
        throw new Error('Should not read story.json');
      }
      return JSON.stringify({ status: 'completed' });
    });

    expect(checkAllTasksCompleted(storyDir)).toBe(true);
  });

  it('should return false when some tasks are not completed', () => {
    mockReaddirSync.mockReturnValue(['t1.json', 't2.json', 'story.json'] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockImplementation((filePath) => {
      if (String(filePath).includes('t1.json')) {
        return JSON.stringify({ status: 'completed' });
      }
      return JSON.stringify({ status: 'in_progress' });
    });

    expect(checkAllTasksCompleted(storyDir)).toBe(false);
  });

  it('should return false when tasks are pending', () => {
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'pending' }));

    expect(checkAllTasksCompleted(storyDir)).toBe(false);
  });

  it('should return false when there are no task files', () => {
    mockReaddirSync.mockReturnValue(['story.json'] as unknown as ReturnType<typeof readdirSync>);

    expect(checkAllTasksCompleted(storyDir)).toBe(false);
  });

  it('should exclude story.json from task checking', () => {
    mockReaddirSync.mockReturnValue(['t1.json', 'story.json'] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    checkAllTasksCompleted(storyDir);

    // readFileSync should only be called for t1.json, not story.json
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    expect(String(mockReadFileSync.mock.calls[0][0])).toContain('t1.json');
  });
});

describe('runHeadlessLoop', () => {
  const storyId = 'auth-setup-db';
  const taskListId = 'saga__auth-setup-db__1234567890';
  const projectDir = '/project';
  const worktreePath = '/project/.saga/worktrees/auth-setup-db';
  const storyMeta: StoryMeta = {
    title: 'Auth Setup',
    description: 'Set up authentication',
    guidance: 'Use JWT',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throw when story has no task files', async () => {
    mockReaddirSync.mockReturnValue(['story.json'] as unknown as ReturnType<typeof readdirSync>);

    await expect(
      runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {}),
    ).rejects.toThrow('No task files found');
  });

  it('should spawn claude with correct environment variables', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    // All tasks completed after first cycle
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {});
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;

    // Verify spawn was called with claude
    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p']),
      expect.objectContaining({
        env: expect.objectContaining({
          CLAUDE_CODE_ENABLE_TASKS: 'true',
          CLAUDE_CODE_TASK_LIST_ID: taskListId,
        }),
      }),
    );

    expect(result.cycles).toBe(1);
  });

  it('should pass --model flag to claude when specified', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {
      model: 'sonnet',
    });
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    await promise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--model', 'sonnet']),
      expect.anything(),
    );
  });

  it('should use default model opus when not specified', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {});
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    await promise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--model', 'opus']),
      expect.anything(),
    );
  });

  it('should set worktree as cwd for spawned process', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {});
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    await promise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.anything(),
      expect.objectContaining({ cwd: worktreePath }),
    );
  });

  it('should return allCompleted=true when all tasks are completed after a cycle', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json', 't2.json'] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {});
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;

    expect(result.allCompleted).toBe(true);
    expect(result.cycles).toBe(1);
  });

  it('should continue looping when tasks are not all completed', async () => {
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      process.nextTick(() => child.emit('close', 0));
      return child;
    });

    // First cycle: not all done; second cycle: all done
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    let readCallCount = 0;
    mockReadFileSync.mockImplementation(() => {
      readCallCount++;
      if (readCallCount <= 1) {
        return JSON.stringify({ status: 'in_progress' });
      }
      return JSON.stringify({ status: 'completed' });
    });

    const result = await runHeadlessLoop(
      storyId,
      taskListId,
      worktreePath,
      storyMeta,
      projectDir,
      {},
    );

    expect(result.allCompleted).toBe(true);
    expect(result.cycles).toBe(2);
  });

  it('should stop at maxCycles and return allCompleted=false', async () => {
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      process.nextTick(() => child.emit('close', 0));
      return child;
    });

    // Tasks never complete
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'in_progress' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {
      maxCycles: MAX_CYCLES_THREE,
    });

    expect(result.allCompleted).toBe(false);
    expect(result.cycles).toBe(MAX_CYCLES_THREE);
  });

  it('should use default maxCycles of 10 when not specified', async () => {
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      process.nextTick(() => child.emit('close', 0));
      return child;
    });

    // Tasks never complete
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'in_progress' }));

    const result = await runHeadlessLoop(
      storyId,
      taskListId,
      worktreePath,
      storyMeta,
      projectDir,
      {},
    );

    expect(result.allCompleted).toBe(false);
    expect(result.cycles).toBe(DEFAULT_MAX_CYCLES);
  });

  it('should stop when maxTime is exceeded and return allCompleted=false', async () => {
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      // Advance time by 25 minutes per cycle so 3 cycles exceed 60 min default
      process.nextTick(() => {
        vi.advanceTimersByTime(MINUTES_25_MS);
        child.emit('close', 0);
      });
      return child;
    });

    // Tasks never complete
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'in_progress' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {
      maxTime: DEFAULT_MAX_TIME,
      maxCycles: MAX_CYCLES_HIGH,
    });

    expect(result.allCompleted).toBe(false);
    // Should have run at most 3 cycles (0+25=25, 25+25=50, 50+25=75 > 60)
    expect(result.cycles).toBeLessThanOrEqual(MAX_CYCLES_THREE);
    expect(result.cycles).toBeGreaterThanOrEqual(2);
  });

  it('should return elapsedMinutes in the result', async () => {
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      process.nextTick(() => {
        vi.advanceTimersByTime(MINUTES_5_MS);
        child.emit('close', 0);
      });
      return child;
    });

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const result = await runHeadlessLoop(
      storyId,
      taskListId,
      worktreePath,
      storyMeta,
      projectDir,
      {},
    );

    expect(result.elapsedMinutes).toBeGreaterThan(0);
  });

  it('should build prompt from story metadata and pass to claude', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const meta: StoryMeta = {
      title: 'My Story',
      description: 'Description here',
      guidance: 'Do this',
    };

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, meta, projectDir, {});
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    await promise;

    // Verify the prompt passed to claude -p contains story metadata
    const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
    const promptIdx = spawnArgs.indexOf('-p');
    expect(promptIdx).toBeGreaterThan(-1);
    const prompt = spawnArgs[promptIdx + 1];
    expect(prompt).toContain('My Story');
    expect(prompt).toContain('Description here');
    expect(prompt).toContain('Do this');
  });

  it('should pass --dangerously-skip-permissions flag', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {});
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    await promise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--dangerously-skip-permissions']),
      expect.anything(),
    );
  });

  it('should handle spawn error gracefully', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'pending' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {
      maxCycles: 1,
    });
    process.nextTick(() => {
      child.emit('error', new Error('spawn ENOENT'));
    });
    await vi.advanceTimersByTimeAsync(0);

    const result = await promise;

    expect(result.allCompleted).toBe(false);
    expect(result.cycles).toBe(1);
  });

  it('should use SAGA_STORY_ID env var in spawned process', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {});
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    await promise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.anything(),
      expect.objectContaining({
        env: expect.objectContaining({
          SAGA_STORY_ID: storyId,
          SAGA_STORY_TASK_LIST_ID: taskListId,
        }),
      }),
    );
  });

  it('should stream stdout from child process', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {});

    // Emit some stdout data
    child.stdout?.emit('data', Buffer.from('some output'));
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    await promise;

    // Verify stdout was streamed
    const stdoutCalls = writeSpy.mock.calls.map((c) => String(c[0]));
    expect(stdoutCalls.some((c) => c.includes('some output'))).toBe(true);

    writeSpy.mockRestore();
  });

  it('should use stdio ignore for stdin and pipe for stdout/stderr', async () => {
    const child = createMockChild();
    mockSpawn.mockReturnValue(child);

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const promise = runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, projectDir, {});
    simulateChildClose(child);
    await vi.advanceTimersByTimeAsync(0);

    await promise;

    expect(mockSpawn).toHaveBeenCalledWith(
      'claude',
      expect.anything(),
      expect.objectContaining({
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
  });
});
