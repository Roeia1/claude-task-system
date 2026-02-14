/**
 * Tests for worker/mark-pr-ready.ts - PR readiness marking and exit handling
 *
 * Tests the markPrReady function which:
 *   - Marks a draft PR as ready for review via `gh pr ready` when all tasks are completed
 *   - Skips marking when tasks are incomplete (timeout/max-cycles)
 *   - Handles missing PR gracefully (logs warning, does not throw)
 *
 * Tests the buildStatusSummary function which:
 *   - Returns structured summary with cycles, elapsed time, and final status
 *   - Computes exit code: 0 for success, 2 for timeout/max-cycles
 *
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock child_process.execFileSync
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { buildStatusSummary, markPrReady } from './mark-pr-ready.ts';

const mockExecFileSync = vi.mocked(execFileSync);

// Test constants
const EXIT_SUCCESS = 0;
const EXIT_TIMEOUT = 2;
const CYCLES_1 = 1;
const CYCLES_3 = 3;
const CYCLES_5 = 5;
const CYCLES_10 = 10;
const ELAPSED_1 = 1.0;
const ELAPSED_5 = 5.0;
const ELAPSED_12_5 = 12.5;
const ELAPSED_60 = 60.0;

describe('markPrReady', () => {
  const storyId = 'auth-setup-db';
  const worktreePath = '/project/.saga/worktrees/auth-setup-db';

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call gh pr ready with the story branch when all tasks completed', () => {
    mockExecFileSync.mockReturnValue('');

    markPrReady(storyId, worktreePath, true);

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'gh',
      ['pr', 'ready', 'story/auth-setup-db'],
      expect.objectContaining({ cwd: worktreePath }),
    );
  });

  it('should not call gh pr ready when tasks are incomplete', () => {
    markPrReady(storyId, worktreePath, false);

    expect(mockExecFileSync).not.toHaveBeenCalled();
  });

  it('should handle missing PR gracefully (no throw)', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('no pull requests found');
    });

    expect(() => markPrReady(storyId, worktreePath, true)).not.toThrow();
  });

  it('should log warning when PR is not found', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('no pull requests found');
    });

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    markPrReady(storyId, worktreePath, true);

    const stderrCalls = stderrSpy.mock.calls.map((c) => String(c[0]));
    expect(
      stderrCalls.some(
        (c) => c.toLowerCase().includes('warning') || c.toLowerCase().includes('pr'),
      ),
    ).toBe(true);
  });

  it('should log success message when PR is marked ready', () => {
    mockExecFileSync.mockReturnValue('');

    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    markPrReady(storyId, worktreePath, true);

    const stdoutCalls = stdoutSpy.mock.calls.map((c) => String(c[0]));
    expect(stdoutCalls.some((c) => c.includes('ready'))).toBe(true);
  });

  it('should use story/<storyId> as the branch identifier', () => {
    mockExecFileSync.mockReturnValue('');

    markPrReady('my-feature', worktreePath, true);

    const ghArgs = mockExecFileSync.mock.calls[0][1] as string[];
    expect(ghArgs).toContain('story/my-feature');
  });

  it('should run gh command with encoding utf-8', () => {
    mockExecFileSync.mockReturnValue('');

    markPrReady(storyId, worktreePath, true);

    expect(mockExecFileSync).toHaveBeenCalledWith(
      'gh',
      expect.anything(),
      expect.objectContaining({ encoding: 'utf-8' }),
    );
  });
});

describe('buildStatusSummary', () => {
  it('should return exit code 0 when all tasks completed', () => {
    const summary = buildStatusSummary(true, CYCLES_5, ELAPSED_12_5);

    expect(summary.exitCode).toBe(EXIT_SUCCESS);
  });

  it('should return exit code 2 when tasks are incomplete', () => {
    const summary = buildStatusSummary(false, CYCLES_10, ELAPSED_60);

    expect(summary.exitCode).toBe(EXIT_TIMEOUT);
  });

  it('should include cycles in the summary', () => {
    const summary = buildStatusSummary(true, CYCLES_3, ELAPSED_5);

    expect(summary.cycles).toBe(CYCLES_3);
  });

  it('should include elapsed minutes in the summary', () => {
    const summary = buildStatusSummary(true, CYCLES_3, ELAPSED_12_5);

    expect(summary.elapsedMinutes).toBe(ELAPSED_12_5);
  });

  it('should include allCompleted flag in the summary', () => {
    const summary = buildStatusSummary(true, CYCLES_1, ELAPSED_1);
    expect(summary.allCompleted).toBe(true);

    const summary2 = buildStatusSummary(false, CYCLES_10, ELAPSED_60);
    expect(summary2.allCompleted).toBe(false);
  });

  it('should include status string: completed or incomplete', () => {
    const completed = buildStatusSummary(true, CYCLES_1, ELAPSED_1);
    expect(completed.status).toBe('completed');

    const incomplete = buildStatusSummary(false, CYCLES_10, ELAPSED_60);
    expect(incomplete.status).toBe('incomplete');
  });
});
