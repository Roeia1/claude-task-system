/**
 * Tests for worker/create-draft-pr.ts - Draft PR creation (idempotent)
 *
 * Tests the createDraftPr function which:
 *   - Creates a draft PR for the story branch
 *   - Is idempotent: skips if PR already exists for the branch
 *   - Uses `gh pr create --draft` and `gh pr list --head` commands
 *
 * These tests use mocked execFileSync for gh commands.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDraftPr } from './create-draft-pr.ts';

// Mock child_process
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from 'node:child_process';

const mockExecFileSync = vi.mocked(execFileSync);

describe('createDraftPr', () => {
  const storyId = 'auth-setup-db';
  const worktreePath = '/project/.saga/worktrees/auth-setup-db';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should create a draft PR when none exists', () => {
    // gh pr list returns empty array (no existing PR)
    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[];
      if (cmd === 'git') {
        return '';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'list') {
        return '[]';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'create') {
        return 'https://github.com/user/repo/pull/42';
      }
      throw new Error(`Unexpected command: ${cmd} ${argsArr.join(' ')}`);
    });

    const result = createDraftPr(storyId, worktreePath);

    expect(result.alreadyExisted).toBe(false);
    expect(result.prUrl).toBe('https://github.com/user/repo/pull/42');

    // Verify gh pr list was called to check for existing PR
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['pr', 'list', '--head', `story/${storyId}`]),
      expect.objectContaining({ cwd: worktreePath }),
    );

    // Verify gh pr create was called with --draft
    expect(mockExecFileSync).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['pr', 'create', '--draft']),
      expect.objectContaining({ cwd: worktreePath }),
    );
  });

  it('should skip PR creation when PR already exists', () => {
    // gh pr list returns an existing PR
    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[];
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'list') {
        return JSON.stringify([{ number: 42, url: 'https://github.com/user/repo/pull/42' }]);
      }
      throw new Error(`Unexpected call: ${cmd} ${argsArr.join(' ')}`);
    });

    const result = createDraftPr(storyId, worktreePath);

    expect(result.alreadyExisted).toBe(true);
    expect(result.prUrl).toBe('https://github.com/user/repo/pull/42');

    // Verify gh pr create was NOT called
    const calls = mockExecFileSync.mock.calls;
    const createCalls = calls.filter(
      (call) => call[0] === 'gh' && (call[1] as string[])[1] === 'create',
    );
    expect(createCalls).toHaveLength(0);
  });

  it('should use PR title format "Story: <storyId>"', () => {
    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[];
      if (cmd === 'git') {
        return '';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'list') {
        return '[]';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'create') {
        return 'https://github.com/user/repo/pull/1';
      }
      throw new Error(`Unexpected command: ${cmd} ${argsArr.join(' ')}`);
    });

    createDraftPr(storyId, worktreePath);

    // Find the create call and verify title
    const createCall = mockExecFileSync.mock.calls.find(
      (call) => call[0] === 'gh' && (call[1] as string[])[1] === 'create',
    );
    expect(createCall).toBeDefined();
    const createArgs = createCall?.[1] as string[];
    const titleIdx = createArgs.indexOf('--title');
    expect(titleIdx).toBeGreaterThan(-1);
    expect(createArgs[titleIdx + 1]).toBe('Story: auth-setup-db');
  });

  it('should push the branch before creating the PR', () => {
    const callOrder: string[] = [];

    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[];
      if (cmd === 'git' && argsArr[0] === 'push') {
        callOrder.push('git-push');
        return '';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'list') {
        callOrder.push('gh-pr-list');
        return '[]';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'create') {
        callOrder.push('gh-pr-create');
        return 'https://github.com/user/repo/pull/1';
      }
      throw new Error(`Unexpected command: ${cmd} ${argsArr.join(' ')}`);
    });

    createDraftPr(storyId, worktreePath);

    // Push should happen before PR creation
    expect(callOrder.indexOf('git-push')).toBeLessThan(callOrder.indexOf('gh-pr-create'));
  });

  it('should run commands with worktree as cwd', () => {
    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[];
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'list') {
        return '[]';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'create') {
        return 'https://github.com/user/repo/pull/1';
      }
      if (cmd === 'git') {
        return '';
      }
      throw new Error(`Unexpected command: ${cmd} ${argsArr.join(' ')}`);
    });

    createDraftPr(storyId, worktreePath);

    // All gh calls should use worktreePath as cwd
    for (const call of mockExecFileSync.mock.calls) {
      if (call[0] === 'gh') {
        expect((call[2] as { cwd: string }).cwd).toBe(worktreePath);
      }
    }
  });

  it('should handle gh pr list returning malformed JSON gracefully', () => {
    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[];
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'list') {
        return 'not-json';
      }
      if (cmd === 'git') {
        return '';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'create') {
        return 'https://github.com/user/repo/pull/1';
      }
      throw new Error(`Unexpected command: ${cmd} ${argsArr.join(' ')}`);
    });

    // Should treat malformed as "no existing PR" and create one
    const result = createDraftPr(storyId, worktreePath);
    expect(result.alreadyExisted).toBe(false);
  });

  it('should throw when gh pr create fails', () => {
    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[];
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'list') {
        return '[]';
      }
      if (cmd === 'git') {
        return '';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'create') {
        throw new Error('gh: not authenticated');
      }
      throw new Error(`Unexpected command: ${cmd} ${argsArr.join(' ')}`);
    });

    expect(() => createDraftPr(storyId, worktreePath)).toThrow('Failed to create draft PR');
  });

  it('should include --body with story ID in PR creation', () => {
    mockExecFileSync.mockImplementation((cmd, args) => {
      const argsArr = args as string[];
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'list') {
        return '[]';
      }
      if (cmd === 'gh' && argsArr[0] === 'pr' && argsArr[1] === 'create') {
        return 'https://github.com/user/repo/pull/1';
      }
      if (cmd === 'git') {
        return '';
      }
      throw new Error(`Unexpected command: ${cmd} ${argsArr.join(' ')}`);
    });

    createDraftPr(storyId, worktreePath);

    const createCall = mockExecFileSync.mock.calls.find(
      (call) => call[0] === 'gh' && (call[1] as string[])[1] === 'create',
    );
    expect(createCall).toBeDefined();
    const createArgs = createCall?.[1] as string[];
    const bodyIdx = createArgs.indexOf('--body');
    expect(bodyIdx).toBeGreaterThan(-1);
    expect(createArgs[bodyIdx + 1]).toContain(storyId);
  });
});
