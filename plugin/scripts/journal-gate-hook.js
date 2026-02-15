#!/usr/bin/env node

// src/scripts/journal-gate-hook.ts
import { execFileSync } from "node:child_process";

// src/directory.ts
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

// src/scripts/journal-gate-hook.ts
function createJournalGateHook(worktreePath, storyId) {
  const { journalMd } = createStoryPaths(worktreePath, storyId);
  return (_input, _toolUseID, _options) => {
    const hookInput = _input;
    const toolInput = hookInput.tool_input ?? {};
    const status = toolInput.status;
    if (status !== "completed") {
      return Promise.resolve({ continue: true });
    }
    try {
      const output = execFileSync("git", ["status", "--porcelain", "--", journalMd], {
        cwd: worktreePath,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      if (output.trim().length > 0) {
        return Promise.resolve({ continue: true });
      }
      return Promise.resolve({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `Write a journal entry to ${journalMd} before marking the task as completed.`
        }
      });
    } catch {
      return Promise.resolve({ continue: true });
    }
  };
}
export {
  createJournalGateHook
};
