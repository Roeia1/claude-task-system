/**
 * Tests for scope-config.ts - hook configuration builder
 */

import { describe, expect, it } from 'vitest';
import { buildScopeSettings } from './scope-config.ts';

describe('scope-config', () => {
  describe('buildScopeSettings', () => {
    it('returns an object with hooks configuration', () => {
      const settings = buildScopeSettings();
      expect(settings).toHaveProperty('hooks');
    });

    it('configures PreToolUse hook', () => {
      const settings = buildScopeSettings();
      const hooks = settings.hooks as Record<string, unknown>;
      expect(hooks).toHaveProperty('PreToolUse');
    });

    it('PreToolUse hook is an array with one matcher config', () => {
      const settings = buildScopeSettings();
      const hooks = settings.hooks as Record<string, unknown[]>;
      const preToolUse = hooks.PreToolUse;
      expect(Array.isArray(preToolUse)).toBe(true);
      expect(preToolUse.length).toBe(1);
    });

    it('matcher includes file system operation tools', () => {
      const settings = buildScopeSettings();
      const hooks = settings.hooks as Record<string, unknown[]>;
      const preToolUse = hooks.PreToolUse;
      const config = preToolUse[0] as { matcher: string; hooks: string[] };

      // Should include all file system tools
      expect(config.matcher).toContain('Read');
      expect(config.matcher).toContain('Write');
      expect(config.matcher).toContain('Edit');
      expect(config.matcher).toContain('Glob');
      expect(config.matcher).toContain('Grep');
    });

    it('matcher uses pipe-separated format', () => {
      const settings = buildScopeSettings();
      const hooks = settings.hooks as Record<string, unknown[]>;
      const preToolUse = hooks.PreToolUse;
      const config = preToolUse[0] as { matcher: string };

      // Should be pipe-separated (regex OR pattern)
      expect(config.matcher).toBe('Read|Write|Edit|Glob|Grep');
    });

    it('hooks array contains the scope-validator command', () => {
      const settings = buildScopeSettings();
      const hooks = settings.hooks as Record<string, unknown[]>;
      const preToolUse = hooks.PreToolUse;
      const config = preToolUse[0] as { hooks: string[] };

      expect(Array.isArray(config.hooks)).toBe(true);
      expect(config.hooks.length).toBe(1);
      expect(config.hooks[0]).toBe('npx @saga-ai/cli scope-validator');
    });

    it('returns consistent results on multiple calls', () => {
      const settings1 = buildScopeSettings();
      const settings2 = buildScopeSettings();
      expect(settings1).toEqual(settings2);
    });
  });
});
