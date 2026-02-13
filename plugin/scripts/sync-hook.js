#!/usr/bin/env node

// src/scripts/sync-hook.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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

// src/scripts/sync-hook.ts
function createSyncHook(worktreePath, storyId) {
  return (_input, _toolUseID, _options) => {
    const hookInput = _input;
    const toolInput = hookInput.tool_input ?? {};
    const taskId = toolInput.taskId;
    const status = toolInput.status;
    if (taskId && status) {
      try {
        const taskPath = createTaskPath(worktreePath, storyId, taskId);
        if (existsSync(taskPath)) {
          const taskData = JSON.parse(readFileSync(taskPath, "utf-8"));
          taskData.status = status;
          writeFileSync(taskPath, JSON.stringify(taskData, null, 2));
        }
      } catch {
      }
    }
    return Promise.resolve({ continue: true });
  };
}
export {
  createSyncHook
};
