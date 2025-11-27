---
name: task-completion
description: "ONLY activate on DIRECT user request to complete a task. User must explicitly mention keywords: 'complete task', 'finish task', 'merge PR', 'task done'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to complete or finalize a task."
---

# Task Completion Skill

When activated, finalize and complete a task (for non-worktree tasks only).

## File Locations

- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Journal**: `task-system/tasks/NNN/journal.md`
- **Full Workflow**: Plugin's `commands/complete-task.md`

## Important

This skill is for **regular (non-worktree) tasks only**. For parallel tasks in worktrees, use the **parallel-task-finalization** skill instead.

## Process

### Step 1: Task Selection

1. **Read task list** from `task-system/tasks/TASK-LIST.md`
2. **Filter for IN_PROGRESS tasks** (exclude tasks with `[worktree: path]` markers)
3. **Interactive selection** or use direct task ID from user input
4. **Validate**: Task must be IN_PROGRESS and NOT in a worktree

### Step 2: Pre-Completion Checks

1. **Verify in main repository** (not a worktree)
2. **Checkout task branch**
3. **Check for uncommitted changes** (`git status --porcelain`)
4. **Commit any final changes** if found
5. **Push to remote**

### Step 3: Update Task Status

1. **Read TASK-LIST.md**
2. **Move task** from IN_PROGRESS to COMPLETED section
3. **Format**: `- [Task Title] ([Summary of achievements]) [task-type]`

### Step 4: Finalize Journal

1. **Read journal** from `task-system/tasks/NNN/journal.md`
2. **Update "Current Phase"** header to "COMPLETED"
3. **Add Phase 8 completion entry**:
   - Timestamp
   - Summary of achievements
   - Quality impact
   - Completion status

### Step 5: Commit Completion Documentation

1. **Stage changes**: `git add task-system/`
2. **Commit**: `git commit -m "docs(task-XXX): complete Phase 8 documentation"`
3. **Push**: `git push`

### Step 6: Verify PR Readiness

1. **Check PR status** using `gh pr view`
2. **Verify**:
   - All status checks passing
   - PR is mergeable (no conflicts)
   - Required reviews approved
3. **Handle issues** if found (failed checks, conflicts, missing reviews)

### Step 7: Merge the PR

1. **Display PR information** for final confirmation
2. **Merge**: `gh pr merge --squash --delete-branch`
3. **Confirm merge successful**

### Step 8: Update Repository

1. **Switch to main branch**: `git checkout master`
2. **Pull latest changes**: `git pull origin master`
3. **Verify working directory is clean**

## Error Handling

- **Task in worktree**: Error with instructions to use parallel-finalize-task
- **Task not IN_PROGRESS**: Error with current status
- **PR not ready**: Show which checks/reviews are blocking
- **Merge conflicts**: Instructions to resolve conflicts
- **Already merged**: Recovery instructions

## Next Steps

After completion:
- Task is moved to COMPLETED in task list
- PR is merged and branch deleted
- Repository is updated to latest main
- Ready to start next task with **task-start** skill

## References

- Complete workflow details: Plugin's `commands/complete-task.md`
- Task list format: `task-system/tasks/TASK-LIST.md`
