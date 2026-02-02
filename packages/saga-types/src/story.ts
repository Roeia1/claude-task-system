import { z } from 'zod';

export const StoryStatusSchema = z.enum(['draft', 'ready', 'in-progress', 'blocked', 'completed']);
export type StoryStatus = z.infer<typeof StoryStatusSchema>;

export const StoryFrontmatterSchema = z.object({
  title: z.string(),
  status: StoryStatusSchema,
  priority: z.number().min(1).max(5).optional(),
  dependencies: z.array(z.string()).optional(),
  estimate: z.string().optional(),
});
export type StoryFrontmatter = z.infer<typeof StoryFrontmatterSchema>;

export const StorySchema = z.object({
  slug: z.string(),
  path: z.string(),
  frontmatter: StoryFrontmatterSchema,
  content: z.string(),
});
export type Story = z.infer<typeof StorySchema>;
