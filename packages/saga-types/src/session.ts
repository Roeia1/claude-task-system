import { z } from 'zod';

export const SessionStatusSchema = z.enum(['running', 'stopped', 'unknown']);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  name: z.string(),
  status: SessionStatusSchema,
  createdAt: z.string().optional(),
  epicSlug: z.string().optional(),
  storySlug: z.string().optional(),
});
export type Session = z.infer<typeof SessionSchema>;
