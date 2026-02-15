/**
 * Additional context returned to the agent after a task is marked completed.
 * Includes context usage guidance and max-tasks signaling.
 */
function buildTaskPacingContext(taskId: string, maxTasksReached: boolean): string {
  const lines = [`Task "${taskId}" marked as completed.`];

  if (maxTasksReached) {
    lines.push(
      '',
      'You have completed the maximum number of tasks for this session. Finish the session.',
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

export { buildTaskPacingContext };
