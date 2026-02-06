import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getEpicSlug,
  getPluginRoot,
  getProjectDir,
  getStoryId,
  getStorySlug,
  getStoryTaskListId,
} from './env.ts';

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

  describe('getEpicSlug (deprecated)', () => {
    it('returns SAGA_EPIC_SLUG when set', () => {
      process.env.SAGA_EPIC_SLUG = 'my-epic';
      expect(getEpicSlug()).toBe('my-epic');
    });

    it('throws when SAGA_EPIC_SLUG is not set', () => {
      process.env.SAGA_EPIC_SLUG = undefined;
      expect(() => getEpicSlug()).toThrow('SAGA_EPIC_SLUG');
    });
  });

  describe('getStorySlug (deprecated)', () => {
    it('returns SAGA_STORY_SLUG when set', () => {
      process.env.SAGA_STORY_SLUG = 'my-story';
      expect(getStorySlug()).toBe('my-story');
    });

    it('throws when SAGA_STORY_SLUG is not set', () => {
      process.env.SAGA_STORY_SLUG = undefined;
      expect(() => getStorySlug()).toThrow('SAGA_STORY_SLUG');
    });
  });
});
