/**
 * Dashboard data model types
 * These match the API responses from the backend server
 */

import type { SagaWorkerMessage } from '@saga-ai/types';

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

/** Re-export SagaWorkerMessage from @saga-ai/types */
export type { SagaWorkerMessage } from '@saga-ai/types';

/** Text message (from raw non-JSON log lines) */
export interface TextMessage {
  type: 'text';
  content: string;
}

/** SDK assistant message (simplified for display) */
export interface AssistantMessage {
  type: 'assistant';
  message?: { content?: unknown; [key: string]: unknown };
  content?: string;
}

/** SDK result message (simplified for display) */
export interface ResultMessage {
  type: 'result';
  subtype?: string;
  result?: string;
}

/** Worker message from JSONL log output */
export type WorkerMessage = TextMessage | SagaWorkerMessage | AssistantMessage | ResultMessage;
