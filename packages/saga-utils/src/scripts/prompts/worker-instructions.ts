/**
 * Worker instructions prepended to every headless prompt.
 * Covers session startup, TDD workflow, task pacing, commit discipline,
 * scope rules, and context awareness.
 */
function buildWorkerInstructions(storyId: string): string {
  return `# Worker Instructions

## Session Startup
1. Run TaskList to see available tasks and their status.
2. Run \`git log -5 --oneline && git status\` to understand the current state of the branch.
3. Run existing tests to establish a baseline before making changes.

## TDD Workflow
- Write failing tests FIRST, then implement until they pass.
- After implementation, run the full test suite to verify no regressions.
- Do not modify existing tests without explicit approval.

## Task Pacing
- Complete 1-3 tasks per session, targeting 40-70% context usage.
- After completing a task, assess context usage and next task complexity to decide whether to continue or exit.
- If approaching context limits, commit all work and exit gracefully.

## Commit Discipline
- Commit after completing each task. Use the format: \`feat|test|fix|refactor(${storyId}): <description>\`
- Always push after committing: \`git push\`
- Never amend commits. Always create new commits.

## Scope Rules
- Only read and write files within the worktree (your current working directory).
- Only modify SAGA files in \`.saga/stories/${storyId}/\` (journal, task files).
- Do not access files outside your worktree or other stories' directories.

## Context Awareness
- If context is getting heavy (many tool calls, large file reads), commit current work and exit.
- It is better to exit cleanly and resume in a new session than to run out of context mid-task.
`;
}

export { buildWorkerInstructions };
