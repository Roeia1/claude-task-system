import { describe, expect, it } from 'vitest';
import {
  StoryStatusSchema,
  StoryFrontmatterSchema,
  StorySchema,
  type StoryStatus,
  type StoryFrontmatter,
  type Story,
} from './story';

describe('StoryStatusSchema', () => {
  it('accepts valid status values', () => {
    const validStatuses: StoryStatus[] = ['draft', 'ready', 'in-progress', 'blocked', 'completed'];
    for (const status of validStatuses) {
      expect(StoryStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects invalid status values', () => {
    expect(() => StoryStatusSchema.parse('invalid')).toThrow();
    expect(() => StoryStatusSchema.parse('')).toThrow();
    expect(() => StoryStatusSchema.parse(null)).toThrow();
  });
});

describe('StoryFrontmatterSchema', () => {
  it('parses minimal valid frontmatter', () => {
    const frontmatter: StoryFrontmatter = {
      title: 'Test Story',
      status: 'ready',
    };
    expect(StoryFrontmatterSchema.parse(frontmatter)).toEqual(frontmatter);
  });

  it('parses frontmatter with all optional fields', () => {
    const frontmatter: StoryFrontmatter = {
      title: 'Test Story',
      status: 'in-progress',
      priority: 3,
      dependencies: ['story-1', 'story-2'],
      estimate: '2 days',
    };
    expect(StoryFrontmatterSchema.parse(frontmatter)).toEqual(frontmatter);
  });

  it('validates priority range (1-5)', () => {
    expect(() =>
      StoryFrontmatterSchema.parse({ title: 'Test', status: 'ready', priority: 0 })
    ).toThrow();
    expect(() =>
      StoryFrontmatterSchema.parse({ title: 'Test', status: 'ready', priority: 6 })
    ).toThrow();
    expect(
      StoryFrontmatterSchema.parse({ title: 'Test', status: 'ready', priority: 1 })
    ).toHaveProperty('priority', 1);
    expect(
      StoryFrontmatterSchema.parse({ title: 'Test', status: 'ready', priority: 5 })
    ).toHaveProperty('priority', 5);
  });

  it('requires title and status', () => {
    expect(() => StoryFrontmatterSchema.parse({ status: 'ready' })).toThrow();
    expect(() => StoryFrontmatterSchema.parse({ title: 'Test' })).toThrow();
    expect(() => StoryFrontmatterSchema.parse({})).toThrow();
  });
});

describe('StorySchema', () => {
  it('parses a complete story', () => {
    const story: Story = {
      slug: 'test-story',
      path: '.saga/epics/my-epic/stories/test-story/story.md',
      frontmatter: {
        title: 'Test Story',
        status: 'ready',
      },
      content: '## Context\n\nThis is the story content.',
    };
    expect(StorySchema.parse(story)).toEqual(story);
  });

  it('requires all fields', () => {
    expect(() =>
      StorySchema.parse({
        slug: 'test',
        path: '/path',
        frontmatter: { title: 'Test', status: 'ready' },
        // missing content
      })
    ).toThrow();

    expect(() =>
      StorySchema.parse({
        slug: 'test',
        path: '/path',
        content: 'content',
        // missing frontmatter
      })
    ).toThrow();
  });
});
