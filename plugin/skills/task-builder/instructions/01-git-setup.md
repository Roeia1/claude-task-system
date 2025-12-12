# Step 1: Git Setup

Create the git branch and worktree for this task.

## Prerequisites Check

Before starting, verify:
1. You are in the main repository (not a worktree)
2. Working directory is clean (`git status` shows no changes)
3. The branch doesn't already exist locally or remotely

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

1. **Branch creation fails** (already exists):
   - Report error: "Branch task-{task_id}-{task_type} already exists"
   - Stage: `git_setup`
   - No cleanup needed

2. **Worktree creation fails**:
   - Delete the branch: `git branch -D task-{task_id}-{task_type}`
   - Report error with details
   - Stage: `git_setup`

3. **Directory creation fails**:
   - Remove worktree: `git worktree remove task-system/tasks/{task_id} --force`
   - Delete branch: `git branch -D task-{task_id}-{task_type}`
   - Report error with details
   - Stage: `git_setup`

## Next Step

Once git setup succeeds, proceed to Step 2 (Content Generation).
