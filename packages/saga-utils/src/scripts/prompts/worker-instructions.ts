import { createStoryPaths } from '../../directory.ts';

/**
 * Worker instructions prepended to every headless prompt.
 * Covers session startup, TDD workflow, context management,
 * and scope rules.
 */
function buildWorkerInstructions(storyId: string, projectDir: string): string {
  const { journalMd, storyDir } = createStoryPaths(projectDir, storyId);
  return `# Worker Instructions

## Session Startup
1. Run TaskList to see available tasks and their status.
2. Run \`git log -5 --oneline && git status\` to understand the current state of the branch.
3. Read the last entries of the journal at \`${journalMd}\` to understand what was done in previous sessions.
4. Run existing tests to establish a baseline before making changes.

## TDD Workflow
- Write failing tests FIRST, then implement until they pass.
- After implementation, run the full test suite to verify no regressions.

## Journal Writing
- After completing each task's implementation and before marking the task as completed, write a journal entry to \`${journalMd}\`.
- Each entry must include:
  - \`## Session: <ISO timestamp>\`
  - \`### Task: <taskId>\`
  - \`**What was done:**\` summary of implementation
  - \`**Key decisions and deviations:**\` any notable choices or deviations from the plan
  - \`**Next steps:**\` what should happen next

## Context Management
- Target 40-70% context utilization per session.
- After completing a task, assess the next task's complexity against remaining context to decide whether to continue or exit.
- If you are above the context utilization window, commit current work and exit. It is better to exit cleanly and resume in a new session than to run out of context mid-task.

## Scope Rules
- Only read and write files within the worktree (your current working directory).
- Only modify SAGA files in \`${storyDir}/\` (journal, task files).
- Do not access files outside your worktree or other stories' directories.
`;
}

export { buildWorkerInstructions };
