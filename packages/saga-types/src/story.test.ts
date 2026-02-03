import { describe, expect, it } from "vitest";
import {
	type Story,
	type StoryFrontmatter,
	StoryFrontmatterSchema,
	StorySchema,
	type StoryStatus,
	StoryStatusSchema,
	type Task,
	TaskSchema,
	type TaskStatus,
	TaskStatusSchema,
} from "./story.ts";

describe("StoryStatusSchema", () => {
	it("accepts valid status values", () => {
		const validStatuses: StoryStatus[] = [
			"ready",
			"in_progress",
			"blocked",
			"completed",
		];
		for (const status of validStatuses) {
			expect(StoryStatusSchema.parse(status)).toBe(status);
		}
	});

	it("rejects invalid status values", () => {
		expect(() => StoryStatusSchema.parse("invalid")).toThrow();
		expect(() => StoryStatusSchema.parse("in-progress")).toThrow(); // hyphen not valid
		expect(() => StoryStatusSchema.parse("draft")).toThrow(); // draft not a valid status
		expect(() => StoryStatusSchema.parse("")).toThrow();
		expect(() => StoryStatusSchema.parse(null)).toThrow();
	});
});

describe("TaskStatusSchema", () => {
	it("accepts valid task status values", () => {
		const validStatuses: TaskStatus[] = ["pending", "in_progress", "completed"];
		for (const status of validStatuses) {
			expect(TaskStatusSchema.parse(status)).toBe(status);
		}
	});

	it("rejects invalid task status values", () => {
		expect(() => TaskStatusSchema.parse("invalid")).toThrow();
		expect(() => TaskStatusSchema.parse("ready")).toThrow(); // ready is for stories, not tasks
		expect(() => TaskStatusSchema.parse("")).toThrow();
	});
});

describe("TaskSchema", () => {
	it("parses a valid task", () => {
		const task: Task = {
			id: "t1",
			title: "Implement feature",
			status: "pending",
		};
		expect(TaskSchema.parse(task)).toEqual(task);
	});

	it("parses task with in_progress status", () => {
		const task: Task = {
			id: "t2",
			title: "Write tests",
			status: "in_progress",
		};
		expect(TaskSchema.parse(task)).toEqual(task);
	});

	it("requires all fields", () => {
		expect(() => TaskSchema.parse({ id: "t1", title: "Test" })).toThrow(); // missing status
		expect(() => TaskSchema.parse({ id: "t1", status: "pending" })).toThrow(); // missing title
		expect(() =>
			TaskSchema.parse({ title: "Test", status: "pending" }),
		).toThrow(); // missing id
	});
});

describe("StoryFrontmatterSchema", () => {
	const validFrontmatter: StoryFrontmatter = {
		id: "test-story",
		title: "Test Story",
		status: "ready",
		epic: "my-epic",
		tasks: [{ id: "t1", title: "Task 1", status: "pending" }],
	};

	it("parses valid frontmatter", () => {
		expect(StoryFrontmatterSchema.parse(validFrontmatter)).toEqual(
			validFrontmatter,
		);
	});

	it("parses frontmatter with multiple tasks", () => {
		const frontmatter: StoryFrontmatter = {
			id: "complex-story",
			title: "Complex Story",
			status: "in_progress",
			epic: "my-epic",
			tasks: [
				{ id: "t1", title: "Task 1", status: "completed" },
				{ id: "t2", title: "Task 2", status: "in_progress" },
				{ id: "t3", title: "Task 3", status: "pending" },
			],
		};
		expect(StoryFrontmatterSchema.parse(frontmatter)).toEqual(frontmatter);
	});

	it("parses frontmatter with empty tasks array", () => {
		const frontmatter: StoryFrontmatter = {
			id: "empty-tasks",
			title: "Story with no tasks",
			status: "ready",
			epic: "my-epic",
			tasks: [],
		};
		expect(StoryFrontmatterSchema.parse(frontmatter)).toEqual(frontmatter);
	});

	it("requires all fields", () => {
		expect(() =>
			StoryFrontmatterSchema.parse({
				title: "Test",
				status: "ready",
				epic: "my-epic",
				tasks: [],
			}),
		).toThrow(); // missing id

		expect(() =>
			StoryFrontmatterSchema.parse({
				id: "test",
				status: "ready",
				epic: "my-epic",
				tasks: [],
			}),
		).toThrow(); // missing title

		expect(() =>
			StoryFrontmatterSchema.parse({
				id: "test",
				title: "Test",
				epic: "my-epic",
				tasks: [],
			}),
		).toThrow(); // missing status

		expect(() =>
			StoryFrontmatterSchema.parse({
				id: "test",
				title: "Test",
				status: "ready",
				tasks: [],
			}),
		).toThrow(); // missing epic

		expect(() =>
			StoryFrontmatterSchema.parse({
				id: "test",
				title: "Test",
				status: "ready",
				epic: "my-epic",
			}),
		).toThrow(); // missing tasks
	});
});

describe("StorySchema", () => {
	const validStory: Story = {
		slug: "test-story",
		path: ".saga/epics/my-epic/stories/test-story/story.md",
		frontmatter: {
			id: "test-story",
			title: "Test Story",
			status: "ready",
			epic: "my-epic",
			tasks: [{ id: "t1", title: "Task 1", status: "pending" }],
		},
		content: "## Context\n\nThis is the story content.",
	};

	it("parses a complete story", () => {
		expect(StorySchema.parse(validStory)).toEqual(validStory);
	});

	it("parses story with completed status", () => {
		const completedStory: Story = {
			...validStory,
			frontmatter: {
				...validStory.frontmatter,
				status: "completed",
				tasks: [{ id: "t1", title: "Task 1", status: "completed" }],
			},
		};
		expect(StorySchema.parse(completedStory)).toEqual(completedStory);
	});

	it("requires all fields", () => {
		expect(() =>
			StorySchema.parse({
				slug: "test",
				path: "/path",
				frontmatter: validStory.frontmatter,
				// missing content
			}),
		).toThrow();

		expect(() =>
			StorySchema.parse({
				slug: "test",
				path: "/path",
				content: "content",
				// missing frontmatter
			}),
		).toThrow();
	});
});
