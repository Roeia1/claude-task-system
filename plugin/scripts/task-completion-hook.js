#!/usr/bin/env node

// src/scripts/task-completion-hook.ts
import { execFileSync } from "node:child_process";
import process from "node:process";
function runGit(args, cwd) {
  try {
    const output = execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    const execError = error;
    const stderr = execError.stderr?.toString().trim() || execError.message || String(error);
    return { success: false, output: stderr };
  }
}
function buildAdditionalContext(storyId, taskId) {
  return [
    `Task "${taskId}" completed. Changes committed and pushed.`,
    "",
    `REQUIRED: Write a journal entry to .saga/stories/${storyId}/journal.md:`,
    `## Session: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    `### Task: ${taskId}`,
    "**What was done:** ...",
    "**Decisions:** ...",
    "**Next steps:** ...",
    "",
    "CONTEXT CHECK: Target 40-70% context utilization per session.",
    "- If you have capacity, pick up the next unblocked task from TaskList.",
    "- If context is getting heavy, commit any remaining work and exit."
  ].join("\n");
}
function createTaskCompletionHook(worktreePath, storyId) {
  return (_input, _toolUseID, _options) => {
    const hookInput = _input;
    const toolInput = hookInput.tool_input ?? {};
    const taskId = toolInput.taskId;
    const status = toolInput.status;
    if (!(taskId && status) || status !== "completed") {
      return Promise.resolve({ continue: true });
    }
    const commitMessage = `feat(${storyId}): complete ${taskId}`;
    try {
      runGit(["add", "."], worktreePath);
      runGit(["commit", "-m", commitMessage], worktreePath);
      runGit(["push"], worktreePath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[worker] Task completion git error: ${errorMessage}
`);
    }
    const additionalContext = buildAdditionalContext(storyId, taskId);
    return Promise.resolve({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext
      }
    });
  };
}
export {
  createTaskCompletionHook
};
