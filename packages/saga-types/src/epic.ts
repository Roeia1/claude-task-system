import { z } from 'zod';
import { StorySchema } from './story';

/**
 * Story counts by status for epic summaries.
 */
export const StoryCountsSchema = z.object({
  total: z.number(),
  ready: z.number(),
  inProgress: z.number(),
  blocked: z.number(),
  completed: z.number(),
});
export type StoryCounts = z.infer<typeof StoryCountsSchema>;

/**
 * Epic structure representing parsed epic.md data.
 *
 * Note: Epics don't have YAML frontmatter. The title is extracted from
 * the first `# Heading` in the markdown content. Archived status is
 * determined by whether the epic is in `.saga/archive/` directory.
 */
export const EpicSchema = z.object({
  slug: z.string(),
  path: z.string(),
  title: z.string(),
  content: z.string(),
  storyCounts: StoryCountsSchema,
  stories: z.array(StorySchema),
  archived: z.boolean().optional(),
});
export type Epic = z.infer<typeof EpicSchema>;
