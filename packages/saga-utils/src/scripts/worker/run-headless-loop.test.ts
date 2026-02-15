/**
 * Tests for worker/run-headless-loop.ts - Headless run loop via Agent SDK
 *
 * Tests the runHeadlessLoop function which:
 *   - Builds a prompt from story metadata (omitting empty fields)
 *   - Runs headless Claude sessions via the Agent SDK with correct options
 *   - Checks task completion after each cycle by reading SAGA task files
 *   - Respects maxCycles and maxTime limits
 *   - Returns allCompleted, cycles, and elapsedMinutes
 *
 * Tests the buildPrompt function which:
 *   - Includes all non-empty story metadata fields
 *   - Omits empty/undefined fields
 *   - Always includes the Tasks tool instruction footer
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoryMeta } from '../hydrate/service.ts';
import type { MessageWriter, WorkerMessage } from './message-writer.ts';
import { buildPrompt, checkAllTasksCompleted, runHeadlessLoop } from './run-headless-loop.ts';

// Mock Agent SDK
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

// Mock fs for task status checking
vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { readdirSync, readFileSync } from 'node:fs';
import { query } from '@anthropic-ai/claude-agent-sdk';

const mockQuery = vi.mocked(query);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);

// Test constants
const MAX_CYCLES_THREE = 3;
const MINUTES_25_MS = 1_500_000;
const MINUTES_5_MS = 300_000;
const MAX_CYCLES_HIGH = 100;
const DEFAULT_MAX_TIME = 60;
const DEFAULT_MAX_CYCLES = 10;

/**
 * Create a mock async generator that yields SDK messages.
 * Simulates a successful query() result by default.
 */
const MOCK_UUID =
  '00000000-0000-0000-0000-000000000000' as `${string}-${string}-${string}-${string}-${string}`;

const MOCK_USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  server_tool_use: null,
};

function createMockQuery(
  subtype: 'success' | 'error_during_execution' = 'success',
): ReturnType<typeof query> {
  async function* generate() {
    await Promise.resolve();
    if (subtype === 'success') {
      yield {
        type: 'result' as const,
        subtype: 'success' as const,
        duration_ms: 1000,
        duration_api_ms: 800,
        is_error: false,
        num_turns: 1,
        result: 'Done',
        stop_reason: null,
        total_cost_usd: 0.01,
        usage: { ...MOCK_USAGE, input_tokens: 100, output_tokens: 50 },
        modelUsage: {},
        permission_denials: [],
        uuid: MOCK_UUID,
        session_id: 'test-session',
      };
    } else {
      yield {
        type: 'result' as const,
        subtype: 'error_during_execution' as const,
        duration_ms: 500,
        duration_api_ms: 400,
        is_error: true,
        num_turns: 0,
        stop_reason: null,
        total_cost_usd: 0,
        usage: MOCK_USAGE,
        modelUsage: {},
        permission_denials: [],
        errors: ['execution failed'],
        uuid: MOCK_UUID,
        session_id: 'test-session',
      };
    }
  }
  // Cast to match the Query return type (async generator with extra control methods)
  return generate() as unknown as ReturnType<typeof query>;
}

/**
 * Create a mock query that yields an assistant message before the result.
 * Used to test that SDK messages are forwarded to the message writer.
 */
function createMockQueryWithAssistant(): ReturnType<typeof query> {
  async function* generate() {
    await Promise.resolve();
    yield {
      type: 'assistant' as const,
      message: { role: 'assistant', content: 'Working on it' },
      session_id: 'test-session',
    };
    yield {
      type: 'result' as const,
      subtype: 'success' as const,
      duration_ms: 1000,
      duration_api_ms: 800,
      is_error: false,
      num_turns: 1,
      result: 'Done',
      stop_reason: null,
      total_cost_usd: 0.01,
      usage: { ...MOCK_USAGE, input_tokens: 100, output_tokens: 50 },
      modelUsage: {},
      permission_denials: [],
      uuid: MOCK_UUID,
      session_id: 'test-session',
    };
  }
  return generate() as unknown as ReturnType<typeof query>;
}

describe('buildPrompt', () => {
  const testStoryId = 'auth-setup-db';
  const testWorktreePath = '/project/.saga/worktrees/auth-setup-db';

  it('should include all non-empty story metadata fields', () => {
    const meta: StoryMeta = {
      title: 'Auth Setup',
      description: 'Set up authentication',
      guidance: 'Use JWT tokens',
      doneWhen: 'All auth tests pass',
      avoid: 'Do not use sessions',
    };

    const prompt = buildPrompt(meta, testStoryId, testWorktreePath);

    expect(prompt).toContain('Auth Setup');
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

    const prompt = buildPrompt(meta, testStoryId, testWorktreePath);

    expect(prompt).toContain('Auth Setup');
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

    const prompt = buildPrompt(meta, testStoryId, testWorktreePath);

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

    const prompt = buildPrompt(meta, testStoryId, testWorktreePath);

    expect(prompt).toContain('Done when: Tests pass');
    expect(prompt).not.toContain('Guidance:');
    expect(prompt).not.toContain('Avoid:');
  });

  it('should include session startup instructions', () => {
    const meta: StoryMeta = {
      title: 'Auth Setup',
      description: 'Set up authentication',
    };

    const prompt = buildPrompt(meta, testStoryId, testWorktreePath);

    expect(prompt).toContain('Session Startup');
    expect(prompt).toContain('TaskList');
    expect(prompt).toContain('git log');
    expect(prompt).toContain('git status');
  });

  it('should include TDD workflow instructions', () => {
    const meta: StoryMeta = {
      title: 'Auth Setup',
      description: 'Set up authentication',
    };

    const prompt = buildPrompt(meta, testStoryId, testWorktreePath);

    expect(prompt).toContain('TDD');
    expect(prompt).toContain('failing tests FIRST');
  });

  it('should include context management instructions', () => {
    const meta: StoryMeta = {
      title: 'Auth Setup',
      description: 'Set up authentication',
    };

    const prompt = buildPrompt(meta, testStoryId, testWorktreePath);

    expect(prompt).toContain('Context Management');
    expect(prompt).toContain('40-70%');
    expect(prompt).toContain('exit cleanly and resume');
  });

  it('should include journal reading step with full path', () => {
    const meta: StoryMeta = {
      title: 'Auth Setup',
      description: 'Set up authentication',
    };

    const prompt = buildPrompt(meta, testStoryId, testWorktreePath);

    expect(prompt).toContain(`${testWorktreePath}/.saga/stories/${testStoryId}/journal.md`);
    expect(prompt).toContain('journal');
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

    await expect(runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {})).rejects.toThrow(
      'No task files found',
    );
  });

  it('should call query() with correct environment variables', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    // All tasks completed after first cycle
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          env: expect.objectContaining({
            CLAUDE_CODE_ENABLE_TASKS: 'true',
            CLAUDE_CODE_TASK_LIST_ID: taskListId,
          }),
        }),
      }),
    );

    expect(result.cycles).toBe(1);
  });

  it('should pass model to query() when specified', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
      model: 'sonnet',
    });

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          model: 'sonnet',
        }),
      }),
    );
  });

  it('should use default model opus when not specified', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          model: 'opus',
        }),
      }),
    );
  });

  it('should set worktree as cwd in query() options', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          cwd: worktreePath,
        }),
      }),
    );
  });

  it('should return allCompleted=true when all tasks are completed after a cycle', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json', 't2.json'] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(result.allCompleted).toBe(true);
    expect(result.cycles).toBe(1);
  });

  it('should continue looping when tasks are not all completed', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

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

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(result.allCompleted).toBe(true);
    expect(result.cycles).toBe(2);
  });

  it('should stop at maxCycles and return allCompleted=false', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    // Tasks never complete
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'in_progress' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
      maxCycles: MAX_CYCLES_THREE,
    });

    expect(result.allCompleted).toBe(false);
    expect(result.cycles).toBe(MAX_CYCLES_THREE);
  });

  it('should use default maxCycles of 10 when not specified', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    // Tasks never complete
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'in_progress' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(result.allCompleted).toBe(false);
    expect(result.cycles).toBe(DEFAULT_MAX_CYCLES);
  });

  it('should stop when maxTime is exceeded and return allCompleted=false', async () => {
    mockQuery.mockImplementation(() => {
      // Advance time by 25 minutes per cycle so 3 cycles exceed 60 min default
      vi.advanceTimersByTime(MINUTES_25_MS);
      return createMockQuery('success');
    });

    // Tasks never complete
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'in_progress' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
      maxTime: DEFAULT_MAX_TIME,
      maxCycles: MAX_CYCLES_HIGH,
    });

    expect(result.allCompleted).toBe(false);
    // Should have run at most 3 cycles (0+25=25, 25+25=50, 50+25=75 > 60)
    expect(result.cycles).toBeLessThanOrEqual(MAX_CYCLES_THREE);
    expect(result.cycles).toBeGreaterThanOrEqual(2);
  });

  it('should return elapsedMinutes in the result', async () => {
    mockQuery.mockImplementation(() => {
      vi.advanceTimersByTime(MINUTES_5_MS);
      return createMockQuery('success');
    });

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(result.elapsedMinutes).toBeGreaterThan(0);
  });

  it('should build prompt from story metadata and pass to query()', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    const meta: StoryMeta = {
      title: 'My Story',
      description: 'Description here',
      guidance: 'Do this',
    };

    await runHeadlessLoop(storyId, taskListId, worktreePath, meta, {});

    // Verify the prompt passed to query() contains story metadata
    const queryArgs = mockQuery.mock.calls[0][0];
    expect(queryArgs.prompt).toContain('My Story');
    expect(queryArgs.prompt).toContain('Description here');
    expect(queryArgs.prompt).toContain('Do this');
  });

  it('should use bypassPermissions permission mode', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          permissionMode: 'bypassPermissions',
          allowDangerouslySkipPermissions: true,
        }),
      }),
    );
  });

  it('should handle query() error gracefully', async () => {
    mockQuery.mockImplementation(() => {
      throw new Error('query failed');
    });

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'pending' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
      maxCycles: 1,
    });

    expect(result.allCompleted).toBe(false);
    expect(result.cycles).toBe(1);
  });

  it('should use SAGA_STORY_ID env var in query() options', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          env: expect.objectContaining({
            SAGA_STORY_ID: storyId,
            SAGA_STORY_TASK_LIST_ID: taskListId,
          }),
        }),
      }),
    );
  });

  it('should wire scope validator hook into PreToolUse', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    const queryArgs = mockQuery.mock.calls[0][0];
    const hooks = queryArgs.options?.hooks;
    expect(hooks).toBeDefined();
    expect(hooks?.PreToolUse).toBeDefined();
    expect(hooks?.PreToolUse).toHaveLength(1);
    expect(hooks?.PreToolUse?.[0].matcher).toBe(
      ['Read', 'Write', 'Edit', 'Glob', 'Grep'].join('|'),
    );
    expect(hooks?.PreToolUse?.[0].hooks).toHaveLength(1);
    expect(typeof hooks?.PreToolUse?.[0].hooks[0]).toBe('function');
  });

  it('should wire sync hook into PostToolUse for TaskUpdate', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    const queryArgs = mockQuery.mock.calls[0][0];
    const hooks = queryArgs.options?.hooks;
    expect(hooks?.PostToolUse).toBeDefined();
    expect(hooks?.PostToolUse).toHaveLength(1);
    expect(hooks?.PostToolUse?.[0].matcher).toBe('TaskUpdate');
    expect(hooks?.PostToolUse?.[0].hooks).toHaveLength(2);
    expect(typeof hooks?.PostToolUse?.[0].hooks[0]).toBe('function');
    expect(typeof hooks?.PostToolUse?.[0].hooks[1]).toBe('function');
  });

  it('should set SAGA_PROJECT_DIR to worktreePath in query() env', async () => {
    mockQuery.mockReturnValue(createMockQuery('success'));

    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

    await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          env: expect.objectContaining({
            SAGA_PROJECT_DIR: worktreePath,
          }),
        }),
      }),
    );
  });

  it('should return exitCode 1 when query() yields error result', async () => {
    mockQuery.mockReturnValue(createMockQuery('error_during_execution'));

    // Tasks still pending so loop continues only if error doesn't count as completion
    mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'pending' }));

    const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
      maxCycles: 1,
    });

    // Error result → exitCode 1 → cycle counted but tasks not checked as completed
    expect(result.allCompleted).toBe(false);
    expect(result.cycles).toBe(1);
  });

  describe('messagesWriter', () => {
    function createMockWriter(): MessageWriter & { messages: WorkerMessage[] } {
      const messages: WorkerMessage[] = [];
      return {
        messages,
        write(message: WorkerMessage) {
          messages.push(message);
        },
      };
    }

    it('should forward SDK messages to the writer', async () => {
      mockQuery.mockReturnValue(createMockQueryWithAssistant());

      mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

      const writer = createMockWriter();

      await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
        maxCycles: 1,
        messagesWriter: writer,
      });

      // Should contain both the assistant and result SDK messages
      const sdkMessages = writer.messages.filter(
        (m) => (m as { type: string }).type !== 'saga_worker',
      );
      expect(sdkMessages.length).toBeGreaterThanOrEqual(2);
      expect((sdkMessages[0] as { type: string }).type).toBe('assistant');
      expect((sdkMessages[1] as { type: string }).type).toBe('result');
    });

    it('should write cycle_start event before each cycle', async () => {
      mockQuery.mockReturnValue(createMockQuery('success'));

      mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

      const writer = createMockWriter();

      await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
        maxCycles: 1,
        messagesWriter: writer,
      });

      const cycleStarts = writer.messages.filter(
        (m) =>
          (m as { type: string; subtype?: string }).type === 'saga_worker' &&
          (m as { type: string; subtype?: string }).subtype === 'cycle_start',
      );
      expect(cycleStarts).toHaveLength(1);
      const start = cycleStarts[0] as { cycle: number; maxCycles: number; timestamp: string };
      expect(start.cycle).toBe(1);
      expect(start.maxCycles).toBeDefined();
      expect(start.timestamp).toBeDefined();
    });

    it('should write cycle_end event after each cycle', async () => {
      mockQuery.mockReturnValue(createMockQuery('success'));

      mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

      const writer = createMockWriter();

      await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
        maxCycles: 1,
        messagesWriter: writer,
      });

      const cycleEnds = writer.messages.filter(
        (m) =>
          (m as { type: string; subtype?: string }).type === 'saga_worker' &&
          (m as { type: string; subtype?: string }).subtype === 'cycle_end',
      );
      expect(cycleEnds).toHaveLength(1);
      const end = cycleEnds[0] as { cycle: number; exitCode: number | null; timestamp: string };
      expect(end.cycle).toBe(1);
      expect(end.exitCode).toBe(0);
      expect(end.timestamp).toBeDefined();
    });

    it('should write cycle events for multiple cycles', async () => {
      mockQuery.mockReturnValue(createMockQuery('success'));

      mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
      let readCount = 0;
      mockReadFileSync.mockImplementation(() => {
        readCount++;
        if (readCount <= 1) {
          return JSON.stringify({ status: 'in_progress' });
        }
        return JSON.stringify({ status: 'completed' });
      });

      const writer = createMockWriter();

      await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {
        messagesWriter: writer,
      });

      const cycleStarts = writer.messages.filter(
        (m) =>
          (m as { type: string; subtype?: string }).type === 'saga_worker' &&
          (m as { type: string; subtype?: string }).subtype === 'cycle_start',
      );
      const cycleEnds = writer.messages.filter(
        (m) =>
          (m as { type: string; subtype?: string }).type === 'saga_worker' &&
          (m as { type: string; subtype?: string }).subtype === 'cycle_end',
      );
      expect(cycleStarts).toHaveLength(2);
      expect(cycleEnds).toHaveLength(2);
    });

    it('should not break existing tests when writer is not provided', async () => {
      mockQuery.mockReturnValue(createMockQuery('success'));

      mockReaddirSync.mockReturnValue(['t1.json'] as unknown as ReturnType<typeof readdirSync>);
      mockReadFileSync.mockReturnValue(JSON.stringify({ status: 'completed' }));

      // No messagesWriter passed - should use noop internally
      const result = await runHeadlessLoop(storyId, taskListId, worktreePath, storyMeta, {});

      expect(result.allCompleted).toBe(true);
      expect(result.cycles).toBe(1);
    });
  });
});
