#!/usr/bin/env node

// src/scripts/auto-commit-hook.ts
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
function createAutoCommitHook(worktreePath, storyId) {
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
      process.stderr.write(`[worker] Auto-commit git error: ${errorMessage}
`);
    }
    return Promise.resolve({ continue: true });
  };
}
export {
  createAutoCommitHook
};
