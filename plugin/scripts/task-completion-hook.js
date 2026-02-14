#!/usr/bin/env node

// src/scripts/task-completion-hook.ts
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

// src/directory.ts
import { join } from "node:path";
function normalizeRoot(projectRoot) {
  return projectRoot.endsWith("/") ? projectRoot.slice(0, -1) : projectRoot;
}
function createSagaPaths(projectRoot) {
  const root = normalizeRoot(projectRoot);
  const saga = `${root}/.saga`;
  return {
    root,
    saga,
    epics: `${saga}/epics`,
    stories: `${saga}/stories`,
    worktrees: `${saga}/worktrees`,
    archive: `${saga}/archive`
  };
}
function createStoryPaths(projectRoot, storyId) {
  const { stories } = createSagaPaths(projectRoot);
  const storyDir = `${stories}/${storyId}`;
  return {
    storyId,
    storyDir,
    storyJson: `${storyDir}/story.json`,
    journalMd: `${storyDir}/journal.md`
  };
}
function createTaskPath(projectRoot, storyId, taskId) {
  const { storyDir } = createStoryPaths(projectRoot, storyId);
  return join(storyDir, `${taskId}.json`);
}

// src/scripts/task-completion-hook.ts
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
function readTaskSubject(worktreePath, storyId, taskId) {
  try {
    const taskPath = createTaskPath(worktreePath, storyId, taskId);
    if (!existsSync(taskPath)) {
      return void 0;
    }
    const taskData = JSON.parse(readFileSync(taskPath, "utf-8"));
    return taskData.subject;
  } catch {
    return void 0;
  }
}
function buildAdditionalContext(storyId, taskId, subject) {
  const taskLabel = subject ? `${taskId} - ${subject}` : taskId;
  return [
    `Task "${taskLabel}" completed. Changes committed and pushed.`,
    "",
    `REQUIRED: Write a journal entry to .saga/stories/${storyId}/journal.md:`,
    `## Session: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    `### Task: ${taskLabel}`,
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
    const subject = readTaskSubject(worktreePath, storyId, taskId);
    const commitMessage = subject ? `feat(${storyId}): complete ${taskId} - ${subject}` : `feat(${storyId}): complete ${taskId}`;
    try {
      runGit(["add", "."], worktreePath);
      runGit(["commit", "-m", commitMessage], worktreePath);
      runGit(["push"], worktreePath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[worker] Task completion git error: ${errorMessage}
`);
    }
    const additionalContext = buildAdditionalContext(storyId, taskId, subject);
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
