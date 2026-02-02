/**
 * Dashboard data model types
 * These match the API responses from the backend server
 */

// Re-export session types from @saga-ai/types
// Session type matches the API response format with string dates
export type { Session as SessionInfo, SessionStatus } from '@saga-ai/types/session.ts';

/** Task status values (camelCase for API response format) */
export type TaskStatus = 'pending' | 'inProgress' | 'completed';

/** Story status values (camelCase for API response format) */
export type StoryStatus = 'ready' | 'inProgress' | 'blocked' | 'completed';

/** Journal entry types */
export type JournalEntryType = "session" | "blocker" | "resolution";

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
	journal?: JournalEntry[];
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
