import { z } from "zod";

/**
 * Session status values.
 * - 'running': tmux session is active
 * - 'completed': tmux session has ended
 */
export const SessionStatusSchema = z.enum(["running", "completed"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Session information for SAGA worker sessions.
 *
 * Workers run in detached tmux sessions with names following the pattern:
 * `saga__<epic-slug>__<story-slug>__<pane-pid>` (double-underscore delimiters)
 */
export const SessionSchema = z.object({
	/** Unique session name (saga__<epic>__<story>__<pid>) */
	name: z.string(),
	/** Epic slug extracted from session name */
	epicSlug: z.string(),
	/** Story slug extracted from session name */
	storySlug: z.string(),
	/** Current session status */
	status: SessionStatusSchema,
	/** Path to the output file */
	outputFile: z.string(),
	/** Whether the output file exists and is readable */
	outputAvailable: z.boolean(),
	/** Session start time (ISO 8601 string) */
	startTime: z.string(),
	/** Session end time (ISO 8601 string), only present for completed sessions */
	endTime: z.string().optional(),
	/** Preview of the last lines of output */
	outputPreview: z.string().optional(),
});
export type Session = z.infer<typeof SessionSchema>;
