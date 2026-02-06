import { describe, expect, it } from 'vitest';
import {
  type ArchivePaths,
  createArchivePaths,
  createEpicPaths,
  createSagaPaths,
  createStoryPaths,
  createWorktreePaths,
  type EpicPaths,
  type SagaPaths,
  type StoryPaths,
  type WorktreePaths,
} from './directory.ts';

describe('SagaPaths', () => {
  const projectRoot = '/path/to/project';

  it('creates correct saga root paths including stories', () => {
    const paths: SagaPaths = createSagaPaths(projectRoot);

    expect(paths.root).toBe('/path/to/project');
    expect(paths.saga).toBe('/path/to/project/.saga');
    expect(paths.epics).toBe('/path/to/project/.saga/epics');
    expect(paths.stories).toBe('/path/to/project/.saga/stories');
    expect(paths.worktrees).toBe('/path/to/project/.saga/worktrees');
    expect(paths.archive).toBe('/path/to/project/.saga/archive');
  });

  it('handles project root with trailing slash', () => {
    const paths: SagaPaths = createSagaPaths('/path/to/project/');

    expect(paths.root).toBe('/path/to/project');
    expect(paths.saga).toBe('/path/to/project/.saga');
    expect(paths.stories).toBe('/path/to/project/.saga/stories');
  });
});

describe('EpicPaths', () => {
  it('creates correct epic paths with epicJson pointing to single file', () => {
    const paths: EpicPaths = createEpicPaths('/path/to/project', 'my-epic');

    expect(paths.epicId).toBe('my-epic');
    expect(paths.epicJson).toBe('/path/to/project/.saga/epics/my-epic.json');
  });

  it('handles epic id with hyphens', () => {
    const paths: EpicPaths = createEpicPaths('/path/to/project', 'cli-dashboard-refactor');

    expect(paths.epicId).toBe('cli-dashboard-refactor');
    expect(paths.epicJson).toBe('/path/to/project/.saga/epics/cli-dashboard-refactor.json');
  });
});

describe('StoryPaths', () => {
  it('creates correct story paths under .saga/stories/', () => {
    const paths: StoryPaths = createStoryPaths('/path/to/project', 'my-story');

    expect(paths.storyId).toBe('my-story');
    expect(paths.storyDir).toBe('/path/to/project/.saga/stories/my-story');
    expect(paths.storyJson).toBe('/path/to/project/.saga/stories/my-story/story.json');
    expect(paths.journalMd).toBe('/path/to/project/.saga/stories/my-story/journal.md');
  });

  it('handles story id with multiple hyphens', () => {
    const paths: StoryPaths = createStoryPaths('/project', 'my-complex-story-id');

    expect(paths.storyId).toBe('my-complex-story-id');
    expect(paths.storyDir).toBe('/project/.saga/stories/my-complex-story-id');
    expect(paths.storyJson).toBe('/project/.saga/stories/my-complex-story-id/story.json');
    expect(paths.journalMd).toBe('/project/.saga/stories/my-complex-story-id/journal.md');
  });
});

describe('WorktreePaths', () => {
  it('creates correct worktree paths under .saga/worktrees/<story-id>/', () => {
    const paths: WorktreePaths = createWorktreePaths('/path/to/project', 'my-story');

    expect(paths.storyId).toBe('my-story');
    expect(paths.worktreeDir).toBe('/path/to/project/.saga/worktrees/my-story');
  });

  it('handles trailing slash on project root', () => {
    const paths: WorktreePaths = createWorktreePaths('/path/to/project/', 'my-story');

    expect(paths.worktreeDir).toBe('/path/to/project/.saga/worktrees/my-story');
  });
});

describe('ArchivePaths', () => {
  it('creates correct archive paths for epic', () => {
    const paths: ArchivePaths = createArchivePaths('/path/to/project', 'my-epic');

    expect(paths.epicSlug).toBe('my-epic');
    expect(paths.archiveEpicDir).toBe('/path/to/project/.saga/archive/my-epic');
  });

  it('creates correct archive paths for story', () => {
    const paths: ArchivePaths = createArchivePaths('/path/to/project', 'my-epic', 'my-story');

    expect(paths.epicSlug).toBe('my-epic');
    expect(paths.storySlug).toBe('my-story');
    expect(paths.archiveStoryDir).toBe('/path/to/project/.saga/archive/my-epic/my-story');
    expect(paths.archiveStoryMd).toBe('/path/to/project/.saga/archive/my-epic/my-story/story.md');
  });
});
