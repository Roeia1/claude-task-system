#!/bin/bash
# SessionStart hook - detects and persists task context

# Detect worktree vs main
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)

if [ "$GIT_DIR" != "$GIT_COMMON_DIR" ]; then
    TASK_CONTEXT="worktree"
    # Detect task ID from folder
    TASK_FOLDER=$(ls -d task-system/task-[0-9]* 2>/dev/null | head -1)
    if [ -n "$TASK_FOLDER" ]; then
        CURRENT_TASK_ID=$(echo "$TASK_FOLDER" | grep -oP 'task-system/task-\K\d+')
    fi
else
    TASK_CONTEXT="main"
    CURRENT_TASK_ID=""
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
