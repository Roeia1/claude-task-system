import { z } from 'zod';

/**
 * A child story reference within an epic.
 * Each child has an id and a list of story IDs it is blocked by.
 */
export const EpicChildSchema = z
  .object({
    id: z.string(),
    blockedBy: z.array(z.string()),
  })
  .strict();
export type EpicChild = z.infer<typeof EpicChildSchema>;

/**
 * Epic structure for JSON-based storage.
 *
 * Stored as a single file at `.saga/epics/<id>.json`.
 * Status is derived from child story statuses at read time -- not stored.
 */
export const EpicSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    children: z.array(EpicChildSchema),
  })
  .strict();
export type Epic = z.infer<typeof EpicSchema>;
