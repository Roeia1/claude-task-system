#!/usr/bin/env node

// src/scripts/prompts/task-completion-context.ts
function buildAdditionalContext(projectDir, storyId, taskId, maxTasksReached) {
  const journalPath = `${projectDir}/.saga/stories/${storyId}/journal.md`;
  const lines = [
    `Task "${taskId}" completed. Changes committed and pushed.`,
    "",
    `REQUIRED: Write a journal entry to ${journalPath}:`,
    `## Session: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    `### Task: ${taskId}`,
    "**What was done:** ...",
    "**Decisions and deviations:** ...",
    "**Next steps:** ..."
  ];
  if (maxTasksReached) {
    lines.push(
      "",
      "You have completed the maximum number of tasks for this session. Finish the session after writing the journal entry."
    );
  } else {
    lines.push(
      "",
      "CONTEXT CHECK: Target 40-70% context utilization per session.",
      "- Assess the next task and decide whether to implement it based on remaining context. Aim to stay within the utilization window.",
      "- If you are above the context utilization window, commit, push, and finish the session."
    );
  }
  return lines.join("\n");
}

// src/scripts/task-pacing-hook.ts
function createTaskPacingHook(worktreePath, storyId, maxTasksPerSession) {
  let completedCount = 0;
  return (_input, _toolUseID, _options) => {
    const hookInput = _input;
    const toolInput = hookInput.tool_input ?? {};
    const taskId = toolInput.taskId;
    const status = toolInput.status;
    if (!(taskId && status) || status !== "completed") {
      return Promise.resolve({ continue: true });
    }
    completedCount++;
    const maxTasksReached = completedCount >= maxTasksPerSession;
    const additionalContext = buildAdditionalContext(
      worktreePath,
      storyId,
      taskId,
      maxTasksReached
    );
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
  createTaskPacingHook
};
