#!/bin/bash
# Allocate N consecutive task IDs atomically
# Called by task-generation skill before spawning subagents
#
# Usage: allocate-task-ids.sh <count>
# Output: JSON with array of allocated IDs
#
# Example:
#   $ ./allocate-task-ids.sh 5
#   {"status": "ok", "task_ids": ["015","016","017","018","019"], "start_id": "015", "end_id": "019"}

COUNT="$1"

# Helper: output JSON
output_json() {
    local status="$1"
    local message="$2"
    local task_ids="$3"
    local start_id="$4"
    local end_id="$5"

    if [ "$status" = "error" ]; then
        echo "{\"status\": \"error\", \"message\": \"$message\"}"
        exit 1
    fi

    echo "{\"status\": \"ok\", \"task_ids\": $task_ids, \"start_id\": \"$start_id\", \"end_id\": \"$end_id\"}"
    exit 0
}

# Validate input
if [ -z "$COUNT" ]; then
    output_json "error" "Missing count argument. Usage: allocate-task-ids.sh <count>"
fi

if ! [[ "$COUNT" =~ ^[0-9]+$ ]] || [ "$COUNT" -lt 1 ]; then
    output_json "error" "Count must be a positive integer, got: $COUNT"
fi

# Ensure we're in a git repo
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    output_json "error" "Not in a git repository"
fi

# Find highest existing task ID from local worktrees
HIGHEST_LOCAL=0
if [ -d "task-system/tasks" ]; then
    for dir in task-system/tasks/*/; do
        if [ -d "$dir" ]; then
            NUM=$(basename "$dir" | grep -oP '^\d+')
            if [ -n "$NUM" ] && [ "$NUM" -gt "$HIGHEST_LOCAL" ]; then
                HIGHEST_LOCAL=$((10#$NUM))  # Force base-10 interpretation
            fi
        fi
    done
fi

# Find highest existing task ID from remote branches
HIGHEST_REMOTE=0
while IFS= read -r branch; do
    NUM=$(echo "$branch" | grep -oP 'task-\K\d+')
    if [ -n "$NUM" ] && [ "$((10#$NUM))" -gt "$HIGHEST_REMOTE" ]; then
        HIGHEST_REMOTE=$((10#$NUM))
    fi
done < <(git branch -r 2>/dev/null | grep -E 'task-[0-9]+')

# Find highest existing task ID from local branches
HIGHEST_LOCAL_BRANCH=0
while IFS= read -r branch; do
    NUM=$(echo "$branch" | grep -oP 'task-\K\d+')
    if [ -n "$NUM" ] && [ "$((10#$NUM))" -gt "$HIGHEST_LOCAL_BRANCH" ]; then
        HIGHEST_LOCAL_BRANCH=$((10#$NUM))
    fi
done < <(git branch 2>/dev/null | grep -E 'task-[0-9]+')

# Find highest existing task ID from archive
HIGHEST_ARCHIVE=0
if [ -d "task-system/archive" ]; then
    for dir in task-system/archive/*/; do
        if [ -d "$dir" ]; then
            NUM=$(basename "$dir" | grep -oP '^\d+')
            if [ -n "$NUM" ] && [ "$((10#$NUM))" -gt "$HIGHEST_ARCHIVE" ]; then
                HIGHEST_ARCHIVE=$((10#$NUM))
            fi
        fi
    done
fi

# Get the maximum across all sources
HIGHEST=$HIGHEST_LOCAL
[ "$HIGHEST_REMOTE" -gt "$HIGHEST" ] && HIGHEST=$HIGHEST_REMOTE
[ "$HIGHEST_LOCAL_BRANCH" -gt "$HIGHEST" ] && HIGHEST=$HIGHEST_LOCAL_BRANCH
[ "$HIGHEST_ARCHIVE" -gt "$HIGHEST" ] && HIGHEST=$HIGHEST_ARCHIVE

# Generate consecutive IDs
IDS="["
for ((i=1; i<=COUNT; i++)); do
    NEXT_ID=$((HIGHEST + i))
    PADDED=$(printf "%03d" $NEXT_ID)
    if [ $i -gt 1 ]; then
        IDS="${IDS},"
    fi
    IDS="${IDS}\"${PADDED}\""
done
IDS="${IDS}]"

START_ID=$(printf "%03d" $((HIGHEST + 1)))
END_ID=$(printf "%03d" $((HIGHEST + COUNT)))

output_json "ok" "" "$IDS" "$START_ID" "$END_ID"
