import { z } from 'zod';

/**
 * Story metadata stored as story.json in a flat .saga/stories/<story-id>/ folder.
 *
 * Status is NOT stored -- it is derived from task statuses at read time.
 * Tasks are separate files ({id}.json), not embedded in the story.
 */
export const StorySchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    epic: z.string().optional(),
    guidance: z.string().optional(),
    doneWhen: z.string().optional(),
    avoid: z.string().optional(),
    branch: z.string().optional(),
    pr: z.string().optional(),
    worktree: z.string().optional(),
  })
  .strict();
export type Story = z.infer<typeof StorySchema>;
