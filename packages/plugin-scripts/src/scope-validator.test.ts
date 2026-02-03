import process from "node:process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	checkStoryAccess,
	getFilePathFromInput,
	isArchiveAccess,
	isWithinWorktree,
	normalizePath,
	validatePath,
} from "./scope-validator.ts";

describe("scope-validator", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe("isWithinWorktree", () => {
		it("should allow paths within the worktree", () => {
			expect(
				isWithinWorktree("/project/worktree/src/file.ts", "/project/worktree"),
			).toBe(true);
			expect(
				isWithinWorktree("/project/worktree/package.json", "/project/worktree"),
			).toBe(true);
			expect(
				isWithinWorktree(
					"/project/worktree/.saga/epics/test/story.md",
					"/project/worktree",
				),
			).toBe(true);
		});

		it("should block paths outside the worktree", () => {
			expect(
				isWithinWorktree("/other/project/file.ts", "/project/worktree"),
			).toBe(false);
			expect(isWithinWorktree("/project/file.ts", "/project/worktree")).toBe(
				false,
			);
			expect(isWithinWorktree("/etc/passwd", "/project/worktree")).toBe(false);
		});

		it("should block parent directory traversal", () => {
			expect(
				isWithinWorktree(
					"/project/worktree/../secret.txt",
					"/project/worktree",
				),
			).toBe(false);
			expect(
				isWithinWorktree(
					"/project/worktree/../../etc/passwd",
					"/project/worktree",
				),
			).toBe(false);
		});

		it("should allow the worktree root itself", () => {
			expect(isWithinWorktree("/project/worktree", "/project/worktree")).toBe(
				true,
			);
		});

		it("should handle relative paths by resolving them", () => {
			// Relative paths are resolved against cwd, so test with worktree as subdirectory
			const cwd = process.cwd();
			expect(isWithinWorktree(`${cwd}/subdir/file.ts`, cwd)).toBe(true);
			expect(isWithinWorktree("../outside.ts", cwd)).toBe(false);
		});
	});

	describe("file path extraction from hook input", () => {
		it("should extract file_path from Read tool input", () => {
			const input = JSON.stringify({
				tool_name: "Read",
				tool_input: { file_path: "/path/to/file.ts" },
			});
			expect(getFilePathFromInput(input)).toBe("/path/to/file.ts");
		});

		it("should extract path from Glob tool input", () => {
			const input = JSON.stringify({
				tool_name: "Glob",
				tool_input: { pattern: "**/*.ts", path: "/path/to/search" },
			});
			expect(getFilePathFromInput(input)).toBe("/path/to/search");
		});

		it("should prefer file_path over path", () => {
			const input = JSON.stringify({
				tool_name: "Read",
				tool_input: { file_path: "/first.ts", path: "/second.ts" },
			});
			expect(getFilePathFromInput(input)).toBe("/first.ts");
		});

		it("should return null for invalid JSON", () => {
			expect(getFilePathFromInput("not json")).toBeNull();
		});

		it("should return null if no path fields present", () => {
			const input = JSON.stringify({
				tool_name: "Bash",
				tool_input: { command: "echo hello" },
			});
			expect(getFilePathFromInput(input)).toBeNull();
		});

		it("should return null if tool_input is missing", () => {
			const input = JSON.stringify({ tool_name: "Read" });
			expect(getFilePathFromInput(input)).toBeNull();
		});
	});

	describe("normalizePath", () => {
		it("should remove leading ./", () => {
			expect(normalizePath("./path/to/file")).toBe("path/to/file");
		});

		it("should leave paths without ./ unchanged", () => {
			expect(normalizePath("path/to/file")).toBe("path/to/file");
			expect(normalizePath("/absolute/path")).toBe("/absolute/path");
		});
	});

	describe("isArchiveAccess", () => {
		it("should detect archive access", () => {
			expect(isArchiveAccess(".saga/archive/epic/story/file.md")).toBe(true);
			expect(isArchiveAccess("/project/.saga/archive/test")).toBe(true);
		});

		it("should allow non-archive paths", () => {
			expect(isArchiveAccess(".saga/epics/my-epic/story.md")).toBe(false);
			expect(isArchiveAccess("src/archive/file.ts")).toBe(false);
		});
	});

	describe("checkStoryAccess", () => {
		it("should allow access to assigned story", () => {
			expect(
				checkStoryAccess(
					".saga/epics/my-epic/stories/my-story/story.md",
					"my-epic",
					"my-story",
				),
			).toBe(true);
		});

		it("should block access to other stories in same epic", () => {
			expect(
				checkStoryAccess(
					".saga/epics/my-epic/stories/other-story/story.md",
					"my-epic",
					"my-story",
				),
			).toBe(false);
		});

		it("should block access to other epics", () => {
			expect(
				checkStoryAccess(
					".saga/epics/other-epic/stories/some-story/story.md",
					"my-epic",
					"my-story",
				),
			).toBe(false);
		});

		it("should allow access to epic-level files in same epic", () => {
			expect(
				checkStoryAccess(".saga/epics/my-epic/epic.md", "my-epic", "my-story"),
			).toBe(true);
		});

		it("should block access to other epics epic-level files", () => {
			expect(
				checkStoryAccess(
					".saga/epics/other-epic/epic.md",
					"my-epic",
					"my-story",
				),
			).toBe(false);
		});

		it("should allow access to non-saga paths", () => {
			expect(
				checkStoryAccess("src/components/Button.tsx", "my-epic", "my-story"),
			).toBe(true);
			expect(checkStoryAccess("package.json", "my-epic", "my-story")).toBe(
				true,
			);
		});

		it("should block access to epics folder with trailing slash (edge case)", () => {
			// Trailing slash creates empty path component after 'epics', which doesn't match allowed epic
			expect(checkStoryAccess(".saga/epics/", "my-epic", "my-story")).toBe(
				false,
			);
		});

		it("should allow access to paths not in .saga/epics/", () => {
			expect(checkStoryAccess(".saga/worktrees/", "my-epic", "my-story")).toBe(
				true,
			);
		});
	});

	describe("validatePath", () => {
		it("should allow valid paths within story scope", () => {
			expect(
				validatePath(
					"/project/worktree/src/file.ts",
					"/project/worktree",
					"my-epic",
					"my-story",
				),
			).toBeNull();
		});

		it("should block paths outside worktree", () => {
			const result = validatePath(
				"/other/project/file.ts",
				"/project/worktree",
				"my-epic",
				"my-story",
			);
			expect(result).toContain("Access outside worktree blocked");
		});

		it("should block archive access", () => {
			const result = validatePath(
				"/project/worktree/.saga/archive/old-story/file.md",
				"/project/worktree",
				"my-epic",
				"my-story",
			);
			expect(result).toContain("Access to archive folder blocked");
		});

		it("should block other story access", () => {
			const result = validatePath(
				"/project/worktree/.saga/epics/my-epic/stories/other-story/story.md",
				"/project/worktree",
				"my-epic",
				"my-story",
			);
			expect(result).toContain("Access to other story blocked");
		});
	});
});
