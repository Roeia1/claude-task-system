import { describe, expect, it } from 'vitest';
import { type Epic, type EpicChild, EpicChildSchema, EpicSchema } from './epic.ts';

describe('EpicChildSchema', () => {
  it('parses a valid epic child', () => {
    const child: EpicChild = {
      id: 'story-one',
      blockedBy: [],
    };
    expect(EpicChildSchema.parse(child)).toEqual(child);
  });

  it('parses a child with blockers', () => {
    const child: EpicChild = {
      id: 'story-two',
      blockedBy: ['story-one', 'story-three'],
    };
    expect(EpicChildSchema.parse(child)).toEqual(child);
  });

  it('rejects child missing id', () => {
    expect(() => EpicChildSchema.parse({ blockedBy: [] })).toThrow();
  });

  it('rejects child missing blockedBy', () => {
    expect(() => EpicChildSchema.parse({ id: 'story-one' })).toThrow();
  });
});

describe('EpicSchema', () => {
  it('parses a valid epic with required fields and empty children', () => {
    const epic: Epic = {
      id: 'my-epic',
      title: 'My Epic',
      description: 'An epic for testing.',
      children: [],
    };
    expect(EpicSchema.parse(epic)).toEqual(epic);
  });

  it('parses an epic with children', () => {
    const epic: Epic = {
      id: 'feature-epic',
      title: 'Feature Epic',
      description: 'Epic with multiple stories.',
      children: [
        { id: 'story-one', blockedBy: [] },
        { id: 'story-two', blockedBy: ['story-one'] },
        { id: 'story-three', blockedBy: ['story-one', 'story-two'] },
      ],
    };
    expect(EpicSchema.parse(epic)).toEqual(epic);
  });

  it('rejects epic missing id', () => {
    expect(() =>
      EpicSchema.parse({
        title: 'Test',
        description: 'Desc',
        children: [],
      }),
    ).toThrow();
  });

  it('rejects epic missing title', () => {
    expect(() =>
      EpicSchema.parse({
        id: 'test',
        description: 'Desc',
        children: [],
      }),
    ).toThrow();
  });

  it('rejects epic missing description', () => {
    expect(() =>
      EpicSchema.parse({
        id: 'test',
        title: 'Test',
        children: [],
      }),
    ).toThrow();
  });

  it('rejects epic missing children', () => {
    expect(() =>
      EpicSchema.parse({
        id: 'test',
        title: 'Test',
        description: 'Desc',
      }),
    ).toThrow();
  });

  it('rejects epic with invalid children entries', () => {
    expect(() =>
      EpicSchema.parse({
        id: 'test',
        title: 'Test',
        description: 'Desc',
        children: [{ id: 'story-one' }], // missing blockedBy
      }),
    ).toThrow();
  });

  it('rejects old epic fields (slug, path, content, storyCounts, stories, archived)', () => {
    expect(() =>
      EpicSchema.parse({
        id: 'test',
        title: 'Test',
        description: 'Desc',
        children: [],
        slug: 'test',
      }),
    ).toThrow();

    expect(() =>
      EpicSchema.parse({
        id: 'test',
        title: 'Test',
        description: 'Desc',
        children: [],
        status: 'active',
      }),
    ).toThrow();
  });
});
