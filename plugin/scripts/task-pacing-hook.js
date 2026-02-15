#!/usr/bin/env node

// src/scripts/prompts/task-pacing-context.ts
function buildTaskPacingContext(maxTasksReached) {
  if (maxTasksReached) {
    return "You have completed the maximum number of tasks for this session. Finish the session.";
  }
  return [
    "CONTEXT CHECK: Target 40-70% context utilization per session.",
    "- Assess the next task and decide whether to implement it based on remaining context. Aim to stay within the utilization window.",
    "- If you are above the context utilization window, commit, push, and finish the session."
  ].join("\n");
}

// src/scripts/task-pacing-hook.ts
function createTaskPacingHook(_worktreePath, _storyId, maxTasksPerSession) {
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
    const additionalContext = buildTaskPacingContext(maxTasksReached);
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
