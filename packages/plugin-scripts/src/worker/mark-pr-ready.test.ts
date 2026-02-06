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
 * Tests the writeOutputFile function which:
 *   - Writes the status summary as JSON to the specified file path
 *   - Skips writing when no output file is specified
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock child_process.execFileSync
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

// Mock fs for output file writing
vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { buildStatusSummary, markPrReady, writeOutputFile } from './mark-pr-ready.ts';

const mockExecFileSync = vi.mocked(execFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockMkdirSync = vi.mocked(mkdirSync);

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
const ELAPSED_59_8 = 59.8;
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

describe('writeOutputFile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should write JSON summary to the specified file path', () => {
    const summary = buildStatusSummary(true, CYCLES_3, ELAPSED_5);

    writeOutputFile('/tmp/output.json', summary);

    expect(mockWriteFileSync).toHaveBeenCalledWith('/tmp/output.json', expect.any(String), 'utf-8');

    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1] as string);
    expect(written.exitCode).toBe(EXIT_SUCCESS);
    expect(written.cycles).toBe(CYCLES_3);
    expect(written.allCompleted).toBe(true);
  });

  it('should not write when outputFile is undefined', () => {
    const summary = buildStatusSummary(true, CYCLES_3, ELAPSED_5);

    writeOutputFile(undefined, summary);

    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('should create parent directories if needed', () => {
    const summary = buildStatusSummary(true, CYCLES_1, ELAPSED_1);

    writeOutputFile('/some/nested/dir/output.json', summary);

    expect(mockMkdirSync).toHaveBeenCalledWith(
      '/some/nested/dir',
      expect.objectContaining({ recursive: true }),
    );
  });

  it('should write valid JSON', () => {
    const summary = buildStatusSummary(false, CYCLES_10, ELAPSED_59_8);

    writeOutputFile('/tmp/out.json', summary);

    const written = mockWriteFileSync.mock.calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.status).toBe('incomplete');
    expect(parsed.exitCode).toBe(EXIT_TIMEOUT);
    expect(parsed.elapsedMinutes).toBe(ELAPSED_59_8);
  });
});
