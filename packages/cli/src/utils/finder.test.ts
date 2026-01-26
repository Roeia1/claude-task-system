/**
 * Tests for finder utility
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseFrontmatter,
  extractContext,
  findEpic,
  findStory,
  type EpicInfo,
  type StoryInfo,
  type FindResult,
} from './finder.js';

describe('parseFrontmatter', () => {
  it('should parse simple frontmatter', () => {
    const content = `---
id: test-story
title: Test Story
status: draft
epic: test-epic
---
Body content here`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.id).toBe('test-story');
    expect(result.frontmatter.title).toBe('Test Story');
    expect(result.frontmatter.status).toBe('draft');
    expect(result.frontmatter.epic).toBe('test-epic');
    expect(result.body).toBe('Body content here');
  });

  it('should handle content without frontmatter', () => {
    const content = 'Just some content without frontmatter';

    const result = parseFrontmatter(content);

    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe(content);
  });

  it('should handle empty content', () => {
    const result = parseFrontmatter('');

    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe('');
  });

  it('should handle values with colons', () => {
    const content = `---
title: Story: The Beginning
---
Body`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.title).toBe('Story: The Beginning');
  });

  it('should handle quoted values', () => {
    const content = `---
title: "Quoted Title"
description: 'Single Quoted'
---
Body`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.title).toBe('Quoted Title');
    expect(result.frontmatter.description).toBe('Single Quoted');
  });
});

describe('extractContext', () => {
  it('should extract context section', () => {
    const body = `# Story

## Context

This is the context section with important information.

## Tasks

- Task 1
- Task 2`;

    const result = extractContext(body);

    expect(result).toBe('This is the context section with important information.');
  });

  it('should truncate long context', () => {
    const longContext = 'A'.repeat(400);
    const body = `## Context\n\n${longContext}\n\n## Tasks`;

    const result = extractContext(body, 300);

    expect(result.length).toBe(300);
    expect(result.endsWith('...')).toBe(true);
  });

  it('should return empty string if no context section', () => {
    const body = `# Story

## Tasks

- Task 1`;

    const result = extractContext(body);

    expect(result).toBe('');
  });

  it('should handle context at end of file', () => {
    const body = `# Story

## Context

This context goes to the end of file.`;

    const result = extractContext(body);

    expect(result).toBe('This context goes to the end of file.');
  });

  it('should be case-insensitive for section header', () => {
    const body = `## CONTEXT

This is context.

## Tasks`;

    const result = extractContext(body);

    expect(result).toBe('This is context.');
  });
});

describe('findEpic', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-finder-epic-test-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function setupEpics(slugs: string[]): void {
    const epicsDir = join(testDir, '.saga', 'epics');
    mkdirSync(epicsDir, { recursive: true });
    for (const slug of slugs) {
      mkdirSync(join(epicsDir, slug));
    }
  }

  it('should find epic by exact slug match', () => {
    setupEpics(['user-authentication', 'payment-processing']);

    const result = findEpic(testDir, 'user-authentication');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('user-authentication');
    }
  });

  it('should find epic with case-insensitive match', () => {
    setupEpics(['user-authentication']);

    const result = findEpic(testDir, 'User-Authentication');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('user-authentication');
    }
  });

  it('should normalize underscore to hyphen in query', () => {
    setupEpics(['user-authentication']);

    const result = findEpic(testDir, 'user_authentication');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('user-authentication');
    }
  });

  it('should return single partial match', () => {
    setupEpics(['user-authentication', 'payment-processing']);

    const result = findEpic(testDir, 'auth');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('user-authentication');
    }
  });

  it('should return multiple matches when ambiguous', () => {
    setupEpics(['user-auth', 'admin-auth', 'payment-processing']);

    const result = findEpic(testDir, 'auth');

    expect(result.found).toBe(false);
    if (!result.found && 'matches' in result) {
      expect(result.matches).toHaveLength(2);
      expect(result.matches.map((m) => m.slug)).toContain('user-auth');
      expect(result.matches.map((m) => m.slug)).toContain('admin-auth');
    }
  });

  it('should return error when no epics directory', () => {
    // Don't create any .saga directory
    const result = findEpic(testDir, 'anything');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toContain('.saga/epics/');
    }
  });

  it('should return error when no match found', () => {
    setupEpics(['user-authentication']);

    const result = findEpic(testDir, 'nonexistent');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toContain('No epic found');
    }
  });

  it('should find epic with typo using fuzzy matching', () => {
    setupEpics(['user-authentication']);

    // "authentcation" has a typo (missing 'i')
    const result = findEpic(testDir, 'user-authentcation');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('user-authentication');
    }
  });
});

describe('findStory', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = realpathSync(mkdtempSync(join(tmpdir(), 'saga-finder-story-test-')));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  function setupStory(
    epicSlug: string,
    storySlug: string,
    frontmatter: Record<string, string>,
    body: string = ''
  ): void {
    const worktreesDir = join(testDir, '.saga', 'worktrees');
    const storyDir = join(
      worktreesDir,
      epicSlug,
      storySlug,
      '.saga',
      'epics',
      epicSlug,
      'stories',
      storySlug
    );
    mkdirSync(storyDir, { recursive: true });

    const frontmatterStr = Object.entries(frontmatter)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const content = `---\n${frontmatterStr}\n---\n${body}`;
    writeFileSync(join(storyDir, 'story.md'), content);
  }

  it('should find story by exact slug match', () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    const result = findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
      expect(result.data.title).toBe('Implement Login Feature');
      expect(result.data.status).toBe('draft');
      expect(result.data.epicSlug).toBe('auth-epic');
    }
  });

  it('should find story by title match', () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    const result = findStory(testDir, 'login feature');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });

  it('should find story with case-insensitive match', () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    const result = findStory(testDir, 'IMPLEMENT-LOGIN');

    expect(result.found).toBe(true);
  });

  it('should normalize underscore to space in query', () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    const result = findStory(testDir, 'implement_login');

    expect(result.found).toBe(true);
  });

  it('should extract context from story body', () => {
    setupStory(
      'auth-epic',
      'implement-login',
      {
        id: 'implement-login',
        title: 'Implement Login Feature',
        status: 'draft',
      },
      `## Context

This story implements the login feature for the application.

## Tasks

- Task 1`
    );

    const result = findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.context).toBe(
        'This story implements the login feature for the application.'
      );
    }
  });

  it('should return storyPath and worktreePath', () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      status: 'draft',
    });

    const result = findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.storyPath).toContain('story.md');
      expect(result.data.worktreePath).toContain('implement-login');
    }
  });

  it('should return multiple matches when ambiguous', () => {
    setupStory('auth-epic', 'login-ui', {
      id: 'login-ui',
      title: 'Login UI',
      status: 'draft',
    });
    setupStory('auth-epic', 'login-api', {
      id: 'login-api',
      title: 'Login API',
      status: 'draft',
    });

    const result = findStory(testDir, 'login');

    expect(result.found).toBe(false);
    if (!result.found && 'matches' in result) {
      expect(result.matches).toHaveLength(2);
    }
  });

  it('should return error when no worktrees directory', () => {
    const result = findStory(testDir, 'anything');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toContain('worktrees');
    }
  });

  it('should return error when no match found', () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      status: 'draft',
    });

    const result = findStory(testDir, 'nonexistent');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toContain('No story found');
    }
  });

  it('should use "slug" field if "id" not present', () => {
    setupStory('auth-epic', 'implement-login', {
      slug: 'implement-login',
      title: 'Implement Login',
      status: 'draft',
    });

    const result = findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });

  it('should fallback to directory name if no id/slug in frontmatter', () => {
    setupStory('auth-epic', 'implement-login', {
      title: 'Implement Login',
      status: 'draft',
    });

    const result = findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });

  it('should find story with typo using fuzzy matching', () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    // "implment" has a typo (missing 'e')
    const result = findStory(testDir, 'implment-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });

  it('should find story by fuzzy title match', () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    // Fuzzy match on title
    const result = findStory(testDir, 'Login Feture');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });
});
