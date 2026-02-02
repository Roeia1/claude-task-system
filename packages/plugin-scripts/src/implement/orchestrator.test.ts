/**
 * Tests for orchestrator.ts - worker loop and validation functions
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildLoopResult,
  computeStoryPath,
  createErrorResult,
  getSkillRoot,
  getWorktreePath,
  loadWorkerPrompt,
  validateLoopResources,
  validateStoryFiles,
} from './orchestrator.ts';

describe('orchestrator', () => {
  describe('getSkillRoot', () => {
    it('returns correct path under plugin root', () => {
      const result = getSkillRoot('/path/to/plugin');
      expect(result).toBe('/path/to/plugin/skills/execute-story');
    });

    it('handles plugin root with trailing slash', () => {
      const result = getSkillRoot('/path/to/plugin/');
      // join normalizes paths
      expect(result).toBe('/path/to/plugin/skills/execute-story');
    });
  });

  describe('computeStoryPath', () => {
    it('computes correct path to story.md', () => {
      const result = computeStoryPath('/worktree', 'my-epic', 'my-story');
      expect(result).toBe('/worktree/.saga/epics/my-epic/stories/my-story/story.md');
    });

    it('handles worktree path with no trailing slash', () => {
      const result = computeStoryPath('/project/worktree', 'epic', 'story');
      expect(result).toBe('/project/worktree/.saga/epics/epic/stories/story/story.md');
    });
  });

  describe('getWorktreePath', () => {
    it('computes correct worktree path', () => {
      const result = getWorktreePath('/project', 'my-epic', 'my-story');
      expect(result).toBe('/project/.saga/worktrees/my-epic/my-story');
    });
  });

  describe('validateStoryFiles', () => {
    const tempDir = '/tmp/saga-test-orchestrator';

    beforeEach(() => {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
    });

    it('returns valid:false when worktree does not exist', () => {
      const result = validateStoryFiles('/nonexistent/worktree', 'epic', 'story');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Worktree not found');
    });

    it('error message includes worktree path', () => {
      const result = validateStoryFiles('/my/worktree/path', 'epic', 'story');
      expect(result.error).toContain('/my/worktree/path');
    });

    it('error message includes task-resume suggestion', () => {
      const result = validateStoryFiles('/nonexistent', 'epic', 'my-story');
      expect(result.error).toContain('/task-resume my-story');
    });

    it('returns valid:false when story.md does not exist', () => {
      // Create worktree but not story.md
      mkdirSync(tempDir, { recursive: true });
      const result = validateStoryFiles(tempDir, 'epic', 'story');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('story.md not found');
    });

    it('returns valid:true when worktree and story.md exist', () => {
      // Create worktree and story.md
      const storyDir = join(tempDir, '.saga', 'epics', 'epic', 'stories', 'story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'story.md'), '# Story');

      const result = validateStoryFiles(tempDir, 'epic', 'story');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('loadWorkerPrompt', () => {
    const tempDir = '/tmp/saga-test-prompt';

    beforeEach(() => {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
    });

    it('throws when prompt file does not exist', () => {
      expect(() => loadWorkerPrompt('/nonexistent/plugin')).toThrow(
        'Worker prompt not found',
      );
    });

    it('loads prompt from correct path', () => {
      // Create prompt file
      const promptDir = join(tempDir, 'skills', 'execute-story');
      mkdirSync(promptDir, { recursive: true });
      writeFileSync(join(promptDir, 'worker-prompt.md'), '# Worker Prompt\nInstructions here');

      const result = loadWorkerPrompt(tempDir);
      expect(result).toBe('# Worker Prompt\nInstructions here');
    });
  });

  describe('createErrorResult', () => {
    it('creates error result with all fields', () => {
      const result = createErrorResult('epic', 'story', 'Something failed', 3, 5.5);
      expect(result).toEqual({
        status: 'ERROR',
        summary: 'Something failed',
        cycles: 3,
        elapsedMinutes: 5.5,
        blocker: null,
        epicSlug: 'epic',
        storySlug: 'story',
      });
    });

    it('creates error result with zero cycles', () => {
      const result = createErrorResult('epic', 'story', 'Early failure', 0, 0);
      expect(result.cycles).toBe(0);
      expect(result.elapsedMinutes).toBe(0);
    });
  });

  describe('validateLoopResources', () => {
    const tempDir = '/tmp/saga-test-resources';

    beforeEach(() => {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
    });

    afterEach(() => {
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true });
      }
    });

    it('returns valid:false when worktree missing', () => {
      const result = validateLoopResources('/nonexistent', 'epic', 'story', tempDir);
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('error');
    });

    it('returns valid:false when worker prompt missing', () => {
      // Create worktree and story.md but no prompt
      const worktree = join(tempDir, 'worktree');
      const storyDir = join(worktree, '.saga', 'epics', 'epic', 'stories', 'story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'story.md'), '# Story');

      const result = validateLoopResources(worktree, 'epic', 'story', tempDir);
      expect(result.valid).toBe(false);
      expect((result as { error: string }).error).toContain('Worker prompt not found');
    });

    it('returns valid:true with workerPrompt when all resources exist', () => {
      // Create worktree, story.md, and prompt
      const worktree = join(tempDir, 'worktree');
      const storyDir = join(worktree, '.saga', 'epics', 'epic', 'stories', 'story');
      mkdirSync(storyDir, { recursive: true });
      writeFileSync(join(storyDir, 'story.md'), '# Story');

      const pluginRoot = join(tempDir, 'plugin');
      const promptDir = join(pluginRoot, 'skills', 'execute-story');
      mkdirSync(promptDir, { recursive: true });
      writeFileSync(join(promptDir, 'worker-prompt.md'), '# Worker');

      const result = validateLoopResources(worktree, 'epic', 'story', pluginRoot);
      expect(result.valid).toBe(true);
      expect((result as { workerPrompt: string }).workerPrompt).toBe('# Worker');
    });
  });

  describe('buildLoopResult', () => {
    it('builds result with single summary', () => {
      const result = buildLoopResult('epic', 'story', 'FINISH', ['Done'], 1, 2.5, null);
      expect(result).toEqual({
        status: 'FINISH',
        summary: 'Done',
        cycles: 1,
        elapsedMinutes: 2.5,
        blocker: null,
        epicSlug: 'epic',
        storySlug: 'story',
      });
    });

    it('builds result with multiple summaries joined', () => {
      const result = buildLoopResult(
        'epic',
        'story',
        'MAX_CYCLES',
        ['First task', 'Second task', 'Third task'],
        3,
        10.0,
        null,
      );
      expect(result.summary).toBe('First task | Second task | Third task');
    });

    it('includes blocker when provided', () => {
      const result = buildLoopResult(
        'epic',
        'story',
        'BLOCKED',
        ['Stuck'],
        1,
        1.0,
        'Need API credentials',
      );
      expect(result.blocker).toBe('Need API credentials');
    });

    it('rounds elapsedMinutes to 2 decimal places', () => {
      const result = buildLoopResult('epic', 'story', 'FINISH', ['Done'], 1, 5.5555, null);
      expect(result.elapsedMinutes).toBe(5.56);
    });

    it('handles zero elapsed time', () => {
      const result = buildLoopResult('epic', 'story', 'ERROR', ['Failed'], 0, 0, null);
      expect(result.elapsedMinutes).toBe(0);
    });

    it('handles all possible status values', () => {
      const statuses: Array<'FINISH' | 'BLOCKED' | 'TIMEOUT' | 'MAX_CYCLES' | 'ERROR'> = [
        'FINISH',
        'BLOCKED',
        'TIMEOUT',
        'MAX_CYCLES',
        'ERROR',
      ];
      for (const status of statuses) {
        const result = buildLoopResult('e', 's', status, ['sum'], 1, 1, null);
        expect(result.status).toBe(status);
      }
    });

    it('handles empty summaries array', () => {
      const result = buildLoopResult('epic', 'story', 'ERROR', [], 0, 0, null);
      expect(result.summary).toBe('');
    });
  });
});
