#!/bin/bash
# Archive task files before worktree cleanup
# Usage: archive-task.sh <task_id> <main_repo_path> <worktree_path>

TASK_ID="$1"
MAIN_REPO="$2"
WORKTREE="$3"

if [ -z "$TASK_ID" ] || [ -z "$MAIN_REPO" ] || [ -z "$WORKTREE" ]; then
    echo "Error: Missing required arguments"
    echo "Usage: archive-task.sh <task_id> <main_repo_path> <worktree_path>"
    exit 1
fi

ARCHIVE_DIR="$MAIN_REPO/task-system/archive/$TASK_ID"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"
if [ $? -ne 0 ]; then
    echo "Error: Failed to create archive directory: $ARCHIVE_DIR"
    exit 1
fi

# Archive task.md
if [ -f "$WORKTREE/task-system/tasks/$TASK_ID/task.md" ]; then
    cp "$WORKTREE/task-system/tasks/$TASK_ID/task.md" "$ARCHIVE_DIR/"
    echo "Archived: task.md"
else
    echo "Warning: task.md not found"
fi

# Archive journal.md (optional - may not exist if task never started)
if [ -f "$WORKTREE/task-system/tasks/$TASK_ID/journal.md" ]; then
    cp "$WORKTREE/task-system/tasks/$TASK_ID/journal.md" "$ARCHIVE_DIR/"
    echo "Archived: journal.md"
fi

echo "Task $TASK_ID archived to: $ARCHIVE_DIR"
