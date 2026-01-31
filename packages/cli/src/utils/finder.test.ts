/**
 * Tests for finder utility
 */

import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractContext, findEpic, findStory, parseFrontmatter } from './finder.ts';

// ============================================================================
// Test Constants
// ============================================================================

/** Length for testing context truncation */
const TEST_LONG_CONTEXT_LENGTH = 400;

/** Maximum length for context extraction in tests */
const TEST_MAX_CONTEXT_LENGTH = 300;

/** Regex pattern for error message matching in findStory tests */
const WORKTREES_EPICS_ERROR_REGEX = /worktrees|epics/;

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
    const longContext = 'A'.repeat(TEST_LONG_CONTEXT_LENGTH);
    const body = `## Context\n\n${longContext}\n\n## Tasks`;

    const result = extractContext(body, TEST_MAX_CONTEXT_LENGTH);

    expect(result.length).toBe(TEST_MAX_CONTEXT_LENGTH);
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
    body = '',
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
      storySlug,
    );
    mkdirSync(storyDir, { recursive: true });

    const frontmatterStr = Object.entries(frontmatter)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const content = `---\n${frontmatterStr}\n---\n${body}`;
    writeFileSync(join(storyDir, 'story.md'), content);
  }

  it('should find story by exact slug match', async () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    const result = await findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
      expect(result.data.title).toBe('Implement Login Feature');
      expect(result.data.status).toBe('draft');
      expect(result.data.epicSlug).toBe('auth-epic');
    }
  });

  it('should find story by title match', async () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    const result = await findStory(testDir, 'login feature');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });

  it('should find story with case-insensitive match', async () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    const result = await findStory(testDir, 'IMPLEMENT-LOGIN');

    expect(result.found).toBe(true);
  });

  it('should normalize underscore to space in query', async () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    const result = await findStory(testDir, 'implement_login');

    expect(result.found).toBe(true);
  });

  it('should extract context from story body', async () => {
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

- Task 1`,
    );

    const result = await findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.context).toBe(
        'This story implements the login feature for the application.',
      );
    }
  });

  it('should return storyPath and worktreePath', async () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      status: 'draft',
    });

    const result = await findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.storyPath).toContain('story.md');
      expect(result.data.worktreePath).toContain('implement-login');
    }
  });

  it('should return multiple matches when ambiguous', async () => {
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

    const result = await findStory(testDir, 'login');

    expect(result.found).toBe(false);
    if (!result.found && 'matches' in result) {
      expect(result.matches).toHaveLength(2);
    }
  });

  it('should return error when no worktrees or epics directory', async () => {
    const result = await findStory(testDir, 'anything');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toMatch(WORKTREES_EPICS_ERROR_REGEX);
    }
  });

  it('should return error when no match found', async () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login',
      status: 'draft',
    });

    const result = await findStory(testDir, 'nonexistent');

    expect(result.found).toBe(false);
    if (!result.found && 'error' in result) {
      expect(result.error).toContain('No story found');
    }
  });

  it('should use "slug" field if "id" not present', async () => {
    setupStory('auth-epic', 'implement-login', {
      slug: 'implement-login',
      title: 'Implement Login',
      status: 'draft',
    });

    const result = await findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });

  it('should fallback to directory name if no id/slug in frontmatter', async () => {
    setupStory('auth-epic', 'implement-login', {
      title: 'Implement Login',
      status: 'draft',
    });

    const result = await findStory(testDir, 'implement-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });

  it('should find story with typo using fuzzy matching', async () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    // "implment" has a typo (missing 'e')
    const result = await findStory(testDir, 'implment-login');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });

  it('should find story by fuzzy title match', async () => {
    setupStory('auth-epic', 'implement-login', {
      id: 'implement-login',
      title: 'Implement Login Feature',
      status: 'draft',
    });

    // Fuzzy match on title
    const result = await findStory(testDir, 'Login Feture');

    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.data.slug).toBe('implement-login');
    }
  });
});
