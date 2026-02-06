import { z } from 'zod';
import { TaskStatusSchema } from './task.ts';

/**
 * A Claude Code task -- mirrors the format used by Claude Code's native
 * TaskList / TaskGet / TaskUpdate tools.
 */
export const ClaudeCodeTaskSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  activeForm: z.string().optional(),
  status: TaskStatusSchema,
  owner: z.string().optional(),
  blocks: z.array(z.string()),
  blockedBy: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type ClaudeCodeTask = z.infer<typeof ClaudeCodeTaskSchema>;
