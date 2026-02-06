import { z } from 'zod';

/**
 * Task status values.
 * Uses snake_case ('in_progress') to match the storage format.
 */
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/**
 * A SAGA task -- an atomic work item stored as {id}.json in a story folder.
 */
export const TaskSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  activeForm: z.string().optional(),
  status: TaskStatusSchema,
  blockedBy: z.array(z.string()),
  guidance: z.string().optional(),
  doneWhen: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

/**
 * Validates story IDs: lowercase alphanumeric with hyphens only.
 */
export const StoryIdSchema = z.string().regex(/^[a-z0-9-]+$/);
