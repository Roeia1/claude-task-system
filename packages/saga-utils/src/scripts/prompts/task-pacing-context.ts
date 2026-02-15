/**
 * Additional context returned to the agent after a task is marked completed.
 * Includes context usage guidance and max-tasks signaling.
 */
function buildTaskPacingContext(maxTasksReached: boolean): string {
  if (maxTasksReached) {
    return 'You have completed the maximum number of tasks for this session. Finish the session.';
  }

  return [
    'CONTEXT CHECK: Target 40-70% context utilization per session.',
    '- Assess the next task and decide whether to implement it based on remaining context. Aim to stay within the utilization window.',
    '- If you are above the context utilization window, commit, push, and finish the session.',
  ].join('\n');
}

export { buildTaskPacingContext };
