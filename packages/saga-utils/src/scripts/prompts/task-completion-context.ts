/**
 * Additional context returned to the agent after a task is marked completed.
 * Includes journal reminder and context usage guidance.
 */
function buildAdditionalContext(storyId: string, taskId: string): string {
  return [
    `Task "${taskId}" completed. Changes committed and pushed.`,
    '',
    `REQUIRED: Write a journal entry to .saga/stories/${storyId}/journal.md:`,
    `## Session: ${new Date().toISOString()}`,
    `### Task: ${taskId}`,
    '**What was done:** ...',
    '**Decisions:** ...',
    '**Next steps:** ...',
    '',
    'CONTEXT CHECK: Target 40-70% context utilization per session.',
    '- If you have capacity, pick up the next unblocked task from TaskList.',
    '- If context is getting heavy, commit any remaining work and exit.',
  ].join('\n');
}

export { buildAdditionalContext };
