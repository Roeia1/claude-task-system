import { describe, expect, it } from 'vitest';
import { type Story, StorySchema } from './story.ts';

describe('StorySchema', () => {
  const validStory: Story = {
    id: 'my-story',
    title: 'My Story',
    description: 'A story about migrating types',
  };

  it('parses a valid story with required fields only', () => {
    expect(StorySchema.parse(validStory)).toEqual(validStory);
  });

  it('parses a story with all optional fields', () => {
    const fullStory: Story = {
      id: 'full-story',
      title: 'Full Story',
      description: 'A story with all fields',
      epic: 'my-epic',
      guidance: 'Follow TDD',
      doneWhen: 'All tests pass',
      avoid: 'Do not use deprecated APIs',
      branch: 'story-full-story-epic-my-epic',
      pr: 'https://github.com/org/repo/pull/42',
      worktree: '/path/to/worktree',
    };
    expect(StorySchema.parse(fullStory)).toEqual(fullStory);
  });

  it('parses a story with some optional fields', () => {
    const partialStory = {
      id: 'partial-story',
      title: 'Partial Story',
      description: 'Only some optional fields',
      epic: 'my-epic',
      branch: 'story-partial-story',
    };
    const result = StorySchema.parse(partialStory);
    expect(result.id).toBe('partial-story');
    expect(result.epic).toBe('my-epic');
    expect(result.branch).toBe('story-partial-story');
    expect(result.guidance).toBeUndefined();
    expect(result.doneWhen).toBeUndefined();
    expect(result.avoid).toBeUndefined();
    expect(result.pr).toBeUndefined();
    expect(result.worktree).toBeUndefined();
  });

  it('rejects objects missing id', () => {
    expect(() =>
      StorySchema.parse({
        title: 'Test',
        description: 'desc',
      }),
    ).toThrow();
  });

  it('rejects objects missing title', () => {
    expect(() =>
      StorySchema.parse({
        id: 'test',
        description: 'desc',
      }),
    ).toThrow();
  });

  it('rejects objects missing description', () => {
    expect(() =>
      StorySchema.parse({
        id: 'test',
        title: 'Test',
      }),
    ).toThrow();
  });

  it('rejects objects with a status field (status is derived, not stored)', () => {
    expect(() =>
      StorySchema.parse({
        id: 'test',
        title: 'Test',
        description: 'desc',
        status: 'ready',
      }),
    ).toThrow();
  });

  it('rejects objects with a tasks field (tasks are separate files)', () => {
    expect(() =>
      StorySchema.parse({
        id: 'test',
        title: 'Test',
        description: 'desc',
        tasks: [
          { id: 't1', subject: 'Task', description: 'desc', status: 'pending', blockedBy: [] },
        ],
      }),
    ).toThrow();
  });

  it('rejects objects with old markdown-based fields', () => {
    expect(() =>
      StorySchema.parse({
        id: 'test',
        title: 'Test',
        description: 'desc',
        slug: 'test-slug',
      }),
    ).toThrow();
    expect(() =>
      StorySchema.parse({
        id: 'test',
        title: 'Test',
        description: 'desc',
        frontmatter: {},
      }),
    ).toThrow();
  });

  it('rejects non-string values for string fields', () => {
    expect(() =>
      StorySchema.parse({
        id: 123,
        title: 'Test',
        description: 'desc',
      }),
    ).toThrow();
  });
});
