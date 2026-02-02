import { z } from 'zod';
import { StorySchema } from './story';

export const EpicFrontmatterSchema = z.object({
  title: z.string(),
  status: z.enum(['active', 'archived']).optional(),
});
export type EpicFrontmatter = z.infer<typeof EpicFrontmatterSchema>;

export const EpicSchema = z.object({
  slug: z.string(),
  path: z.string(),
  frontmatter: EpicFrontmatterSchema,
  content: z.string(),
  stories: z.array(StorySchema),
});
export type Epic = z.infer<typeof EpicSchema>;
