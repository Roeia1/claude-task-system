import { z } from "zod";

/**
 * Story status values as they appear in YAML frontmatter.
 * Note: Uses snake_case ('in_progress') to match the actual file format.
 */
export const StoryStatusSchema = z.enum([
	"ready",
	"in_progress",
	"blocked",
	"completed",
]);
export type StoryStatus = z.infer<typeof StoryStatusSchema>;

/**
 * Task status values for story tasks.
 * Note: Uses snake_case ('in_progress') to match the actual file format.
 */
export const TaskStatusSchema = z.enum(["pending", "in_progress", "completed"]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/**
 * Task within a story's frontmatter.
 */
export const TaskSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: TaskStatusSchema,
});
export type Task = z.infer<typeof TaskSchema>;

/**
 * Story frontmatter as parsed from YAML.
 * This represents the raw YAML structure in story.md files.
 */
export const StoryFrontmatterSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: StoryStatusSchema,
	epic: z.string(),
	tasks: z.array(TaskSchema),
});
export type StoryFrontmatter = z.infer<typeof StoryFrontmatterSchema>;

/**
 * Complete story structure including parsed frontmatter and content.
 */
export const StorySchema = z.object({
	slug: z.string(),
	path: z.string(),
	frontmatter: StoryFrontmatterSchema,
	content: z.string(),
});
export type Story = z.infer<typeof StorySchema>;
