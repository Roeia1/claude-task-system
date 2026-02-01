/**
 * Dashboard data model types
 * These match the API responses from the backend server
 */

/** Task status values */
export type TaskStatus = 'pending' | 'inProgress' | 'completed';

/** Story status values */
export type StoryStatus = 'ready' | 'inProgress' | 'blocked' | 'completed';

/** Journal entry types */
export type JournalEntryType = 'session' | 'blocker' | 'resolution';

/** Task within a story */
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

/** Journal entry in a story */
export interface JournalEntry {
  type: JournalEntryType;
  title: string;
  content: string;
  timestamp?: string;
}

/** Story counts per status for epic summary */
export interface StoryCounts {
  ready: number;
  inProgress: number;
  blocked: number;
  completed: number;
  total: number;
}

/** Epic summary for list view */
export interface EpicSummary {
  slug: string;
  title: string;
  storyCounts: StoryCounts;
  isArchived?: boolean;
}

/** Full story detail */
export interface StoryDetail {
  slug: string;
  title: string;
  status: StoryStatus;
  epicSlug: string;
  tasks: Task[];
  journal: JournalEntry[];
  content?: string;
}

/** Full epic detail with stories */
export interface Epic {
  slug: string;
  title: string;
  content?: string;
  stories: StoryDetail[];
  storyCounts: StoryCounts;
  isArchived?: boolean;
}

/** Session status values */
export type SessionStatus = 'running' | 'completed';

/**
 * Session info from the dashboard API
 * Matches the backend DetailedSessionInfo type with JSON-serialized dates
 */
export interface SessionInfo {
  /** Unique session name (saga__<epic>__<story>__<pid>) */
  name: string;
  /** Epic slug extracted from session name */
  epicSlug: string;
  /** Story slug extracted from session name */
  storySlug: string;
  /** Current session status */
  status: SessionStatus;
  /** Path to the output file */
  outputFile: string;
  /** Whether the output file exists and is readable */
  outputAvailable: boolean;
  /** Session start time (ISO 8601 string) */
  startTime: string;
  /** Session end time (ISO 8601 string), only present for completed sessions */
  endTime?: string;
  /** Preview of the last 5 lines of output (max 500 chars) */
  outputPreview?: string;
}
