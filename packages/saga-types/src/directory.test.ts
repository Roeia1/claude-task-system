import { describe, expect, it } from 'vitest';
import {
  type ArchivePaths,
  createArchivePaths,
  createEpicPaths,
  createFlatEpicPath,
  createFlatStoryPaths,
  createSagaPaths,
  createStoryPaths,
  createTaskPath,
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

describe('createFlatStoryPaths', () => {
  it('returns correct flat story paths', () => {
    const paths = createFlatStoryPaths('/path/to/project', 'my-story');

    expect(paths.storyId).toBe('my-story');
    expect(paths.storyDir).toBe('/path/to/project/.saga/stories/my-story');
    expect(paths.storyJson).toBe('/path/to/project/.saga/stories/my-story/story.json');
    expect(paths.journalMd).toBe('/path/to/project/.saga/stories/my-story/journal.md');
  });

  it('handles trailing slash on project root', () => {
    const paths = createFlatStoryPaths('/path/to/project/', 'auth-setup');

    expect(paths.storyDir).toBe('/path/to/project/.saga/stories/auth-setup');
    expect(paths.storyJson).toBe('/path/to/project/.saga/stories/auth-setup/story.json');
    expect(paths.journalMd).toBe('/path/to/project/.saga/stories/auth-setup/journal.md');
  });

  it('handles story id with digits and dashes', () => {
    const paths = createFlatStoryPaths('/project', 'story-123-abc');

    expect(paths.storyId).toBe('story-123-abc');
    expect(paths.storyDir).toBe('/project/.saga/stories/story-123-abc');
  });
});

describe('createFlatEpicPath', () => {
  it('returns correct flat epic path', () => {
    const paths = createFlatEpicPath('/path/to/project', 'my-epic');

    expect(paths.epicId).toBe('my-epic');
    expect(paths.epicJson).toBe('/path/to/project/.saga/epics/my-epic.json');
  });

  it('handles trailing slash on project root', () => {
    const paths = createFlatEpicPath('/path/to/project/', 'tasks-integration');

    expect(paths.epicId).toBe('tasks-integration');
    expect(paths.epicJson).toBe('/path/to/project/.saga/epics/tasks-integration.json');
  });

  it('handles epic id with digits', () => {
    const paths = createFlatEpicPath('/project', 'epic-42');

    expect(paths.epicId).toBe('epic-42');
    expect(paths.epicJson).toBe('/project/.saga/epics/epic-42.json');
  });
});

describe('createTaskPath', () => {
  it('returns correct task JSON file path', () => {
    const taskPath = createTaskPath('/path/to/project', 'my-story', 't1');

    expect(taskPath).toBe('/path/to/project/.saga/stories/my-story/t1.json');
  });

  it('handles trailing slash on project root', () => {
    const taskPath = createTaskPath('/path/to/project/', 'my-story', 't2');

    expect(taskPath).toBe('/path/to/project/.saga/stories/my-story/t2.json');
  });

  it('handles task id with dashes and digits', () => {
    const taskPath = createTaskPath('/project', 'auth-story', 'task-setup-db');

    expect(taskPath).toBe('/project/.saga/stories/auth-story/task-setup-db.json');
  });

  it('constructs path consistent with createFlatStoryPaths', () => {
    const storyPaths = createFlatStoryPaths('/project', 'my-story');
    const taskPath = createTaskPath('/project', 'my-story', 't1');

    expect(taskPath).toBe(`${storyPaths.storyDir}/t1.json`);
  });
});
