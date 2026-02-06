import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import { getPluginRoot, getProjectDir, getStoryId, getStoryTaskListId } from './env.ts';

describe('env', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getProjectDir', () => {
    it('returns SAGA_PROJECT_DIR when set', () => {
      process.env.SAGA_PROJECT_DIR = '/home/user/project';
      expect(getProjectDir()).toBe('/home/user/project');
    });

    it('throws when SAGA_PROJECT_DIR is not set', () => {
      process.env.SAGA_PROJECT_DIR = undefined;
      expect(() => getProjectDir()).toThrow('SAGA_PROJECT_DIR');
    });
  });

  describe('getPluginRoot', () => {
    it('returns SAGA_PLUGIN_ROOT when set', () => {
      process.env.SAGA_PLUGIN_ROOT = '/home/user/.claude/plugins/saga';
      expect(getPluginRoot()).toBe('/home/user/.claude/plugins/saga');
    });

    it('throws when SAGA_PLUGIN_ROOT is not set', () => {
      process.env.SAGA_PLUGIN_ROOT = undefined;
      expect(() => getPluginRoot()).toThrow('SAGA_PLUGIN_ROOT');
    });
  });

  describe('getStoryId', () => {
    it('returns SAGA_STORY_ID when set', () => {
      process.env.SAGA_STORY_ID = 'auth-setup-db';
      expect(getStoryId()).toBe('auth-setup-db');
    });

    it('throws when SAGA_STORY_ID is not set', () => {
      process.env.SAGA_STORY_ID = undefined;
      expect(() => getStoryId()).toThrow('SAGA_STORY_ID');
    });

    it('throws with descriptive message mentioning worker context', () => {
      process.env.SAGA_STORY_ID = undefined;
      expect(() => getStoryId()).toThrow('worker context');
    });
  });

  describe('story task list id getter', () => {
    it('returns SAGA_STORY_TASK_LIST_ID when set', () => {
      process.env.SAGA_STORY_TASK_LIST_ID = 'saga__my-story__123';
      expect(getStoryTaskListId()).toBe('saga__my-story__123');
    });

    it('throws when SAGA_STORY_TASK_LIST_ID is not set', () => {
      process.env.SAGA_STORY_TASK_LIST_ID = undefined;
      expect(() => getStoryTaskListId()).toThrow('SAGA_STORY_TASK_LIST_ID');
    });

    it('throws with descriptive message mentioning worker context', () => {
      process.env.SAGA_STORY_TASK_LIST_ID = undefined;
      expect(() => getStoryTaskListId()).toThrow('worker context');
    });
  });
});
