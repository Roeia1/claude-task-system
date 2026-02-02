import { describe, expect, it } from 'vitest';
import {
  StoryCountsSchema,
  EpicSchema,
  type StoryCounts,
  type Epic,
} from './epic';
import type { Story } from './story';

describe('StoryCountsSchema', () => {
  it('parses valid story counts', () => {
    const counts: StoryCounts = {
      total: 5,
      ready: 2,
      inProgress: 1,
      blocked: 1,
      completed: 1,
    };
    expect(StoryCountsSchema.parse(counts)).toEqual(counts);
  });

  it('parses counts with all zeros', () => {
    const counts: StoryCounts = {
      total: 0,
      ready: 0,
      inProgress: 0,
      blocked: 0,
      completed: 0,
    };
    expect(StoryCountsSchema.parse(counts)).toEqual(counts);
  });

  it('requires all fields', () => {
    expect(() =>
      StoryCountsSchema.parse({ total: 5, ready: 2, inProgress: 1, blocked: 1 })
    ).toThrow(); // missing completed

    expect(() =>
      StoryCountsSchema.parse({ ready: 2, inProgress: 1, blocked: 1, completed: 1 })
    ).toThrow(); // missing total
  });
});

describe('EpicSchema', () => {
  const sampleStory: Story = {
    slug: 'test-story',
    path: '.saga/epics/my-epic/stories/test-story/story.md',
    frontmatter: {
      id: 'test-story',
      title: 'Test Story',
      status: 'ready',
      epic: 'my-epic',
      tasks: [
        { id: 't1', title: 'Task 1', status: 'pending' },
      ],
    },
    content: '## Context\n\nThis is the story content.',
  };

  const sampleStoryCounts: StoryCounts = {
    total: 1,
    ready: 1,
    inProgress: 0,
    blocked: 0,
    completed: 0,
  };

  it('parses a complete epic with stories', () => {
    const epic: Epic = {
      slug: 'my-epic',
      path: '.saga/epics/my-epic/epic.md',
      title: 'My Epic',
      content: '## Overview\n\nThis is the epic content.',
      storyCounts: sampleStoryCounts,
      stories: [sampleStory],
    };
    expect(EpicSchema.parse(epic)).toEqual(epic);
  });

  it('parses an archived epic', () => {
    const epic: Epic = {
      slug: 'old-epic',
      path: '.saga/archive/old-epic/epic.md',
      title: 'Old Epic',
      content: '## Overview\n\nArchived epic.',
      storyCounts: { total: 2, ready: 0, inProgress: 0, blocked: 0, completed: 2 },
      stories: [],
      archived: true,
    };
    expect(EpicSchema.parse(epic)).toEqual(epic);
  });

  it('parses an epic with empty stories array', () => {
    const epic: Epic = {
      slug: 'empty-epic',
      path: '.saga/epics/empty-epic/epic.md',
      title: 'Empty Epic',
      content: '## Overview\n\nNo stories yet.',
      storyCounts: { total: 0, ready: 0, inProgress: 0, blocked: 0, completed: 0 },
      stories: [],
    };
    expect(EpicSchema.parse(epic)).toEqual(epic);
  });

  it('parses epic with mixed story statuses', () => {
    const readyStory: Story = { ...sampleStory, slug: 'ready-story' };
    const inProgressStory: Story = {
      ...sampleStory,
      slug: 'in-progress-story',
      frontmatter: { ...sampleStory.frontmatter, id: 'in-progress-story', status: 'in_progress' },
    };
    const completedStory: Story = {
      ...sampleStory,
      slug: 'completed-story',
      frontmatter: { ...sampleStory.frontmatter, id: 'completed-story', status: 'completed' },
    };

    const epic: Epic = {
      slug: 'mixed-epic',
      path: '.saga/epics/mixed-epic/epic.md',
      title: 'Mixed Status Epic',
      content: '## Overview',
      storyCounts: { total: 3, ready: 1, inProgress: 1, blocked: 0, completed: 1 },
      stories: [readyStory, inProgressStory, completedStory],
    };
    expect(EpicSchema.parse(epic)).toEqual(epic);
  });

  it('requires all fields', () => {
    expect(() =>
      EpicSchema.parse({
        slug: 'test',
        path: '/path',
        title: 'Test',
        content: 'content',
        // missing storyCounts and stories
      })
    ).toThrow();

    expect(() =>
      EpicSchema.parse({
        slug: 'test',
        path: '/path',
        title: 'Test',
        storyCounts: sampleStoryCounts,
        stories: [],
        // missing content
      })
    ).toThrow();
  });
});
