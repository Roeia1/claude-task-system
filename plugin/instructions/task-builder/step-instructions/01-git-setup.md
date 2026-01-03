# Step 1: Git Setup

Create the git branch and worktree for this task.

## Prerequisites Check

Before starting, verify:
1. You are in the main repository (not a worktree)
2. Working directory is clean (`git status` shows no changes)
3. The branch doesn't already exist locally or remotely
4. **Local master is in sync with origin** (no unpushed commits)

## Sync Check (Critical)

Before creating any branches, verify local is in sync with remote:

```bash
# Fetch latest from origin
git fetch origin

# Check if local has unpushed commits
if ! git diff HEAD origin/master --quiet 2>/dev/null; then
    echo "ERROR: Local master has unpushed commits or differs from origin."
    echo "Push your changes first: git push origin master"
    exit 1
fi
```

If this check fails, **stop immediately** and report the error. Do not create a worktree from an unsynced state - this will cause merge issues later.

## Commands to Execute

```bash
# 1. Create the branch from current HEAD
git branch task-{task_id}-{task_type}

# 2. Create tasks directory if it doesn't exist
mkdir -p task-system/tasks

# 3. Create worktree for this task
git worktree add task-system/tasks/{task_id} task-{task_id}-{task_type}

# 4. Create the task directory structure inside worktree
mkdir -p task-system/tasks/{task_id}/task-system/task-{task_id}
```

## Variable Substitution

Replace these placeholders with actual values:
- `{task_id}` - The pre-allocated task ID (e.g., "015")
- `{task_type}` - The task type (feature/bugfix/refactor/performance/deployment)

## Success Criteria

All commands completed without error. You now have:
- Branch: `task-{task_id}-{task_type}`
- Worktree: `task-system/tasks/{task_id}/`
- Task directory: `task-system/tasks/{task_id}/task-system/task-{task_id}/`

## Error Handling

If any command fails:

1. **Sync check fails** (local differs from origin):
   - Report error: "Local master is not in sync with origin/master"
   - Stage: `git_setup`
   - No cleanup needed
   - User must push or pull before retrying

2. **Branch creation fails** (already exists):
   - Report error: "Branch task-{task_id}-{task_type} already exists"
   - Stage: `git_setup`
   - No cleanup needed

3. **Worktree creation fails**:
   - Delete the branch: `git branch -D task-{task_id}-{task_type}`
   - Report error with details
   - Stage: `git_setup`

4. **Directory creation fails**:
   - Remove worktree: `git worktree remove task-system/tasks/{task_id} --force`
   - Delete branch: `git branch -D task-{task_id}-{task_type}`
   - Report error with details
   - Stage: `git_setup`

## Next Step

Once git setup succeeds, proceed to Step 2 (Content Generation).
