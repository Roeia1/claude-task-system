/**
 * Tests for session-manager.ts - tmux session management
 */

import { describe, expect, it } from "vitest";
import {
	buildDetachedCommand,
	shellEscape,
	shellEscapeArgs,
	validateSlug,
} from "./session-manager.ts";

describe("session-manager", () => {
	describe("shellEscape", () => {
		it("wraps simple strings in single quotes", () => {
			const result = shellEscape("hello");
			expect(result).toBe("'hello'");
		});

		it("handles empty string", () => {
			const result = shellEscape("");
			expect(result).toBe("''");
		});

		it("escapes embedded single quotes", () => {
			const result = shellEscape("hello 'world'");
			expect(result).toBe("'hello '\\''world'\\'''");
		});

		it("handles strings with spaces", () => {
			const result = shellEscape("hello world");
			expect(result).toBe("'hello world'");
		});

		it("handles strings with special shell characters", () => {
			const result = shellEscape("$HOME && rm -rf /");
			expect(result).toBe("'$HOME && rm -rf /'");
		});

		it("handles strings with double quotes", () => {
			const result = shellEscape('say "hello"');
			expect(result).toBe("'say \"hello\"'");
		});

		it("handles strings with newlines", () => {
			const result = shellEscape("line1\nline2");
			expect(result).toBe("'line1\nline2'");
		});

		it("handles strings with semicolons", () => {
			const result = shellEscape("cmd1; cmd2");
			expect(result).toBe("'cmd1; cmd2'");
		});

		it("handles strings with pipe character", () => {
			const result = shellEscape("cat file | grep pattern");
			expect(result).toBe("'cat file | grep pattern'");
		});

		it("handles strings with backticks", () => {
			const result = shellEscape("echo `whoami`");
			expect(result).toBe("'echo `whoami`'");
		});

		it("handles multiple single quotes", () => {
			const result = shellEscape("it's a 'test'");
			expect(result).toBe("'it'\\''s a '\\''test'\\'''");
		});
	});

	describe("shellEscapeArgs", () => {
		it("escapes and joins multiple arguments", () => {
			const result = shellEscapeArgs(["echo", "hello", "world"]);
			expect(result).toBe("'echo' 'hello' 'world'");
		});

		it("handles empty array", () => {
			const result = shellEscapeArgs([]);
			expect(result).toBe("");
		});

		it("handles single argument", () => {
			const result = shellEscapeArgs(["test"]);
			expect(result).toBe("'test'");
		});

		it("escapes arguments with special characters", () => {
			const result = shellEscapeArgs(["echo", "hello 'world'"]);
			expect(result).toBe("'echo' 'hello '\\''world'\\'''");
		});

		it("handles arguments with spaces", () => {
			const result = shellEscapeArgs(["cmd", "arg with spaces", "another arg"]);
			expect(result).toBe("'cmd' 'arg with spaces' 'another arg'");
		});
	});

	const NUMERIC_INPUT_FOR_SLUG = 123;

	describe("validateSlug", () => {
		it("accepts valid lowercase slug", () => {
			expect(validateSlug("my-story")).toBe(true);
		});

		it("accepts slug with numbers", () => {
			expect(validateSlug("story-123")).toBe(true);
		});

		it("accepts single character slug", () => {
			expect(validateSlug("a")).toBe(true);
		});

		it("accepts numbers only slug", () => {
			expect(validateSlug("123")).toBe(true);
		});

		it("accepts slug with consecutive hyphens in middle", () => {
			expect(validateSlug("my--story")).toBe(true);
		});

		it("rejects empty string", () => {
			expect(validateSlug("")).toBe(false);
		});

		it("rejects null", () => {
			expect(validateSlug(null)).toBe(false);
		});

		it("rejects undefined", () => {
			expect(validateSlug(undefined)).toBe(false);
		});

		it("rejects non-string values", () => {
			expect(validateSlug(NUMERIC_INPUT_FOR_SLUG)).toBe(false);
			expect(validateSlug({})).toBe(false);
			expect(validateSlug([])).toBe(false);
		});

		it("rejects uppercase letters", () => {
			expect(validateSlug("MyStory")).toBe(false);
		});

		it("rejects underscores", () => {
			expect(validateSlug("my_story")).toBe(false);
		});

		it("rejects spaces", () => {
			expect(validateSlug("my story")).toBe(false);
		});

		it("rejects special characters", () => {
			expect(validateSlug("my.story")).toBe(false);
			expect(validateSlug("my@story")).toBe(false);
			expect(validateSlug("my!story")).toBe(false);
		});

		it("rejects slug starting with hyphen", () => {
			expect(validateSlug("-my-story")).toBe(false);
		});

		it("rejects slug ending with hyphen", () => {
			expect(validateSlug("my-story-")).toBe(false);
		});

		it("rejects slug with only hyphen", () => {
			expect(validateSlug("-")).toBe(false);
		});

		it("rejects slug with hyphens at both ends", () => {
			expect(validateSlug("-my-story-")).toBe(false);
		});
	});

	describe("buildDetachedCommand", () => {
		it("builds basic command with required args", () => {
			const result = buildDetachedCommand("my-story", "/plugin", {});
			expect(result).toBe("'node' '/plugin/scripts/implement.js' 'my-story'");
		});

		it("includes max-cycles option", () => {
			const result = buildDetachedCommand("my-story", "/plugin", {
				maxCycles: 5,
			});
			expect(result).toContain("'--max-cycles' '5'");
		});

		it("includes max-time option", () => {
			const result = buildDetachedCommand("my-story", "/plugin", {
				maxTime: 30,
			});
			expect(result).toContain("'--max-time' '30'");
		});

		it("includes model option", () => {
			const result = buildDetachedCommand("my-story", "/plugin", {
				model: "sonnet",
			});
			expect(result).toContain("'--model' 'sonnet'");
		});

		it("includes all options together", () => {
			const result = buildDetachedCommand("my-story", "/plugin", {
				maxCycles: 10,
				maxTime: 60,
				model: "opus",
			});
			expect(result).toContain("'--max-cycles' '10'");
			expect(result).toContain("'--max-time' '60'");
			expect(result).toContain("'--model' 'opus'");
		});

		it("properly escapes plugin root path with spaces", () => {
			const result = buildDetachedCommand(
				"my-story",
				"/path/with spaces/plugin",
				{},
			);
			expect(result).toContain(
				"'/path/with spaces/plugin/scripts/implement.js'",
			);
		});

		it("properly escapes story slug (even though slugs are validated)", () => {
			const result = buildDetachedCommand("my-story", "/plugin", {});
			expect(result).toContain("'my-story'");
		});

		it("handles zero values for options", () => {
			const result = buildDetachedCommand("my-story", "/plugin", {
				maxCycles: 0,
				maxTime: 0,
			});
			expect(result).toContain("'--max-cycles' '0'");
			expect(result).toContain("'--max-time' '0'");
		});

		it("omits undefined options", () => {
			const result = buildDetachedCommand("my-story", "/plugin", {
				maxCycles: undefined,
				maxTime: undefined,
				model: undefined,
			});
			expect(result).not.toContain("--max-cycles");
			expect(result).not.toContain("--max-time");
			expect(result).not.toContain("--model");
		});
	});
});
