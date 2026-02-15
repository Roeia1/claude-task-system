#!/usr/bin/env node

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
    const taskId = toolInput.taskId;
    if (status !== "completed") {
      return Promise.resolve({ continue: true });
    }
    return Promise.resolve({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `Reminder: if you haven't already, write a journal entry to ${journalMd} with the structure instructed earlier for the "${taskId}" completed task.`
      }
    });
  };
}
export {
  createJournalGateHook
};
