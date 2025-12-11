#!/bin/bash
# Create a complete task: branch, worktree, commit, push, and PR
# Called by task-generator-ops skill
#
# Usage: create-task.sh <task_id> <task_type> <title> <priority> <task_file_path> [feature_id] [feature_name]
#
# Arguments:
#   task_id       - Pre-allocated task ID (e.g., "015")
#   task_type     - One of: feature, bugfix, refactor, performance, deployment
#   title         - Task title for commit and PR
#   priority      - P1, P2, or P3
#   task_file_path - Path to the task.md file to copy into worktree
#   feature_id    - Optional feature ID for context
#   feature_name  - Optional feature name for PR body
#
# Output: JSON with status and all created resources
#
# Example:
#   $ ./create-task.sh 015 feature "Implement user model" P1 /tmp/task-015.md 001-auth "User Auth"
#   {"status": "ok", "task_id": "015", "branch": "task-015-feature", "worktree_path": "...", "pr_number": 42, "pr_url": "..."}

set -e

TASK_ID="$1"
TASK_TYPE="$2"
TITLE="$3"
PRIORITY="$4"
TASK_FILE_PATH="$5"
FEATURE_ID="${6:-}"
FEATURE_NAME="${7:-}"

# Helper: output JSON and exit
output_json() {
    local status="$1"
    shift

    if [ "$status" = "error" ]; then
        local message="$1"
        local stage="$2"
        echo "{\"status\": \"error\", \"task_id\": \"$TASK_ID\", \"message\": \"$message\", \"stage\": \"$stage\"}"
        exit 1
    fi

    # Success - remaining args are key=value pairs
    local branch="$1"
    local worktree_path="$2"
    local commit_sha="$3"
    local pr_number="$4"
    local pr_url="$5"

    cat <<EOF
{
  "status": "ok",
  "task_id": "$TASK_ID",
  "branch": "$branch",
  "worktree_path": "$worktree_path",
  "commit_sha": "$commit_sha",
  "pr_number": $pr_number,
  "pr_url": "$pr_url"
}
EOF
    exit 0
}

# Cleanup function for partial failures
cleanup_on_error() {
    local stage="$1"
    local message="$2"

    # Try to clean up based on how far we got
    if [ -n "$WORKTREE_PATH" ] && [ -d "$WORKTREE_PATH" ]; then
        git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
    fi

    if [ -n "$BRANCH" ]; then
        git branch -D "$BRANCH" 2>/dev/null || true
    fi

    output_json "error" "$message" "$stage"
}

# Validate inputs
if [ -z "$TASK_ID" ] || [ -z "$TASK_TYPE" ] || [ -z "$TITLE" ] || [ -z "$PRIORITY" ] || [ -z "$TASK_FILE_PATH" ]; then
    echo '{"status": "error", "message": "Missing required arguments. Usage: create-task.sh <task_id> <task_type> <title> <priority> <task_file_path> [feature_id] [feature_name]", "stage": "validation"}'
    exit 1
fi

# Validate task type
case "$TASK_TYPE" in
    feature|bugfix|refactor|performance|deployment)
        ;;
    *)
        echo "{\"status\": \"error\", \"task_id\": \"$TASK_ID\", \"message\": \"Invalid task type: $TASK_TYPE\", \"stage\": \"validation\"}"
        exit 1
        ;;
esac

# Check task file exists
if [ ! -f "$TASK_FILE_PATH" ]; then
    echo "{\"status\": \"error\", \"task_id\": \"$TASK_ID\", \"message\": \"Task file not found: $TASK_FILE_PATH\", \"stage\": \"validation\"}"
    exit 1
fi

# Ensure we're in a git repo
if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "{\"status\": \"error\", \"task_id\": \"$TASK_ID\", \"message\": \"Not in a git repository\", \"stage\": \"validation\"}"
    exit 1
fi

# Check gh CLI is available and authenticated
if ! command -v gh &>/dev/null; then
    echo "{\"status\": \"error\", \"task_id\": \"$TASK_ID\", \"message\": \"GitHub CLI (gh) not found\", \"stage\": \"validation\"}"
    exit 1
fi

if ! gh auth status &>/dev/null; then
    echo "{\"status\": \"error\", \"task_id\": \"$TASK_ID\", \"message\": \"Not authenticated with GitHub CLI\", \"stage\": \"validation\"}"
    exit 1
fi

BRANCH="task-${TASK_ID}-${TASK_TYPE}"
WORKTREE_PATH="task-system/tasks/$TASK_ID"
TASK_DIR="$WORKTREE_PATH/task-system/task-$TASK_ID"

# ============================================================
# Step 1: Create Branch
# ============================================================

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
    output_json "error" "Branch $BRANCH already exists locally" "create_branch"
fi

if git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" 2>/dev/null; then
    output_json "error" "Branch $BRANCH already exists on remote" "create_branch"
fi

if ! git branch "$BRANCH" 2>/dev/null; then
    output_json "error" "Failed to create branch $BRANCH" "create_branch"
fi

# ============================================================
# Step 2: Create Worktree
# ============================================================

mkdir -p task-system/tasks

if [ -d "$WORKTREE_PATH" ]; then
    cleanup_on_error "create_worktree" "Worktree already exists at $WORKTREE_PATH"
fi

if ! git worktree add "$WORKTREE_PATH" "$BRANCH" 2>/dev/null; then
    cleanup_on_error "create_worktree" "Failed to create worktree at $WORKTREE_PATH"
fi

# Create task directory structure
if ! mkdir -p "$TASK_DIR"; then
    cleanup_on_error "create_worktree" "Failed to create task directory at $TASK_DIR"
fi

# ============================================================
# Step 3: Copy Task File
# ============================================================

if ! cp "$TASK_FILE_PATH" "$TASK_DIR/task.md"; then
    cleanup_on_error "copy_task_file" "Failed to copy task file to $TASK_DIR/task.md"
fi

# ============================================================
# Step 4: Commit and Push
# ============================================================

if ! git -C "$WORKTREE_PATH" add . 2>/dev/null; then
    cleanup_on_error "commit" "Failed to stage files"
fi

# Build commit message
if [ -n "$FEATURE_ID" ]; then
    COMMIT_MSG="docs(task-$TASK_ID): create task definition

Task: $TITLE
Type: $TASK_TYPE
Priority: $PRIORITY
Feature: $FEATURE_ID"
else
    COMMIT_MSG="docs(task-$TASK_ID): create task definition

Task: $TITLE
Type: $TASK_TYPE
Priority: $PRIORITY"
fi

if ! git -C "$WORKTREE_PATH" commit -m "$COMMIT_MSG" >/dev/null 2>&1; then
    cleanup_on_error "commit" "Failed to commit"
fi

COMMIT_SHA=$(git -C "$WORKTREE_PATH" rev-parse HEAD 2>/dev/null)

if ! git -C "$WORKTREE_PATH" push -u origin "$BRANCH" 2>/dev/null; then
    cleanup_on_error "push" "Failed to push to remote"
fi

# ============================================================
# Step 5: Create PR
# ============================================================

PR_TITLE="Task $TASK_ID: $TITLE"

if [ -n "$FEATURE_ID" ] && [ -n "$FEATURE_NAME" ]; then
    PR_BODY="## Task Definition

See: task-system/task-$TASK_ID/task.md

## Feature Context

Feature: $FEATURE_ID - $FEATURE_NAME
Plan: task-system/features/$FEATURE_ID/plan.md

---
Status: Not started (pending execution)"
else
    PR_BODY="## Task Definition

See: task-system/task-$TASK_ID/task.md

---
Status: Not started (pending execution)"
fi

PR_OUTPUT=$(gh pr create \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    --head "$BRANCH" \
    --draft \
    --json number,url 2>&1)

if [ $? -ne 0 ]; then
    # PR creation failed, but branch/worktree exist - don't cleanup, just report
    CLEAN_ERROR=$(echo "$PR_OUTPUT" | tr '\n' ' ' | sed 's/"/\\"/g')
    output_json "error" "Failed to create PR: $CLEAN_ERROR" "create_pr"
fi

PR_NUMBER=$(echo "$PR_OUTPUT" | jq -r '.number' 2>/dev/null)
PR_URL=$(echo "$PR_OUTPUT" | jq -r '.url' 2>/dev/null)

if [ -z "$PR_NUMBER" ] || [ "$PR_NUMBER" = "null" ]; then
    output_json "error" "Failed to parse PR number" "create_pr"
fi

# ============================================================
# Success
# ============================================================

output_json "ok" "$BRANCH" "$WORKTREE_PATH" "$COMMIT_SHA" "$PR_NUMBER" "$PR_URL"
