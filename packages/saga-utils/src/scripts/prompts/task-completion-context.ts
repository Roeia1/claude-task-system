/**
 * Additional context returned to the agent after a task is marked completed.
 * Includes journal reminder and context usage guidance.
 */
function buildAdditionalContext(
  projectDir: string,
  storyId: string,
  taskId: string,
  maxTasksReached: boolean,
): string {
  const journalPath = `${projectDir}/.saga/stories/${storyId}/journal.md`;
  const lines = [
    `Task "${taskId}" completed. Changes committed and pushed.`,
    '',
    `REQUIRED: Write a journal entry to ${journalPath}:`,
    `## Session: ${new Date().toISOString()}`,
    `### Task: ${taskId}`,
    '**What was done:** ...',
    '**Decisions and deviations:** ...',
    '**Next steps:** ...',
  ];

  if (maxTasksReached) {
    lines.push(
      '',
      'You have completed the maximum number of tasks for this session. Finish the session after writing the journal entry.',
    );
  } else {
    lines.push(
      '',
      'CONTEXT CHECK: Target 40-70% context utilization per session.',
      '- Assess the next task and decide whether to implement it based on remaining context. Aim to stay within the utilization window.',
      '- If you are above the context utilization window, commit, push, and finish the session.',
    );
  }

  return lines.join('\n');
}

export { buildAdditionalContext };
