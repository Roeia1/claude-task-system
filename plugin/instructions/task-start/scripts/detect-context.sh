#!/bin/bash
# Context detection and validation for task-start
#
# Input: Task ID as first argument (optional, used for validation in worktree)
# Output: JSON with context, status, and validation results
#
# Uses env vars from session-init.sh when available:
# - $TASK_CONTEXT: "worktree" or "main"
# - $CURRENT_TASK_ID: task number (in worktree)
#
# Checks performed:
# 1. Context detection (uses $TASK_CONTEXT or detects)
# 2. Task ID detection (uses $CURRENT_TASK_ID or detects from folder)
# 3. Spawn directory verification ($CLAUDE_SPAWN_DIR)
# 4. Branch alignment with task (worktree only)
#
# Note: Tasks can only be started from within a worktree

USER_INPUT="$1"
TASK_ID=""

# Helper: output JSON and exit
output_json() {
    local context="$1"
    local status="$2"
    local error_type="$3"
    local message="$4"
    local branch="$5"
    local worktree_path="$6"

    cat <<EOF
{
  "context": "$context",
  "status": "$status",
  "error_type": ${error_type:-null},
  "message": "$message",
  "task_id": "$TASK_ID",
  "branch": "$branch",
  "worktree_path": "$worktree_path"
}
EOF
    if [ "$status" = "error" ]; then
        exit 1
    fi
    exit 0
}

# Helper: detect task ID from task-system/task-NNN folder
detect_task_from_folder() {
    local task_folder=$(ls -d task-system/task-[0-9]* 2>/dev/null | head -1)
    if [ -n "$task_folder" ]; then
        echo "$task_folder" | grep -oP 'task-system/task-\K\d+'
    fi
}

# Get git root and current branch
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$GIT_ROOT" ]; then
    output_json "" "error" '"not_git_repo"' "Not in a git repository" "" ""
fi

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

# Use $TASK_CONTEXT from session-init.sh if available, otherwise detect
if [ -n "$TASK_CONTEXT" ]; then
    CONTEXT="$TASK_CONTEXT"
else
    # Fallback: detect context from git
    GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
    GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)
    if [ "$GIT_DIR" != "$GIT_COMMON_DIR" ]; then
        CONTEXT="worktree"
    else
        CONTEXT="main"
    fi
fi

# Check spawn directory if available
if [ -n "$CLAUDE_SPAWN_DIR" ]; then
    if [ "$CLAUDE_SPAWN_DIR" != "$GIT_ROOT" ]; then
        if [ "$CONTEXT" = "worktree" ]; then
            output_json "$CONTEXT" "error" '"spawn_mismatch"' "Claude must be started from worktree root: $GIT_ROOT (spawned from: $CLAUDE_SPAWN_DIR)" "$CURRENT_BRANCH" "$GIT_ROOT"
        else
            output_json "$CONTEXT" "error" '"spawn_mismatch"' "Claude should be started from project root: $GIT_ROOT (spawned from: $CLAUDE_SPAWN_DIR)" "$CURRENT_BRANCH" ""
        fi
    fi
fi

# Worktree-specific validations
if [ "$CONTEXT" = "worktree" ]; then
    # Use $CURRENT_TASK_ID from session-init.sh if available, otherwise detect from folder
    if [ -n "$CURRENT_TASK_ID" ]; then
        DETECTED_TASK_ID="$CURRENT_TASK_ID"
    else
        # Fallback: detect from folder
        DETECTED_TASK_ID=$(detect_task_from_folder)
    fi

    if [ -z "$DETECTED_TASK_ID" ]; then
        output_json "$CONTEXT" "error" '"no_task_folder"' "No task-system/task-NNN folder found in worktree. Cannot determine which task this is." "$CURRENT_BRANCH" "$GIT_ROOT"
    fi

    # Use detected task ID as source of truth
    TASK_ID="$DETECTED_TASK_ID"

    # If user provided input, validate it matches detected task ID
    if [ -n "$USER_INPUT" ]; then
        NORMALIZED_INPUT=$(echo "$USER_INPUT" | sed 's/^0*//')
        NORMALIZED_DETECTED=$(echo "$DETECTED_TASK_ID" | sed 's/^0*//')

        if [ "$NORMALIZED_INPUT" != "$NORMALIZED_DETECTED" ]; then
            output_json "$CONTEXT" "error" '"task_id_mismatch"' "This worktree contains task $DETECTED_TASK_ID, not task $USER_INPUT" "$CURRENT_BRANCH" "$GIT_ROOT"
        fi
    fi

    # Normalize for branch validation
    NORMALIZED_TASK=$(echo "$TASK_ID" | sed 's/^0*//')

    # Check branch matches expected pattern (task-NNN-{type})
    EXPECTED_BRANCH_PATTERN="^task-0*${NORMALIZED_TASK}-"
    if ! echo "$CURRENT_BRANCH" | grep -qE "$EXPECTED_BRANCH_PATTERN"; then
        output_json "$CONTEXT" "error" '"branch_mismatch"' "Expected branch task-$TASK_ID-*, got $CURRENT_BRANCH" "$CURRENT_BRANCH" "$GIT_ROOT"
    fi

    # All validations passed for worktree
    output_json "$CONTEXT" "ok" "null" "Worktree validated for task $TASK_ID" "$CURRENT_BRANCH" "$GIT_ROOT"
else
    # Main repo - tasks can only be started from within a worktree
    # If user provided a task ID, look up the worktree path for spawn support
    WORKTREE_PATH=""
    if [ -n "$USER_INPUT" ]; then
        # Normalize task ID (remove leading zeros for path lookup, but keep for display)
        NORMALIZED_INPUT=$(echo "$USER_INPUT" | sed 's/^0*//')

        # Look for worktree in task-system/tasks/NNN format
        # Try with leading zeros first (e.g., 010), then without (e.g., 10)
        PADDED_ID=$(printf "%03d" "$NORMALIZED_INPUT" 2>/dev/null || echo "$USER_INPUT")

        if [ -d "$GIT_ROOT/task-system/tasks/$PADDED_ID" ]; then
            WORKTREE_PATH="$GIT_ROOT/task-system/tasks/$PADDED_ID"
            TASK_ID="$PADDED_ID"
        elif [ -d "$GIT_ROOT/task-system/tasks/$NORMALIZED_INPUT" ]; then
            WORKTREE_PATH="$GIT_ROOT/task-system/tasks/$NORMALIZED_INPUT"
            TASK_ID="$NORMALIZED_INPUT"
        elif [ -d "$GIT_ROOT/task-system/tasks/$USER_INPUT" ]; then
            WORKTREE_PATH="$GIT_ROOT/task-system/tasks/$USER_INPUT"
            TASK_ID="$USER_INPUT"
        fi
    fi

    output_json "$CONTEXT" "error" '"not_in_worktree"' "Tasks can only be started from within a worktree. Navigate to task-system/tasks/NNN and start a new Claude session there." "$CURRENT_BRANCH" "$WORKTREE_PATH"
fi
