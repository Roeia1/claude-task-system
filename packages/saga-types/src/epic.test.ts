import { describe, expect, it } from 'vitest';
import {
  EpicFrontmatterSchema,
  EpicSchema,
  type EpicFrontmatter,
  type Epic,
} from './epic';
import type { Story } from './story';

describe('EpicFrontmatterSchema', () => {
  it('parses minimal valid frontmatter', () => {
    const frontmatter: EpicFrontmatter = {
      title: 'Test Epic',
    };
    expect(EpicFrontmatterSchema.parse(frontmatter)).toEqual(frontmatter);
  });

  it('parses frontmatter with status', () => {
    const activeFrontmatter: EpicFrontmatter = {
      title: 'Active Epic',
      status: 'active',
    };
    expect(EpicFrontmatterSchema.parse(activeFrontmatter)).toEqual(activeFrontmatter);

    const archivedFrontmatter: EpicFrontmatter = {
      title: 'Archived Epic',
      status: 'archived',
    };
    expect(EpicFrontmatterSchema.parse(archivedFrontmatter)).toEqual(archivedFrontmatter);
  });

  it('rejects invalid status values', () => {
    expect(() =>
      EpicFrontmatterSchema.parse({ title: 'Test', status: 'invalid' })
    ).toThrow();
  });

  it('requires title', () => {
    expect(() => EpicFrontmatterSchema.parse({})).toThrow();
    expect(() => EpicFrontmatterSchema.parse({ status: 'active' })).toThrow();
  });
});

describe('EpicSchema', () => {
  const sampleStory: Story = {
    slug: 'test-story',
    path: '.saga/epics/my-epic/stories/test-story/story.md',
    frontmatter: {
      title: 'Test Story',
      status: 'ready',
    },
    content: '## Context\n\nThis is the story content.',
  };

  it('parses a complete epic with stories', () => {
    const epic: Epic = {
      slug: 'my-epic',
      path: '.saga/epics/my-epic/epic.md',
      frontmatter: {
        title: 'My Epic',
        status: 'active',
      },
      content: '## Overview\n\nThis is the epic content.',
      stories: [sampleStory],
    };
    expect(EpicSchema.parse(epic)).toEqual(epic);
  });

  it('parses an epic with empty stories array', () => {
    const epic: Epic = {
      slug: 'empty-epic',
      path: '.saga/epics/empty-epic/epic.md',
      frontmatter: {
        title: 'Empty Epic',
      },
      content: '## Overview\n\nNo stories yet.',
      stories: [],
    };
    expect(EpicSchema.parse(epic)).toEqual(epic);
  });

  it('requires all fields', () => {
    expect(() =>
      EpicSchema.parse({
        slug: 'test',
        path: '/path',
        frontmatter: { title: 'Test' },
        content: 'content',
        // missing stories
      })
    ).toThrow();

    expect(() =>
      EpicSchema.parse({
        slug: 'test',
        path: '/path',
        frontmatter: { title: 'Test' },
        stories: [],
        // missing content
      })
    ).toThrow();
  });
});
