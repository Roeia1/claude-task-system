#!/bin/bash
# SessionStart hook - detects and persists task context

# Detect task ID from task-system/task-NNN folder
CURRENT_TASK_ID=""
for dir in task-system/task-[0-9]*/; do
    if [ -d "$dir" ]; then
        CURRENT_TASK_ID=$(basename "$dir" | sed 's/task-//')
        break
    fi
done

# Task folder present = worktree, otherwise = main
if [ -n "$CURRENT_TASK_ID" ]; then
    TASK_CONTEXT="worktree"
else
    TASK_CONTEXT="main"
fi

# Write to CLAUDE_ENV_FILE for bash access
if [ -n "$CLAUDE_ENV_FILE" ]; then
    echo "export CLAUDE_SPAWN_DIR=\"$CLAUDE_PROJECT_DIR\"" >> "$CLAUDE_ENV_FILE"
    echo "export TASK_CONTEXT=\"$TASK_CONTEXT\"" >> "$CLAUDE_ENV_FILE"
    [ -n "$CURRENT_TASK_ID" ] && echo "export CURRENT_TASK_ID=\"$CURRENT_TASK_ID\"" >> "$CLAUDE_ENV_FILE"
fi

# Output for Claude awareness
if [ "$TASK_CONTEXT" = "worktree" ] && [ -n "$CURRENT_TASK_ID" ]; then
    echo "Task Context: Working in task $CURRENT_TASK_ID worktree"
else
    echo "Task Context: In main repository"
fi

exit 0
