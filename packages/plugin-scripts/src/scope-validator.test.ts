import { relative, resolve } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Test the internal functions by mirroring the logic
// The actual command reads from stdin, so we test the logic directly

describe('scope-validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isWithinWorktree', () => {
    // Mirror the function logic for testing
    const isWithinWorktree = (filePath: string, worktreePath: string): boolean => {
      const absoluteFilePath = resolve(filePath);
      const absoluteWorktree = resolve(worktreePath);
      const relativePath = relative(absoluteWorktree, absoluteFilePath);

      if (relativePath.startsWith('..') || resolve(relativePath) === relativePath) {
        return false;
      }

      return true;
    };

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
    // Mirror the function logic for testing (uses hook input structure)
    const getFilePathFromInput = (hookInput: string): string | null => {
      try {
        const data = JSON.parse(hookInput);
        const toolInput = data.tool_input || {};
        return toolInput.file_path || toolInput.path || null;
      } catch {
        return null;
      }
    };

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
    const normalizePath = (path: string): string => {
      if (path.startsWith('./')) {
        return path.slice(2);
      }
      return path;
    };

    it('should remove leading ./', () => {
      expect(normalizePath('./path/to/file')).toBe('path/to/file');
    });

    it('should leave paths without ./ unchanged', () => {
      expect(normalizePath('path/to/file')).toBe('path/to/file');
      expect(normalizePath('/absolute/path')).toBe('/absolute/path');
    });
  });

  describe('isArchiveAccess', () => {
    const isArchiveAccess = (path: string): boolean => {
      return path.includes('.saga/archive');
    };

    it('should detect archive access', () => {
      expect(isArchiveAccess('.saga/archive/epic/story/file.md')).toBe(true);
      expect(isArchiveAccess('/project/.saga/archive/test')).toBe(true);
    });

    it('should allow non-archive paths', () => {
      expect(isArchiveAccess('.saga/epics/my-epic/story.md')).toBe(false);
      expect(isArchiveAccess('src/archive/file.ts')).toBe(false);
    });
  });

  describe('checkStoryAccess', () => {
    const checkStoryAccess = (path: string, allowedEpic: string, allowedStory: string): boolean => {
      if (!path.includes('.saga/epics/')) {
        return true;
      }

      const parts = path.split('/');
      const epicsIdx = parts.indexOf('epics');

      if (epicsIdx === -1) {
        return true;
      }

      if (parts.length <= epicsIdx + 1) {
        return true;
      }

      const pathEpic = parts[epicsIdx + 1];

      // Path indices for story folder structure
      const storiesFolderIndex = 2;
      const storySlugIndex = 3;

      if (
        parts.length > epicsIdx + storySlugIndex &&
        parts[epicsIdx + storiesFolderIndex] === 'stories'
      ) {
        const pathStory = parts[epicsIdx + storySlugIndex];
        return pathEpic === allowedEpic && pathStory === allowedStory;
      }
      return pathEpic === allowedEpic;
    };

    it('should allow access to assigned story', () => {
      expect(
        checkStoryAccess('.saga/epics/my-epic/stories/my-story/story.md', 'my-epic', 'my-story'),
      ).toBe(true);
    });

    it('should block access to other stories in same epic', () => {
      expect(
        checkStoryAccess('.saga/epics/my-epic/stories/other-story/story.md', 'my-epic', 'my-story'),
      ).toBe(false);
    });

    it('should block access to other epics', () => {
      expect(
        checkStoryAccess(
          '.saga/epics/other-epic/stories/some-story/story.md',
          'my-epic',
          'my-story',
        ),
      ).toBe(false);
    });

    it('should allow access to epic-level files in same epic', () => {
      expect(checkStoryAccess('.saga/epics/my-epic/epic.md', 'my-epic', 'my-story')).toBe(true);
    });

    it('should block access to other epics epic-level files', () => {
      expect(checkStoryAccess('.saga/epics/other-epic/epic.md', 'my-epic', 'my-story')).toBe(false);
    });

    it('should allow access to non-saga paths', () => {
      expect(checkStoryAccess('src/components/Button.tsx', 'my-epic', 'my-story')).toBe(true);
      expect(checkStoryAccess('package.json', 'my-epic', 'my-story')).toBe(true);
    });

    it('should block access to epics folder with trailing slash (edge case)', () => {
      // Trailing slash creates empty path component after 'epics', which doesn't match allowed epic
      expect(checkStoryAccess('.saga/epics/', 'my-epic', 'my-story')).toBe(false);
    });

    it('should allow access to paths not in .saga/epics/', () => {
      expect(checkStoryAccess('.saga/worktrees/', 'my-epic', 'my-story')).toBe(true);
    });
  });

  describe('validatePath', () => {
    const normalizePath = (path: string): string => {
      if (path.startsWith('./')) {
        return path.slice(2);
      }
      return path;
    };

    const isWithinWorktree = (filePath: string, worktreePath: string): boolean => {
      const absoluteFilePath = resolve(filePath);
      const absoluteWorktree = resolve(worktreePath);
      const relativePath = relative(absoluteWorktree, absoluteFilePath);
      if (relativePath.startsWith('..') || resolve(relativePath) === relativePath) {
        return false;
      }
      return true;
    };

    const isArchiveAccess = (path: string): boolean => {
      return path.includes('.saga/archive');
    };

    const checkStoryAccess = (path: string, allowedEpic: string, allowedStory: string): boolean => {
      if (!path.includes('.saga/epics/')) {
        return true;
      }
      const parts = path.split('/');
      const epicsIdx = parts.indexOf('epics');
      if (epicsIdx === -1) {
        return true;
      }
      if (parts.length <= epicsIdx + 1) {
        return true;
      }
      const pathEpic = parts[epicsIdx + 1];
      const storiesFolderIndex = 2;
      const storySlugIndex = 3;
      if (
        parts.length > epicsIdx + storySlugIndex &&
        parts[epicsIdx + storiesFolderIndex] === 'stories'
      ) {
        const pathStory = parts[epicsIdx + storySlugIndex];
        return pathEpic === allowedEpic && pathStory === allowedStory;
      }
      return pathEpic === allowedEpic;
    };

    const validatePath = (
      filePath: string,
      worktreePath: string,
      epicSlug: string,
      storySlug: string,
    ): string | null => {
      const normPath = normalizePath(filePath);

      if (!isWithinWorktree(normPath, worktreePath)) {
        return 'Access outside worktree blocked';
      }

      if (isArchiveAccess(normPath)) {
        return 'Access to archive folder blocked';
      }

      if (!checkStoryAccess(normPath, epicSlug, storySlug)) {
        return 'Access to other story blocked';
      }

      return null;
    };

    it('should allow valid paths within story scope', () => {
      expect(
        validatePath(
          '/project/worktree/src/file.ts',
          '/project/worktree',
          'my-epic',
          'my-story',
        ),
      ).toBeNull();
    });

    it('should block paths outside worktree', () => {
      expect(
        validatePath('/other/project/file.ts', '/project/worktree', 'my-epic', 'my-story'),
      ).toBe('Access outside worktree blocked');
    });

    it('should block archive access', () => {
      expect(
        validatePath(
          '/project/worktree/.saga/archive/old-story/file.md',
          '/project/worktree',
          'my-epic',
          'my-story',
        ),
      ).toBe('Access to archive folder blocked');
    });

    it('should block other story access', () => {
      expect(
        validatePath(
          '/project/worktree/.saga/epics/my-epic/stories/other-story/story.md',
          '/project/worktree',
          'my-epic',
          'my-story',
        ),
      ).toBe('Access to other story blocked');
    });
  });
});
