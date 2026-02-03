/**
 * Tests for output-parser.ts - worker output parsing and validation
 */

import { describe, expect, it } from "vitest";
import {
	extractStructuredOutputFromToolCall,
	formatAssistantContent,
	formatStreamLine,
	formatToolUsage,
	parseStreamingResult,
	processResultLine,
	validateAndExtractOutput,
	WORKER_OUTPUT_SCHEMA,
} from "./output-parser.ts";

const TEST_READ_OFFSET = 10;
const TEST_READ_LIMIT = 50;
const LONG_COMMAND_LENGTH = 150;
const LARGE_ARRAY_SIZE = 50;

describe("output-parser", () => {
	describe("WORKER_OUTPUT_SCHEMA", () => {
		it("defines status as required enum", () => {
			expect(WORKER_OUTPUT_SCHEMA.properties.status.enum).toEqual([
				"ONGOING",
				"FINISH",
				"BLOCKED",
			]);
		});

		it("defines summary as required string", () => {
			expect(WORKER_OUTPUT_SCHEMA.properties.summary.type).toBe("string");
			expect(WORKER_OUTPUT_SCHEMA.required).toContain("summary");
		});

		it("defines blocker as optional string or null", () => {
			expect(WORKER_OUTPUT_SCHEMA.properties.blocker.type).toEqual([
				"string",
				"null",
			]);
		});
	});

	describe("formatToolUsage", () => {
		it("formats Read tool with file path", () => {
			const result = formatToolUsage("Read", { file_path: "/path/to/file.ts" });
			expect(result).toBe("[Tool Used: Read] /path/to/file.ts");
		});

		it("formats Read tool with offset and limit", () => {
			const result = formatToolUsage("Read", {
				file_path: "/path/to/file.ts",
				offset: TEST_READ_OFFSET,
				limit: TEST_READ_LIMIT,
			});
			expect(result).toBe(
				`[Tool Used: Read] /path/to/file.ts (offset=${TEST_READ_OFFSET}, limit=${TEST_READ_LIMIT})`,
			);
		});

		it("formats Read tool with only offset", () => {
			const result = formatToolUsage("Read", {
				file_path: "/path/to/file.ts",
				offset: TEST_READ_OFFSET,
			});
			expect(result).toBe(
				`[Tool Used: Read] /path/to/file.ts (offset=${TEST_READ_OFFSET})`,
			);
		});

		it("formats Write tool with file path", () => {
			const result = formatToolUsage("Write", {
				file_path: "/path/to/file.ts",
			});
			expect(result).toBe("[Tool Used: Write] /path/to/file.ts");
		});

		it("formats Edit tool with file path", () => {
			const result = formatToolUsage("Edit", { file_path: "/path/to/file.ts" });
			expect(result).toBe("[Tool Used: Edit] /path/to/file.ts");
		});

		it("formats Edit tool with replace_all flag", () => {
			const result = formatToolUsage("Edit", {
				file_path: "/path/to/file.ts",
				replace_all: true,
			});
			expect(result).toBe("[Tool Used: Edit] /path/to/file.ts (replace_all)");
		});

		it("formats Bash tool with command", () => {
			const result = formatToolUsage("Bash", { command: "npm test" });
			expect(result).toBe("[Tool Used: Bash] npm test");
		});

		it("formats Bash tool with description", () => {
			const result = formatToolUsage("Bash", {
				command: "npm test",
				description: "Run test suite",
			});
			expect(result).toBe("[Tool Used: Bash] npm test - Run test suite");
		});

		it("truncates long Bash commands", () => {
			const longCommand = "a".repeat(LONG_COMMAND_LENGTH);
			const result = formatToolUsage("Bash", { command: longCommand });
			expect(result.length).toBeLessThan(LONG_COMMAND_LENGTH);
			expect(result).toContain("...");
		});

		it("formats Glob tool with pattern", () => {
			const result = formatToolUsage("Glob", { pattern: "**/*.ts" });
			expect(result).toBe("[Tool Used: Glob] **/*.ts");
		});

		it("formats Glob tool with pattern and path", () => {
			const result = formatToolUsage("Glob", {
				pattern: "**/*.ts",
				path: "/src",
			});
			expect(result).toBe("[Tool Used: Glob] **/*.ts in /src");
		});

		it("formats Grep tool with pattern", () => {
			const result = formatToolUsage("Grep", { pattern: "function" });
			expect(result).toBe('[Tool Used: Grep] "function"');
		});

		it("formats Grep tool with path and output mode", () => {
			const result = formatToolUsage("Grep", {
				pattern: "function",
				path: "/src",
				output_mode: "content",
			});
			expect(result).toBe('[Tool Used: Grep] "function" in /src (content)');
		});

		it("formats Task tool with description", () => {
			const result = formatToolUsage("Task", { description: "Find bugs" });
			expect(result).toBe("[Tool Used: Task] Find bugs");
		});

		it("formats Task tool with subagent type", () => {
			const result = formatToolUsage("Task", {
				description: "Find bugs",
				subagent_type: "Explore",
			});
			expect(result).toBe("[Tool Used: Task] [Explore] Find bugs");
		});

		it("formats Task tool falls back to prompt if no description", () => {
			const result = formatToolUsage("Task", { prompt: "Find all bugs" });
			expect(result).toBe("[Tool Used: Task] Find all bugs");
		});

		it("formats StructuredOutput tool with status", () => {
			const result = formatToolUsage("StructuredOutput", { status: "FINISH" });
			expect(result).toBe("[Tool Used: StructuredOutput] FINISH");
		});

		it("formats StructuredOutput tool with status and summary", () => {
			const result = formatToolUsage("StructuredOutput", {
				status: "FINISH",
				summary: "Task completed",
			});
			expect(result).toBe(
				"[Tool Used: StructuredOutput] FINISH - Task completed",
			);
		});

		it("formats unknown tools with all fields", () => {
			const result = formatToolUsage("CustomTool", {
				arg1: "value1",
				arg2: 42,
			});
			expect(result).toBe("[Tool Used: CustomTool] arg1=value1, arg2=42");
		});

		it("formats unknown tools with no input", () => {
			const result = formatToolUsage("CustomTool", {});
			expect(result).toBe("[Tool Used: CustomTool]");
		});

		it("handles null input gracefully", () => {
			const result = formatToolUsage(
				"Read",
				null as unknown as Record<string, unknown>,
			);
			expect(result).toBe("[Tool Used: Read] unknown");
		});

		it("handles undefined input gracefully", () => {
			const result = formatToolUsage(
				"Read",
				undefined as unknown as Record<string, unknown>,
			);
			expect(result).toBe("[Tool Used: Read] unknown");
		});

		it("formats TodoWrite with subjects", () => {
			const result = formatToolUsage("TodoWrite", {
				todos: [{ subject: "Task 1" }, { subject: "Task 2" }],
			});
			expect(result).toBe("[Tool Used: TodoWrite] Task 1, Task 2");
		});

		it("formats TodoWrite with empty todos array", () => {
			const result = formatToolUsage("TodoWrite", { todos: [] });
			expect(result).toBe("[Tool Used: TodoWrite]");
		});

		it("truncates arrays in unknown tools", () => {
			const longArray = new Array(LARGE_ARRAY_SIZE).fill("item");
			const result = formatToolUsage("CustomTool", { items: longArray });
			expect(result).toContain("...");
		});

		it("handles boolean values in unknown tools", () => {
			const result = formatToolUsage("CustomTool", { enabled: true });
			expect(result).toBe("[Tool Used: CustomTool] enabled=true");
		});

		it("handles multiline strings by replacing newlines", () => {
			const result = formatToolUsage("CustomTool", {
				text: "line1\nline2\nline3",
			});
			expect(result).not.toContain("\n");
			expect(result).toContain("line1");
		});
	});

	describe("formatAssistantContent", () => {
		it("formats text content blocks", () => {
			const content = [{ type: "text", text: "Hello world" }];
			const result = formatAssistantContent(content);
			expect(result).toBe("Hello world\n");
		});

		it("formats tool_use content blocks", () => {
			const content = [
				{ type: "tool_use", name: "Read", input: { file_path: "/test.ts" } },
			];
			const result = formatAssistantContent(content);
			expect(result).toBe("[Tool Used: Read] /test.ts\n");
		});

		it("returns first matching block", () => {
			const content = [
				{ type: "text", text: "First" },
				{ type: "text", text: "Second" },
			];
			const result = formatAssistantContent(content);
			expect(result).toBe("First\n");
		});

		it("returns null for empty array", () => {
			const result = formatAssistantContent([]);
			expect(result).toBeNull();
		});

		it("returns null for null input", () => {
			const result = formatAssistantContent(null as unknown as unknown[]);
			expect(result).toBeNull();
		});

		it("skips non-object blocks", () => {
			const content = ["string", null, { type: "text", text: "Valid" }];
			const result = formatAssistantContent(content);
			expect(result).toBe("Valid\n");
		});

		it("handles malformed blocks gracefully", () => {
			const content = [{ type: "unknown" }, { type: "text", text: "Found" }];
			const result = formatAssistantContent(content);
			expect(result).toBe("Found\n");
		});
	});

	describe("formatStreamLine", () => {
		it("formats assistant messages with content", () => {
			const line = JSON.stringify({
				type: "assistant",
				message: { content: [{ type: "text", text: "Working" }] },
			});
			const result = formatStreamLine(line);
			expect(result).toBe("Working\n");
		});

		it("formats system init messages", () => {
			const line = JSON.stringify({
				type: "system",
				subtype: "init",
				session_id: "session-123",
			});
			const result = formatStreamLine(line);
			expect(result).toBe("[Session started: session-123]");
		});

		it("formats successful result messages", () => {
			const line = JSON.stringify({
				type: "result",
				subtype: "success",
				duration_ms: 5000,
			});
			const result = formatStreamLine(line);
			expect(result).toBe("\n[Worker completed in 5s]");
		});

		it("formats failed result messages", () => {
			const line = JSON.stringify({
				type: "result",
				subtype: "error",
				duration_ms: 3000,
			});
			const result = formatStreamLine(line);
			expect(result).toBe("\n[Worker failed in 3s]");
		});

		it("returns null for unknown message types", () => {
			const line = JSON.stringify({ type: "unknown", data: "test" });
			const result = formatStreamLine(line);
			expect(result).toBeNull();
		});

		it("returns null for invalid JSON", () => {
			const result = formatStreamLine("not json");
			expect(result).toBeNull();
		});

		it("returns null for empty line", () => {
			const result = formatStreamLine("");
			expect(result).toBeNull();
		});
	});

	describe("extractStructuredOutputFromToolCall", () => {
		it("extracts StructuredOutput from assistant message", () => {
			const lines = [
				JSON.stringify({
					type: "assistant",
					message: {
						content: [
							{
								type: "tool_use",
								name: "StructuredOutput",
								input: { status: "FINISH", summary: "Done" },
							},
						],
					},
				}),
			];
			const result = extractStructuredOutputFromToolCall(lines);
			expect(result).toEqual({ status: "FINISH", summary: "Done" });
		});

		it("returns most recent StructuredOutput when multiple exist", () => {
			const lines = [
				JSON.stringify({
					type: "assistant",
					message: {
						content: [
							{
								type: "tool_use",
								name: "StructuredOutput",
								input: { status: "ONGOING", summary: "First" },
							},
						],
					},
				}),
				JSON.stringify({
					type: "assistant",
					message: {
						content: [
							{
								type: "tool_use",
								name: "StructuredOutput",
								input: { status: "FINISH", summary: "Last" },
							},
						],
					},
				}),
			];
			const result = extractStructuredOutputFromToolCall(lines);
			expect(result).toEqual({ status: "FINISH", summary: "Last" });
		});

		it("returns null when no StructuredOutput found", () => {
			const lines = [
				JSON.stringify({
					type: "assistant",
					message: {
						content: [{ type: "text", text: "Hello" }],
					},
				}),
			];
			const result = extractStructuredOutputFromToolCall(lines);
			expect(result).toBeNull();
		});

		it("returns null for empty array", () => {
			const result = extractStructuredOutputFromToolCall([]);
			expect(result).toBeNull();
		});

		it("skips invalid JSON lines", () => {
			const lines = [
				"invalid json",
				JSON.stringify({
					type: "assistant",
					message: {
						content: [
							{
								type: "tool_use",
								name: "StructuredOutput",
								input: { status: "FINISH", summary: "Found" },
							},
						],
					},
				}),
			];
			const result = extractStructuredOutputFromToolCall(lines);
			expect(result).toEqual({ status: "FINISH", summary: "Found" });
		});

		it("skips non-assistant messages", () => {
			const lines = [
				JSON.stringify({
					type: "system",
					message: {
						content: [
							{
								type: "tool_use",
								name: "StructuredOutput",
								input: { status: "FINISH", summary: "System" },
							},
						],
					},
				}),
			];
			const result = extractStructuredOutputFromToolCall(lines);
			expect(result).toBeNull();
		});
	});

	describe("validateAndExtractOutput", () => {
		it("extracts valid FINISH output", () => {
			const output = {
				status: "FINISH",
				summary: "Task completed",
				blocker: null,
			};
			const result = validateAndExtractOutput(output);
			expect(result).toEqual({
				status: "FINISH",
				summary: "Task completed",
				blocker: null,
			});
		});

		it("extracts valid ONGOING output", () => {
			const output = { status: "ONGOING", summary: "Making progress" };
			const result = validateAndExtractOutput(output);
			expect(result.status).toBe("ONGOING");
			expect(result.blocker).toBeNull();
		});

		it("extracts valid BLOCKED output with blocker", () => {
			const output = {
				status: "BLOCKED",
				summary: "Need help",
				blocker: "API key required",
			};
			const result = validateAndExtractOutput(output);
			expect(result).toEqual({
				status: "BLOCKED",
				summary: "Need help",
				blocker: "API key required",
			});
		});

		it("throws for invalid status", () => {
			const output = { status: "INVALID", summary: "Test" };
			expect(() => validateAndExtractOutput(output)).toThrow(
				"Invalid status: INVALID",
			);
		});

		it("handles missing summary", () => {
			const output = { status: "FINISH" };
			const result = validateAndExtractOutput(output);
			expect(result.summary).toBe("");
		});

		it("handles undefined blocker", () => {
			const output = { status: "FINISH", summary: "Done" };
			const result = validateAndExtractOutput(output);
			expect(result.blocker).toBeNull();
		});
	});

	describe("processResultLine", () => {
		it("extracts output from structured_output field", () => {
			const data = {
				type: "result",
				subtype: "success",
				structured_output: { status: "FINISH", summary: "Done" },
			};
			const result = processResultLine(data, []);
			expect(result.status).toBe("FINISH");
		});

		it("falls back to tool call when structured_output missing", () => {
			const data = { type: "result", subtype: "success" };
			const lines = [
				JSON.stringify({
					type: "assistant",
					message: {
						content: [
							{
								type: "tool_use",
								name: "StructuredOutput",
								input: { status: "FINISH", summary: "From tool" },
							},
						],
					},
				}),
			];
			const result = processResultLine(data, lines);
			expect(result.summary).toBe("From tool");
		});

		it("throws for error results", () => {
			const data = { is_error: true, result: "Something went wrong" };
			expect(() => processResultLine(data, [])).toThrow(
				"Worker failed: Something went wrong",
			);
		});

		it("throws when no output found", () => {
			const data = { type: "result", subtype: "success" };
			expect(() => processResultLine(data, [])).toThrow(
				"Worker result missing structured_output",
			);
		});
	});

	describe("parseStreamingResult", () => {
		it("parses complete streaming output", () => {
			const buffer = [
				JSON.stringify({ type: "system", subtype: "init", session_id: "test" }),
				JSON.stringify({
					type: "assistant",
					message: { content: [{ type: "text", text: "Working" }] },
				}),
				JSON.stringify({
					type: "result",
					subtype: "success",
					duration_ms: 1000,
					structured_output: { status: "FINISH", summary: "All done" },
				}),
			].join("\n");

			const result = parseStreamingResult(buffer);
			expect(result.status).toBe("FINISH");
			expect(result.summary).toBe("All done");
		});

		it("finds result line anywhere in buffer", () => {
			const buffer = [
				JSON.stringify({ type: "other", data: "ignored" }),
				JSON.stringify({
					type: "result",
					subtype: "success",
					structured_output: { status: "ONGOING", summary: "Progress" },
				}),
				JSON.stringify({ type: "other", data: "after" }),
			].join("\n");

			// Should find result even if not last line (searches backwards)
			const result = parseStreamingResult(buffer);
			expect(result.status).toBe("ONGOING");
		});

		it("throws when no result line found", () => {
			const buffer = [
				JSON.stringify({ type: "system", subtype: "init" }),
				JSON.stringify({ type: "assistant", message: { content: [] } }),
			].join("\n");

			expect(() => parseStreamingResult(buffer)).toThrow(
				"No result found in worker output",
			);
		});

		it("handles empty buffer", () => {
			expect(() => parseStreamingResult("")).toThrow(
				"No result found in worker output",
			);
		});

		it("handles buffer with only whitespace", () => {
			expect(() => parseStreamingResult("   \n   \n   ")).toThrow(
				"No result found in worker output",
			);
		});

		it("propagates worker error messages", () => {
			const buffer = JSON.stringify({
				type: "result",
				subtype: "error",
				is_error: true,
				result: "API rate limit exceeded",
			});

			expect(() => parseStreamingResult(buffer)).toThrow(
				"Worker failed: API rate limit exceeded",
			);
		});
	});
});
