import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findProjectRoot, resolveProjectPath } from './project-discovery.js';
import { mkdirSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Normalize paths to handle macOS symlinks (e.g., /var -> /private/var)
 */
function normalizePath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

describe('project-discovery', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    testDir = join(tmpdir(), `saga-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('findProjectRoot', () => {
    it('returns the directory containing .saga/ when found in startDir', () => {
      // Create .saga/ directory in testDir
      mkdirSync(join(testDir, '.saga'), { recursive: true });

      const result = findProjectRoot(testDir);
      expect(result).toBe(testDir);
    });

    it('returns the parent directory when .saga/ is found in parent', () => {
      // Create structure: testDir/.saga/ and testDir/subdir/
      mkdirSync(join(testDir, '.saga'), { recursive: true });
      const subdir = join(testDir, 'subdir');
      mkdirSync(subdir, { recursive: true });

      const result = findProjectRoot(subdir);
      expect(result).toBe(testDir);
    });

    it('returns null when no .saga/ directory exists in parent chain', () => {
      // testDir has no .saga/
      const result = findProjectRoot(testDir);
      expect(result).toBeNull();
    });

    it('walks up multiple levels to find .saga/', () => {
      // Create structure: testDir/.saga/ and testDir/a/b/c/
      mkdirSync(join(testDir, '.saga'), { recursive: true });
      const deepDir = join(testDir, 'a', 'b', 'c');
      mkdirSync(deepDir, { recursive: true });

      const result = findProjectRoot(deepDir);
      expect(result).toBe(testDir);
    });

    it('uses process.cwd() when no startDir is provided', () => {
      // This test verifies the default behavior
      const result = findProjectRoot();
      // We can't predict the result, but it should not throw
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('resolveProjectPath', () => {
    it('returns explicit path when provided and valid', () => {
      // Create .saga/ in testDir
      mkdirSync(join(testDir, '.saga'), { recursive: true });

      const result = resolveProjectPath(testDir);
      expect(result).toBe(testDir);
    });

    it('throws error when explicit path has no .saga/', () => {
      // testDir has no .saga/
      expect(() => resolveProjectPath(testDir)).toThrow();
    });

    it('throws error with helpful message when project not found', () => {
      expect(() => resolveProjectPath(testDir)).toThrow(/\.saga/);
    });

    it('discovers project root when no explicit path provided', () => {
      // Create .saga/ in testDir
      mkdirSync(join(testDir, '.saga'), { recursive: true });
      const subdir = join(testDir, 'subdir');
      mkdirSync(subdir, { recursive: true });

      // Save current cwd
      const originalCwd = process.cwd();
      try {
        process.chdir(subdir);
        const result = resolveProjectPath();
        // Use normalizePath to handle macOS symlinks (/var -> /private/var)
        expect(normalizePath(result)).toBe(normalizePath(testDir));
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('throws descriptive error when no project found in discovery', () => {
      // Use testDir which has no .saga/
      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        expect(() => resolveProjectPath()).toThrow(/SAGA project/);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
