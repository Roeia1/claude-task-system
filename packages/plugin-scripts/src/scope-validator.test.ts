import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkStoryAccessById,
  getFilePathFromInput,
  getScopeEnvironment,
  isArchiveAccess,
  isWithinWorktree,
  normalizePath,
  validatePath,
} from './scope-validator.ts';

describe('scope-validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isWithinWorktree', () => {
    it('should allow paths within the worktree', () => {
      expect(isWithinWorktree('/project/worktree/src/file.ts', '/project/worktree')).toBe(true);
      expect(isWithinWorktree('/project/worktree/package.json', '/project/worktree')).toBe(true);
      expect(
        isWithinWorktree('/project/worktree/.saga/epics/test/story.md', '/project/worktree'),
      ).toBe(true);
    });

    it('should block paths outside the worktree', () => {
      expect(isWithinWorktree('/other/project/file.ts', '/project/worktree')).toBe(false);
      expect(isWithinWorktree('/project/file.ts', '/project/worktree')).toBe(false);
      expect(isWithinWorktree('/etc/passwd', '/project/worktree')).toBe(false);
    });

    it('should block parent directory traversal', () => {
      expect(isWithinWorktree('/project/worktree/../secret.txt', '/project/worktree')).toBe(false);
      expect(isWithinWorktree('/project/worktree/../../etc/passwd', '/project/worktree')).toBe(
        false,
      );
    });

    it('should allow the worktree root itself', () => {
      expect(isWithinWorktree('/project/worktree', '/project/worktree')).toBe(true);
    });

    it('should handle relative paths by resolving them', () => {
      // Relative paths are resolved against cwd, so test with worktree as subdirectory
      const cwd = process.cwd();
      expect(isWithinWorktree(`${cwd}/subdir/file.ts`, cwd)).toBe(true);
      expect(isWithinWorktree('../outside.ts', cwd)).toBe(false);
    });
  });

  describe('file path extraction from hook input', () => {
    it('should extract file_path from Read tool input', () => {
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/path/to/file.ts' },
      });
      expect(getFilePathFromInput(input)).toBe('/path/to/file.ts');
    });

    it('should extract path from Glob tool input', () => {
      const input = JSON.stringify({
        tool_name: 'Glob',
        tool_input: { pattern: '**/*.ts', path: '/path/to/search' },
      });
      expect(getFilePathFromInput(input)).toBe('/path/to/search');
    });

    it('should prefer file_path over path', () => {
      const input = JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/first.ts', path: '/second.ts' },
      });
      expect(getFilePathFromInput(input)).toBe('/first.ts');
    });

    it('should return null for invalid JSON', () => {
      expect(getFilePathFromInput('not json')).toBeNull();
    });

    it('should return null if no path fields present', () => {
      const input = JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'echo hello' },
      });
      expect(getFilePathFromInput(input)).toBeNull();
    });

    it('should return null if tool_input is missing', () => {
      const input = JSON.stringify({ tool_name: 'Read' });
      expect(getFilePathFromInput(input)).toBeNull();
    });
  });

  describe('normalizePath', () => {
    it('should remove leading ./', () => {
      expect(normalizePath('./path/to/file')).toBe('path/to/file');
    });

    it('should leave paths without ./ unchanged', () => {
      expect(normalizePath('path/to/file')).toBe('path/to/file');
      expect(normalizePath('/absolute/path')).toBe('/absolute/path');
    });
  });

  describe('isArchiveAccess', () => {
    it('should detect archive access', () => {
      expect(isArchiveAccess('.saga/archive/epic/story/file.md')).toBe(true);
      expect(isArchiveAccess('/project/.saga/archive/test')).toBe(true);
    });

    it('should allow non-archive paths', () => {
      expect(isArchiveAccess('.saga/epics/my-epic/story.md')).toBe(false);
      expect(isArchiveAccess('src/archive/file.ts')).toBe(false);
    });
  });

  describe('check story access by id', () => {
    it('should allow access to assigned story in .saga/stories/<storyId>/', () => {
      expect(checkStoryAccessById('.saga/stories/auth-setup-db/story.json', 'auth-setup-db')).toBe(
        true,
      );
    });

    it('should allow access to task files in assigned story', () => {
      expect(checkStoryAccessById('.saga/stories/auth-setup-db/t1.json', 'auth-setup-db')).toBe(
        true,
      );
    });

    it('should block access to other stories in .saga/stories/', () => {
      expect(checkStoryAccessById('.saga/stories/other-story/story.json', 'auth-setup-db')).toBe(
        false,
      );
    });

    it('should allow access to non-.saga/stories/ paths', () => {
      expect(checkStoryAccessById('src/components/Button.tsx', 'auth-setup-db')).toBe(true);
      expect(checkStoryAccessById('package.json', 'auth-setup-db')).toBe(true);
    });

    it('should allow access to .saga/ paths that are not under stories/', () => {
      expect(checkStoryAccessById('.saga/worktrees/', 'auth-setup-db')).toBe(true);
    });

    it('should block access to .saga/stories/ with trailing slash (edge case)', () => {
      expect(checkStoryAccessById('.saga/stories/', 'auth-setup-db')).toBe(false);
    });

    it('should block access to .saga/stories with different story id', () => {
      expect(
        checkStoryAccessById('.saga/stories/worker-execution/journal.md', 'auth-setup-db'),
      ).toBe(false);
    });

    it('should not be confused by unrelated stories/ directory before .saga/', () => {
      // A project-level 'stories' dir should not affect matching
      expect(
        checkStoryAccessById(
          '/project/stories/.saga/stories/auth-setup-db/task.json',
          'auth-setup-db',
        ),
      ).toBe(true);
      expect(
        checkStoryAccessById(
          '/project/stories/.saga/stories/other-story/task.json',
          'auth-setup-db',
        ),
      ).toBe(false);
    });

    it('should also validate against old .saga/epics/ paths (block other epics)', () => {
      // When using SAGA_STORY_ID, old epic-nested paths for other stories should be blocked
      expect(
        checkStoryAccessById('.saga/epics/some-epic/stories/some-story/story.md', 'auth-setup-db'),
      ).toBe(false);
    });

    it('should allow access to own story in old .saga/epics/ layout if storyId matches', () => {
      // The storyId might match a story slug in the old layout
      // But we cannot reliably match since the old layout uses epic+story,
      // so we block all .saga/epics/ story-level access when using SAGA_STORY_ID
      expect(
        checkStoryAccessById('.saga/epics/my-epic/stories/auth-setup-db/story.md', 'auth-setup-db'),
      ).toBe(false);
    });
  });

  describe('getScopeEnvironment', () => {
    it('should return scope when SAGA_STORY_ID is set', () => {
      process.env.SAGA_PROJECT_DIR = '/project/worktree';
      process.env.SAGA_STORY_ID = 'auth-setup-db';
      const env = getScopeEnvironment();
      expect(env).not.toBeNull();
      expect(env?.storyId).toBe('auth-setup-db');
    });

    it('should return null when SAGA_STORY_ID is not set', () => {
      process.env.SAGA_PROJECT_DIR = '/project/worktree';
      process.env.SAGA_STORY_ID = undefined;
      const env = getScopeEnvironment();
      expect(env).toBeNull();
    });

    it('should return null when SAGA_PROJECT_DIR is missing', () => {
      process.env.SAGA_PROJECT_DIR = undefined;
      process.env.SAGA_STORY_ID = 'auth-setup-db';
      const env = getScopeEnvironment();
      expect(env).toBeNull();
    });
  });

  describe('validatePath', () => {
    it('should allow valid paths within worktree', () => {
      expect(
        validatePath('/project/worktree/src/file.ts', '/project/worktree', {
          storyId: 'auth-setup-db',
        }),
      ).toBeNull();
    });

    it('should block paths outside worktree', () => {
      const result = validatePath('/other/project/file.ts', '/project/worktree', {
        storyId: 'auth-setup-db',
      });
      expect(result).toContain('Access outside worktree blocked');
    });

    it('should block archive access', () => {
      const result = validatePath(
        '/project/worktree/.saga/archive/old-story/file.md',
        '/project/worktree',
        { storyId: 'auth-setup-db' },
      );
      expect(result).toContain('Access to archive folder blocked');
    });

    it('should allow own story access in .saga/stories/', () => {
      expect(
        validatePath(
          '/project/worktree/.saga/stories/auth-setup-db/story.json',
          '/project/worktree',
          { storyId: 'auth-setup-db' },
        ),
      ).toBeNull();
    });

    it('should block other story access in .saga/stories/', () => {
      const result = validatePath(
        '/project/worktree/.saga/stories/other-story/story.json',
        '/project/worktree',
        { storyId: 'auth-setup-db' },
      );
      expect(result).toContain('Access to other story blocked');
    });

    it('should block .saga/epics/ story access', () => {
      const result = validatePath(
        '/project/worktree/.saga/epics/some-epic/stories/some-story/file.md',
        '/project/worktree',
        { storyId: 'auth-setup-db' },
      );
      expect(result).toContain('Access to other story blocked');
    });
  });
});
