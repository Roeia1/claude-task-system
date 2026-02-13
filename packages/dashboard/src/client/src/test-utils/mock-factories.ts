/**
 * Mock data factories for Storybook stories
 *
 * Provides preset-based factory functions for generating consistent,
 * valid test data across all component stories.
 */

import type {
  Epic,
  EpicChild,
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
type EpicPreset = 'typical' | 'just-started' | 'in-progress' | 'almost-done' | 'completed';

/** Preset types for Story factory - represents different story states */
type StoryPreset = 'pending' | 'in-progress' | 'almost-done' | 'completed';

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
  id?: string;
  title?: string;
  description?: string;
  storyCounts?: Partial<StoryCounts>;
  stories?: StoryDetail[];
  children?: EpicChild[];
  status?: StoryStatus;
}

/** Override options for EpicSummary factory */
interface EpicSummaryOverrides {
  id?: string;
  title?: string;
  description?: string;
  storyCounts?: Partial<StoryCounts>;
  status?: StoryStatus;
}

/** Override options for Story factory */
interface StoryOverrides {
  id?: string;
  title?: string;
  description?: string;
  status?: StoryStatus;
  epic?: string;
  tasks?: Task[];
  journal?: JournalEntry[];
  guidance?: string;
  doneWhen?: string;
  avoid?: string;
  branch?: string;
  pr?: string;
  worktree?: string;
}

/** Override options for Session factory */
interface SessionOverrides {
  name?: string;
  storyId?: string;
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
  subject?: string;
  description?: string;
  status?: TaskStatus;
  blockedBy?: string[];
  guidance?: string;
  doneWhen?: string;
  activeForm?: string;
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
  typical: { pending: 2, inProgress: 3, completed: 4, total: 9 },
  'just-started': {
    pending: 5,
    inProgress: 0,
    completed: 0,
    total: 5,
  },
  'in-progress': {
    pending: 1,
    inProgress: 4,
    completed: 2,
    total: 7,
  },
  'almost-done': {
    pending: 0,
    inProgress: 1,
    completed: 7,
    total: 8,
  },
  completed: { pending: 0, inProgress: 0, completed: 6, total: 6 },
};

/** Status for each story preset */
const storyPresetStatus: Record<StoryPreset, StoryStatus> = {
  pending: 'pending',
  'in-progress': 'inProgress',
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
    subject: overrides.subject ?? `Task ${id}: ${preset.replace('-', ' ')} task`,
    description: overrides.description ?? `Description for task ${id}`,
    status: overrides.status ?? taskPresetStatus[preset],
    blockedBy: overrides.blockedBy ?? [],
    guidance: overrides.guidance,
    doneWhen: overrides.doneWhen,
    activeForm: overrides.activeForm,
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

/** Derive epic status from story counts */
function deriveEpicStatusFromCounts(counts: StoryCounts): StoryStatus {
  if (counts.total === 0) {
    return 'pending';
  }
  if (counts.completed === counts.total) {
    return 'completed';
  }
  if (counts.inProgress > 0 || counts.completed > 0) {
    return 'inProgress';
  }
  return 'pending';
}

/**
 * Creates a mock Epic with the specified preset and optional overrides.
 */
function createMockEpic(preset: EpicPreset = 'typical', overrides: EpicOverrides = {}): Epic {
  const id = ++epicCounter;
  const storyCounts = { ...epicPresetCounts[preset], ...overrides.storyCounts };

  return {
    id: overrides.id ?? `epic-${id}`,
    title: overrides.title ?? `Epic ${id}: ${preset.replace('-', ' ')}`,
    description: overrides.description ?? `This is a ${preset} epic for testing.`,
    stories: overrides.stories ?? [],
    storyCounts,
    children: overrides.children ?? [],
    status: overrides.status ?? deriveEpicStatusFromCounts(storyCounts),
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
    id: overrides.id ?? `epic-${id}`,
    title: overrides.title ?? `Epic ${id}: ${preset.replace('-', ' ')}`,
    description: overrides.description ?? `This is a ${preset} epic summary.`,
    storyCounts,
    status: overrides.status ?? deriveEpicStatusFromCounts(storyCounts),
  };
}

/**
 * Creates a mock StoryDetail with the specified preset and optional overrides.
 */
function createMockStory(
  preset: StoryPreset = 'pending',
  overrides: StoryOverrides = {},
): StoryDetail {
  const id = ++storyCounter;
  const status = overrides.status ?? storyPresetStatus[preset];

  // Generate tasks based on preset
  const defaultTasks = generateTasksForPreset(preset);
  const defaultJournal = generateJournalForPreset(preset);

  return {
    id: overrides.id ?? `story-${id}`,
    title: overrides.title ?? `Story ${id}: ${preset.replace('-', ' ')}`,
    description: overrides.description ?? `Description for story ${id}`,
    status,
    epic: overrides.epic ?? 'test-epic',
    tasks: overrides.tasks ?? defaultTasks,
    journal: overrides.journal ?? defaultJournal,
    guidance: overrides.guidance,
    doneWhen: overrides.doneWhen,
    avoid: overrides.avoid,
    branch: overrides.branch,
    pr: overrides.pr,
    worktree: overrides.worktree,
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
  const outputAvailable = overrides.outputAvailable ?? preset !== 'output-unavailable';
  const outputPreview = getOutputPreviewForPreset(preset, overrides.outputPreview);

  return {
    name: overrides.name ?? `saga-story-story-${id}-${BASE_SESSION_PID + id}`,
    storyId: overrides.storyId ?? `story-${id}`,
    status: overrides.status ?? 'running',
    outputFile: overrides.outputFile ?? `/tmp/saga/sessions/output-${id}.jsonl`,
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
    case 'pending':
      return [
        createMockTask('pending', { subject: 'Set up project structure' }),
        createMockTask('pending', { subject: 'Implement core feature' }),
        createMockTask('pending', { subject: 'Write tests' }),
      ];

    case 'in-progress':
      return [
        createMockTask('completed', { subject: 'Set up project structure' }),
        createMockTask('in-progress', { subject: 'Implement core feature' }),
        createMockTask('pending', { subject: 'Write tests' }),
      ];

    case 'almost-done':
      return [
        createMockTask('completed', { subject: 'Set up project structure' }),
        createMockTask('completed', { subject: 'Implement core feature' }),
        createMockTask('completed', { subject: 'Write unit tests' }),
        createMockTask('in-progress', { subject: 'Final cleanup' }),
      ];

    case 'completed':
      return [
        createMockTask('completed', { subject: 'Set up project structure' }),
        createMockTask('completed', { subject: 'Implement core feature' }),
        createMockTask('completed', { subject: 'Write tests' }),
      ];

    default:
      return preset satisfies never;
  }
}

/**
 * Generates journal entries appropriate for the given story preset.
 */
function generateJournalForPreset(preset: StoryPreset): JournalEntry[] {
  switch (preset) {
    case 'pending':
      return [];

    case 'in-progress':
      return [
        createMockJournal('session', {
          title: 'Session 1: Initial setup',
          content: 'Completed project structure and started on core feature.',
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
    pending: overrides.pending ?? 0,
    inProgress: overrides.inProgress ?? 0,
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
