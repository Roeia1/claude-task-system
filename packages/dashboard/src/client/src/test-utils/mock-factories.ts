/**
 * Mock data factories for Storybook stories
 *
 * Provides preset-based factory functions for generating consistent,
 * valid test data across all component stories.
 */

import type {
  Epic,
  EpicSummary,
  JournalEntry,
  JournalEntryType,
  SessionInfo,
  SessionStatus,
  StoryCounts,
  StoryDetail,
  StoryStatus,
  Task,
  TaskStatus,
} from '@/types/dashboard';

// ============================================================================
// Preset Types
// ============================================================================

/** Preset types for Epic factory - represents different epic states */
type EpicPreset =
  | 'typical'
  | 'just-started'
  | 'in-progress'
  | 'has-blockers'
  | 'almost-done'
  | 'completed';

/** Preset types for Story factory - represents different story states */
type StoryPreset = 'ready' | 'in-progress' | 'blocked' | 'almost-done' | 'completed';

/** Preset types for Session factory - represents different session states */
type SessionPreset =
  | 'just-started'
  | 'running'
  | 'long-running'
  | 'no-output'
  | 'output-unavailable';

/** Preset types for Task factory - represents different task states */
type TaskPreset = 'pending' | 'in-progress' | 'completed';

/** Preset types for Journal factory - represents different journal entry types */
type JournalPreset = 'session' | 'blocker' | 'resolution';

// ============================================================================
// Override Interfaces
// ============================================================================

/** Override options for Epic factory */
interface EpicOverrides {
  slug?: string;
  title?: string;
  content?: string;
  storyCounts?: Partial<StoryCounts>;
  isArchived?: boolean;
  stories?: StoryDetail[];
}

/** Override options for EpicSummary factory */
interface EpicSummaryOverrides {
  slug?: string;
  title?: string;
  storyCounts?: Partial<StoryCounts>;
  isArchived?: boolean;
}

/** Override options for Story factory */
interface StoryOverrides {
  slug?: string;
  title?: string;
  status?: StoryStatus;
  epicSlug?: string;
  tasks?: Task[];
  journal?: JournalEntry[];
  content?: string;
}

/** Override options for Session factory */
interface SessionOverrides {
  name?: string;
  epicSlug?: string;
  storySlug?: string;
  status?: SessionStatus;
  outputFile?: string;
  outputAvailable?: boolean;
  startTime?: string;
  endTime?: string;
  outputPreview?: string;
}

/** Override options for Task factory */
interface TaskOverrides {
  id?: string;
  title?: string;
  status?: TaskStatus;
}

/** Override options for Journal factory */
interface JournalOverrides {
  type?: JournalEntryType;
  title?: string;
  content?: string;
  timestamp?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Base PID for mock session names */
const BASE_SESSION_PID = 12_345;

/** Time constants (in milliseconds) */
const MS_FIFTEEN_SECONDS = 15_000;
const MS_TWO_AND_HALF_MINUTES = 150_000;
const MS_ONE_HOUR_TWO_MINUTES = 3_720_000;

// ============================================================================
// Preset Data
// ============================================================================

/** Story counts for each epic preset */
const epicPresetCounts: Record<EpicPreset, StoryCounts> = {
  typical: { ready: 2, inProgress: 3, blocked: 1, completed: 4, total: 10 },
  'just-started': {
    ready: 5,
    inProgress: 0,
    blocked: 0,
    completed: 0,
    total: 5,
  },
  'in-progress': {
    ready: 1,
    inProgress: 4,
    blocked: 0,
    completed: 2,
    total: 7,
  },
  'has-blockers': {
    ready: 1,
    inProgress: 2,
    blocked: 2,
    completed: 1,
    total: 6,
  },
  'almost-done': {
    ready: 0,
    inProgress: 1,
    blocked: 0,
    completed: 7,
    total: 8,
  },
  completed: { ready: 0, inProgress: 0, blocked: 0, completed: 6, total: 6 },
};

/** Status for each story preset */
const storyPresetStatus: Record<StoryPreset, StoryStatus> = {
  ready: 'ready',
  'in-progress': 'inProgress',
  blocked: 'blocked',
  'almost-done': 'inProgress',
  completed: 'completed',
};

/** Task status for each task preset */
const taskPresetStatus: Record<TaskPreset, TaskStatus> = {
  pending: 'pending',
  'in-progress': 'inProgress',
  completed: 'completed',
};

/** Journal entry type for each journal preset */
const journalPresetType: Record<JournalPreset, JournalEntryType> = {
  session: 'session',
  blocker: 'blocker',
  resolution: 'resolution',
};

// ============================================================================
// Factory Functions
// ============================================================================

let epicCounter = 0;
let storyCounter = 0;
let sessionCounter = 0;
let taskCounter = 0;

/**
 * Creates a mock Task with the specified preset and optional overrides.
 */
function createMockTask(preset: TaskPreset = 'pending', overrides: TaskOverrides = {}): Task {
  const id = ++taskCounter;

  return {
    id: overrides.id ?? `task-${id}`,
    title: overrides.title ?? `Task ${id}: ${preset.replace('-', ' ')} task`,
    status: overrides.status ?? taskPresetStatus[preset],
  };
}

/**
 * Creates a mock JournalEntry with the specified preset and optional overrides.
 */
function createMockJournal(
  preset: JournalPreset = 'session',
  overrides: JournalOverrides = {},
): JournalEntry {
  const type = overrides.type ?? journalPresetType[preset];

  const defaultContent = getJournalContentForPreset(preset);
  const defaultTitle = getJournalTitleForPreset(preset);

  return {
    type,
    title: overrides.title ?? defaultTitle,
    content: overrides.content ?? defaultContent,
    timestamp: overrides.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Creates a mock Epic with the specified preset and optional overrides.
 */
function createMockEpic(preset: EpicPreset = 'typical', overrides: EpicOverrides = {}): Epic {
  const id = ++epicCounter;
  const storyCounts = { ...epicPresetCounts[preset], ...overrides.storyCounts };

  return {
    slug: overrides.slug ?? `epic-${id}`,
    title: overrides.title ?? `Epic ${id}: ${preset.replace('-', ' ')}`,
    content: overrides.content ?? `# Epic ${id}\n\nThis is a ${preset} epic for testing.`,
    stories: overrides.stories ?? [],
    storyCounts,
    isArchived: overrides.isArchived ?? false,
  };
}

/**
 * Creates a mock EpicSummary with the specified preset and optional overrides.
 */
function createMockEpicSummary(
  preset: EpicPreset = 'typical',
  overrides: EpicSummaryOverrides = {},
): EpicSummary {
  const id = ++epicCounter;
  const storyCounts = { ...epicPresetCounts[preset], ...overrides.storyCounts };

  return {
    slug: overrides.slug ?? `epic-${id}`,
    title: overrides.title ?? `Epic ${id}: ${preset.replace('-', ' ')}`,
    storyCounts,
    isArchived: overrides.isArchived ?? false,
  };
}

/**
 * Creates a mock StoryDetail with the specified preset and optional overrides.
 */
function createMockStory(
  preset: StoryPreset = 'ready',
  overrides: StoryOverrides = {},
): StoryDetail {
  const id = ++storyCounter;
  const status = overrides.status ?? storyPresetStatus[preset];

  // Generate tasks based on preset
  const defaultTasks = generateTasksForPreset(preset);
  const defaultJournal = generateJournalForPreset(preset);

  return {
    slug: overrides.slug ?? `story-${id}`,
    title: overrides.title ?? `Story ${id}: ${preset.replace('-', ' ')}`,
    status,
    epicSlug: overrides.epicSlug ?? 'test-epic',
    tasks: overrides.tasks ?? defaultTasks,
    journal: overrides.journal ?? defaultJournal,
    content: overrides.content,
  };
}

/**
 * Creates a mock SessionInfo with the specified preset and optional overrides.
 */
function createMockSession(
  preset: SessionPreset = 'running',
  overrides: SessionOverrides = {},
): SessionInfo {
  const id = ++sessionCounter;

  // Calculate start time based on preset
  let startOffset: number;
  switch (preset) {
    case 'just-started':
      startOffset = MS_FIFTEEN_SECONDS;
      break;
    case 'long-running':
      startOffset = MS_ONE_HOUR_TWO_MINUTES;
      break;
    default:
      startOffset = MS_TWO_AND_HALF_MINUTES;
  }

  const startTime = overrides.startTime ?? new Date(Date.now() - startOffset).toISOString();

  // Determine output availability based on preset
  // 'no-output' means output is available but empty (no preview shown)
  // 'output-unavailable' means output file is not accessible (shows message)
  const outputAvailable = overrides.outputAvailable ?? preset !== 'output-unavailable';
  const outputPreview = getOutputPreviewForPreset(preset, overrides.outputPreview);

  return {
    name: overrides.name ?? `saga__test-epic__story-${id}__${BASE_SESSION_PID + id}`,
    epicSlug: overrides.epicSlug ?? 'test-epic',
    storySlug: overrides.storySlug ?? `story-${id}`,
    status: overrides.status ?? 'running',
    outputFile: overrides.outputFile ?? `/tmp/saga/sessions/output-${id}.log`,
    outputAvailable,
    startTime,
    endTime: overrides.endTime,
    outputPreview,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates an array of tasks appropriate for the given story preset.
 */
function generateTasksForPreset(preset: StoryPreset): Task[] {
  switch (preset) {
    case 'ready':
      return [
        createMockTask('pending', { title: 'Set up project structure' }),
        createMockTask('pending', { title: 'Implement core feature' }),
        createMockTask('pending', { title: 'Write tests' }),
      ];

    case 'in-progress':
      return [
        createMockTask('completed', { title: 'Set up project structure' }),
        createMockTask('in-progress', { title: 'Implement core feature' }),
        createMockTask('pending', { title: 'Write tests' }),
      ];

    case 'blocked':
      return [
        createMockTask('completed', { title: 'Set up project structure' }),
        createMockTask('pending', { title: 'Waiting for API changes' }),
        createMockTask('pending', { title: 'Write integration tests' }),
      ];

    case 'almost-done':
      return [
        createMockTask('completed', { title: 'Set up project structure' }),
        createMockTask('completed', { title: 'Implement core feature' }),
        createMockTask('completed', { title: 'Write unit tests' }),
        createMockTask('in-progress', { title: 'Final cleanup' }),
      ];

    case 'completed':
      return [
        createMockTask('completed', { title: 'Set up project structure' }),
        createMockTask('completed', { title: 'Implement core feature' }),
        createMockTask('completed', { title: 'Write tests' }),
      ];

    default:
      // Exhaustive check - TypeScript ensures all cases are handled
      return preset satisfies never;
  }
}

/**
 * Generates journal entries appropriate for the given story preset.
 */
function generateJournalForPreset(preset: StoryPreset): JournalEntry[] {
  switch (preset) {
    case 'ready':
      return [];

    case 'in-progress':
      return [
        createMockJournal('session', {
          title: 'Session 1: Initial setup',
          content: 'Completed project structure and started on core feature.',
        }),
      ];

    case 'blocked':
      return [
        createMockJournal('session', {
          title: 'Session 1: Initial work',
          content: 'Set up the project structure.',
        }),
        createMockJournal('blocker', {
          title: 'Blocked: Need API changes',
          content:
            'Cannot proceed until the backend API is updated to support the new endpoint format.',
        }),
      ];

    case 'almost-done':
      return [
        createMockJournal('session', {
          title: 'Session 1: Setup',
          content: 'Completed initial setup.',
        }),
        createMockJournal('session', {
          title: 'Session 2: Core implementation',
          content: 'Implemented the main feature and wrote tests.',
        }),
      ];

    case 'completed':
      return [
        createMockJournal('session', {
          title: 'Session 1: Full implementation',
          content: 'Completed all tasks successfully.',
        }),
      ];

    default:
      // Exhaustive check - TypeScript ensures all cases are handled
      return preset satisfies never;
  }
}

/**
 * Gets the output preview content for a session preset.
 */
function getOutputPreviewForPreset(preset: SessionPreset, override?: string): string | undefined {
  if (override !== undefined) {
    return override;
  }

  switch (preset) {
    case 'just-started':
      return '> Initializing session...\n> Loading dependencies...';

    case 'running':
      return '> Starting session...\n> Running tests...\n> Tests passed\n> Building...\n> Build complete';

    case 'long-running':
      return '> Long running task...\n> Still processing...\n> 50% complete...\n> 75% complete...\n> Almost done...';

    case 'no-output':
    case 'output-unavailable':
      return undefined;

    default:
      // Exhaustive check - TypeScript ensures all cases are handled
      return preset satisfies never;
  }
}

/**
 * Gets the default journal content for a preset.
 */
function getJournalContentForPreset(preset: JournalPreset): string {
  switch (preset) {
    case 'session':
      return 'Worked on implementing the feature. Made good progress on the core functionality.';

    case 'blocker':
      return `## What I'm trying to do
Implement the new API endpoint integration.

## What I tried
- Attempted to connect to the new endpoint
- Tried using the legacy format

## What I need
Need the backend team to update the API schema.`;

    case 'resolution':
      return `## Resolution
The backend team has updated the API. Proceeding with implementation.`;

    default:
      // Exhaustive check - TypeScript ensures all cases are handled
      return preset satisfies never;
  }
}

/**
 * Gets the default journal title for a preset.
 */
function getJournalTitleForPreset(preset: JournalPreset): string {
  switch (preset) {
    case 'session':
      return 'Session: Implementation progress';
    case 'blocker':
      return 'Blocker: API dependency';
    case 'resolution':
      return 'Resolution: API updated';
    default:
      // Exhaustive check - TypeScript ensures all cases are handled
      return preset satisfies never;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Resets all counters. Useful for test isolation.
 */
function resetMockCounters(): void {
  epicCounter = 0;
  storyCounter = 0;
  sessionCounter = 0;
  taskCounter = 0;
}

/**
 * Creates a complete story counts object with defaults.
 */
function createStoryCounts(overrides: Partial<StoryCounts> = {}): StoryCounts {
  return {
    ready: overrides.ready ?? 0,
    inProgress: overrides.inProgress ?? 0,
    blocked: overrides.blocked ?? 0,
    completed: overrides.completed ?? 0,
    total: overrides.total ?? 0,
  };
}

// ============================================================================
// Exports
// ============================================================================

export type {
  EpicPreset,
  StoryPreset,
  SessionPreset,
  TaskPreset,
  JournalPreset,
  EpicOverrides,
  EpicSummaryOverrides,
  StoryOverrides,
  SessionOverrides,
  TaskOverrides,
  JournalOverrides,
};

export {
  createMockEpic,
  createMockEpicSummary,
  createMockStory,
  createMockSession,
  createMockTask,
  createMockJournal,
  resetMockCounters,
  createStoryCounts,
};
