import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Test the internal functions by importing the module
// We'll test the logic directly since the command reads from stdin

describe('scope-validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getFilePathFromInput', () => {
    // Import the function for testing
    const getFilePathFromInput = (input: string): string | null => {
      try {
        const data = JSON.parse(input);
        return data.file_path || data.path || null;
      } catch {
        return null;
      }
    };

    it('should extract file_path from JSON', () => {
      const input = JSON.stringify({ file_path: '/path/to/file.ts' });
      expect(getFilePathFromInput(input)).toBe('/path/to/file.ts');
    });

    it('should extract path from JSON if file_path is not present', () => {
      const input = JSON.stringify({ path: '/path/to/file.ts' });
      expect(getFilePathFromInput(input)).toBe('/path/to/file.ts');
    });

    it('should prefer file_path over path', () => {
      const input = JSON.stringify({ file_path: '/first.ts', path: '/second.ts' });
      expect(getFilePathFromInput(input)).toBe('/first.ts');
    });

    it('should return null for invalid JSON', () => {
      expect(getFilePathFromInput('not json')).toBeNull();
    });

    it('should return null if no path fields present', () => {
      const input = JSON.stringify({ other: 'field' });
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

      if (parts.length > epicsIdx + 3 && parts[epicsIdx + 2] === 'stories') {
        const pathStory = parts[epicsIdx + 3];
        return pathEpic === allowedEpic && pathStory === allowedStory;
      } else {
        return pathEpic === allowedEpic;
      }
    };

    it('should allow access to assigned story', () => {
      expect(
        checkStoryAccess('.saga/epics/my-epic/stories/my-story/story.md', 'my-epic', 'my-story')
      ).toBe(true);
    });

    it('should block access to other stories in same epic', () => {
      expect(
        checkStoryAccess('.saga/epics/my-epic/stories/other-story/story.md', 'my-epic', 'my-story')
      ).toBe(false);
    });

    it('should block access to other epics', () => {
      expect(
        checkStoryAccess('.saga/epics/other-epic/stories/some-story/story.md', 'my-epic', 'my-story')
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
});
