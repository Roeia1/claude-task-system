/**
 * Dashboard data model types
 * These match the API responses from the backend server
 */

import type { WorkerMessage as SdkWorkerMessage } from '@saga-ai/utils';

/** Session status values */
export type SessionStatus = 'running' | 'completed';

/** Session info from the dashboard API */
export interface SessionInfo {
  name: string;
  storyId: string;
  status: SessionStatus;
  outputFile: string;
  outputAvailable: boolean;
  startTime: string;
  endTime?: string;
  outputPreview?: string;
}

/** Task status values (camelCase for API response format) */
export type TaskStatus = 'pending' | 'inProgress' | 'completed';

/** Story status values (same as task status — derived from tasks) */
export type StoryStatus = 'pending' | 'inProgress' | 'completed';

/** Journal entry types */
export type JournalEntryType = 'session' | 'blocker' | 'resolution';

/** Task within a story (full detail from JSON storage) */
export interface Task {
  id: string;
  subject: string;
  description: string;
  status: TaskStatus;
  blockedBy: string[];
  guidance?: string;
  doneWhen?: string;
  activeForm?: string;
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
  pending: number;
  inProgress: number;
  completed: number;
  total: number;
}

/** Epic child reference with dependency info */
export interface EpicChild {
  id: string;
  blockedBy: string[];
}

/** Epic summary for list view */
export interface EpicSummary {
  id: string;
  title: string;
  description: string;
  status: StoryStatus;
  storyCounts: StoryCounts;
}

/** Full story detail */
export interface StoryDetail {
  id: string;
  title: string;
  description: string;
  epic?: string;
  status: StoryStatus;
  tasks: Task[];
  journal?: JournalEntry[];
  guidance?: string;
  doneWhen?: string;
  avoid?: string;
  branch?: string;
  pr?: string;
  worktree?: string;
}

/** Full epic detail with stories */
export interface Epic extends EpicSummary {
  children: EpicChild[];
  stories: StoryDetail[];
}

/** Re-export SagaWorkerMessage from @saga-ai/utils */
export type { SagaWorkerMessage } from '@saga-ai/utils';

/** Text message (from raw non-JSON log lines parsed by the dashboard) */
export interface TextMessage {
  type: 'text';
  content: string;
}

/**
 * Log message displayed in the LogViewer.
 * Combines SDK worker messages (from JSONL) with dashboard-specific text messages.
 */
export type LogMessage = TextMessage | SdkWorkerMessage;
