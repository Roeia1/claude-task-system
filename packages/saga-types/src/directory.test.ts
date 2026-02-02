import { describe, expect, it } from 'vitest';
import {
  type SagaPaths,
  type EpicPaths,
  type StoryPaths,
  type WorktreePaths,
  type ArchivePaths,
  createSagaPaths,
  createEpicPaths,
  createStoryPaths,
  createWorktreePaths,
  createArchivePaths,
} from './directory';

describe('SagaPaths', () => {
  const projectRoot = '/path/to/project';

  it('creates correct saga root paths', () => {
    const paths: SagaPaths = createSagaPaths(projectRoot);

    expect(paths.root).toBe('/path/to/project');
    expect(paths.saga).toBe('/path/to/project/.saga');
    expect(paths.epics).toBe('/path/to/project/.saga/epics');
    expect(paths.worktrees).toBe('/path/to/project/.saga/worktrees');
    expect(paths.archive).toBe('/path/to/project/.saga/archive');
  });

  it('handles project root with trailing slash', () => {
    const paths: SagaPaths = createSagaPaths('/path/to/project/');

    // Should normalize trailing slash
    expect(paths.root).toBe('/path/to/project');
    expect(paths.saga).toBe('/path/to/project/.saga');
  });
});

describe('EpicPaths', () => {
  it('creates correct epic paths', () => {
    const paths: EpicPaths = createEpicPaths('/path/to/project', 'my-epic');

    expect(paths.epicSlug).toBe('my-epic');
    expect(paths.epicDir).toBe('/path/to/project/.saga/epics/my-epic');
    expect(paths.epicMd).toBe('/path/to/project/.saga/epics/my-epic/epic.md');
    expect(paths.storiesDir).toBe('/path/to/project/.saga/epics/my-epic/stories');
  });

  it('handles epic slug with special characters', () => {
    const paths: EpicPaths = createEpicPaths('/path/to/project', 'cli-dashboard-refactor');

    expect(paths.epicSlug).toBe('cli-dashboard-refactor');
    expect(paths.epicDir).toBe('/path/to/project/.saga/epics/cli-dashboard-refactor');
  });
});

describe('StoryPaths', () => {
  it('creates correct story paths', () => {
    const paths: StoryPaths = createStoryPaths('/path/to/project', 'my-epic', 'my-story');

    expect(paths.epicSlug).toBe('my-epic');
    expect(paths.storySlug).toBe('my-story');
    expect(paths.storyDir).toBe('/path/to/project/.saga/epics/my-epic/stories/my-story');
    expect(paths.storyMd).toBe('/path/to/project/.saga/epics/my-epic/stories/my-story/story.md');
    expect(paths.journalMd).toBe('/path/to/project/.saga/epics/my-epic/stories/my-story/journal.md');
  });

  it('handles story with different epic', () => {
    const paths: StoryPaths = createStoryPaths('/project', 'epic-a', 'story-b');

    expect(paths.epicSlug).toBe('epic-a');
    expect(paths.storySlug).toBe('story-b');
    expect(paths.storyDir).toBe('/project/.saga/epics/epic-a/stories/story-b');
  });
});

describe('WorktreePaths', () => {
  it('creates correct worktree paths', () => {
    const paths: WorktreePaths = createWorktreePaths('/path/to/project', 'my-epic', 'my-story');

    expect(paths.epicSlug).toBe('my-epic');
    expect(paths.storySlug).toBe('my-story');
    expect(paths.worktreeDir).toBe('/path/to/project/.saga/worktrees/my-epic/my-story');
  });

  it('creates correct nested saga paths inside worktree', () => {
    const paths: WorktreePaths = createWorktreePaths('/path/to/project', 'my-epic', 'my-story');

    // Inside worktree, the .saga structure is nested
    expect(paths.storyMdInWorktree).toBe(
      '/path/to/project/.saga/worktrees/my-epic/my-story/.saga/epics/my-epic/stories/my-story/story.md'
    );
    expect(paths.journalMdInWorktree).toBe(
      '/path/to/project/.saga/worktrees/my-epic/my-story/.saga/epics/my-epic/stories/my-story/journal.md'
    );
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
