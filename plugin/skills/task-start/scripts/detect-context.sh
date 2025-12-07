#!/bin/bash
# Comprehensive context detection and validation for task-start
#
# Input: Task ID as first argument (required)
# Output: JSON with context, status, and validation results
#
# Checks performed:
# 1. Git worktree detection (main vs worktree)
# 2. Spawn directory verification ($CLAUDE_SPAWN_DIR)
# 3. Branch alignment with task (worktree only)
# 4. Existing worktree check (main repo only)

TASK_ID="$1"

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

# Validate task ID provided
if [ -z "$TASK_ID" ]; then
    output_json "" "error" '"missing_task_id"' "Task ID is required" "" ""
fi

# Get git root and current branch
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$GIT_ROOT" ]; then
    output_json "" "error" '"not_git_repo"' "Not in a git repository" "" ""
fi

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null)

# Detect context: main repo or worktree
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)

if [ "$GIT_DIR" != "$GIT_COMMON_DIR" ]; then
    CONTEXT="worktree"
else
    CONTEXT="main"
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
    # Extract task ID from worktree path
    # New pattern: task-system/tasks/NNN
    WORKTREE_TASK_ID=$(echo "$GIT_ROOT" | grep -oP 'task-system/tasks/\K\d+' | head -1)

    # Fallback: try old pattern task-system/worktrees/task-NNN-{type}
    if [ -z "$WORKTREE_TASK_ID" ]; then
        WORKTREE_TASK_ID=$(echo "$GIT_ROOT" | grep -oP 'task-\K\d+' | head -1)
    fi

    if [ -z "$WORKTREE_TASK_ID" ]; then
        output_json "$CONTEXT" "error" '"invalid_worktree"' "Cannot determine task ID from worktree path: $GIT_ROOT" "$CURRENT_BRANCH" "$GIT_ROOT"
    fi

    # Normalize task IDs for comparison (remove leading zeros)
    NORMALIZED_INPUT=$(echo "$TASK_ID" | sed 's/^0*//')
    NORMALIZED_WORKTREE=$(echo "$WORKTREE_TASK_ID" | sed 's/^0*//')

    if [ "$NORMALIZED_INPUT" != "$NORMALIZED_WORKTREE" ]; then
        output_json "$CONTEXT" "error" '"wrong_worktree"' "This worktree is for task $WORKTREE_TASK_ID, not task $TASK_ID" "$CURRENT_BRANCH" "$GIT_ROOT"
    fi

    # Check branch matches expected pattern (task-NNN-{type})
    EXPECTED_BRANCH_PATTERN="^task-0*${NORMALIZED_INPUT}-"
    if ! echo "$CURRENT_BRANCH" | grep -qE "$EXPECTED_BRANCH_PATTERN"; then
        output_json "$CONTEXT" "error" '"branch_mismatch"' "Expected branch task-$TASK_ID-*, got $CURRENT_BRANCH" "$CURRENT_BRANCH" "$GIT_ROOT"
    fi

    # All validations passed for worktree
    output_json "$CONTEXT" "ok" "null" "Worktree validated for task $TASK_ID" "$CURRENT_BRANCH" "$GIT_ROOT"
else
    # Main repo - check if worktree already exists for this task
    NORMALIZED_INPUT=$(echo "$TASK_ID" | sed 's/^0*//')

    # Check new path pattern: task-system/tasks/NNN
    EXISTING_WORKTREE=$(git worktree list | grep -E "task-system/tasks/0*${NORMALIZED_INPUT}\s" | awk '{print $1}')

    # Fallback: check old path pattern: task-system/worktrees/task-NNN-
    if [ -z "$EXISTING_WORKTREE" ]; then
        EXISTING_WORKTREE=$(git worktree list | grep -E "task-0*${NORMALIZED_INPUT}[^0-9]" | awk '{print $1}')
    fi

    if [ -n "$EXISTING_WORKTREE" ]; then
        output_json "$CONTEXT" "error" '"worktree_exists"' "Task $TASK_ID already has a worktree. Open a new Claude session there: $EXISTING_WORKTREE" "$CURRENT_BRANCH" "$EXISTING_WORKTREE"
    fi

    # No worktree exists - provide guidance
    output_json "$CONTEXT" "error" '"no_worktree_exists"' "No worktree exists for task $TASK_ID. Use 'resume task $TASK_ID' if it exists remotely, or create a new task." "$CURRENT_BRANCH" ""
fi
