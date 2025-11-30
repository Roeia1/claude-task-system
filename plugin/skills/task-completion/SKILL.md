---
name: task-completion
description: "ONLY activate on DIRECT user request to complete a task. User must explicitly mention keywords: 'complete task', 'finish task', 'merge PR', 'task done'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to complete or finalize a task."
---

# Task Completion Skill

When activated, finalize and complete a task. Must be run from within the task's worktree.

## File Locations

- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Journal**: `task-system/tasks/NNN/journal.md`
- **Full Workflow**: Plugin's `commands/complete-task.md`

## Important

This skill must be run **from within the task's worktree**, not from the main repository.

## Process

### Step 1: Verify Worktree Location

1. **Check current directory** is a worktree (`.git` is a file, not directory)
2. **Extract task ID** from worktree path
3. **If in main repo**: Error with instructions to run from worktree

### Step 2: Task Verification

1. **Read task list** from `task-system/tasks/TASK-LIST.md`
2. **Find task** by ID extracted from worktree path
3. **Validate**: Task must be IN_PROGRESS
4. **If user provided task ID**: Verify it matches current worktree's task

### Step 3: Clean CLAUDE.md

1. **Check for worktree-specific content**:
   - Look for "# Task XXX Worktree - ISOLATED ENVIRONMENT" marker
2. **Remove isolation instructions**:
   - Strip content from start to the "---" separator before original content
3. **Verify cleanup**: Ensure no isolation instructions remain

### Step 4: Pre-Completion Checks

1. **Check for uncommitted changes** (`git status --porcelain`)
2. **Commit any changes** (including CLAUDE.md cleanup):
   ```bash
   git add .
   git commit -m "docs(task-XXX): final updates before completion"
   ```
3. **Push to remote**: `git push`

### Step 5: Update Task Status

1. **Read TASK-LIST.md**
2. **Find task** in IN_PROGRESS section with worktree marker
3. **Remove worktree marker**: `[worktree: path]`
4. **Move task** to COMPLETED section
5. **Format**: `- [Task Title] ([Summary of achievements]) [task-type]`

### Step 6: Finalize Journal

1. **Read journal** from `task-system/tasks/NNN/journal.md`
2. **Update "Current Phase"** header to "COMPLETED"
3. **Add Phase 8 completion entry**:
   - Timestamp
   - Summary of achievements
   - Quality impact
   - Completion status

### Step 7: Commit Completion Documentation

1. **Stage changes**: `git add task-system/`
2. **Commit**: `git commit -m "docs(task-XXX): complete Phase 8 documentation"`
3. **Push**: `git push`

### Step 8: Verify PR Readiness

1. **Check PR status** using `gh pr view`
2. **Verify**:
   - All status checks passing
   - PR is mergeable (no conflicts)
   - Required reviews approved
3. **Handle issues** if found (failed checks, conflicts, missing reviews)

### Step 9: Merge the PR

1. **Display PR information** for final confirmation
2. **Merge**: `gh pr merge --squash --delete-branch`
3. **Confirm merge successful**

### Step 10: Instruct Cleanup

Display instructions for worktree cleanup:

```
===============================================================
Task XXX Completed Successfully!
===============================================================

NEXT STEP: Cleanup the worktree from main repository

1. Open a new terminal
2. cd [main-repo-path]
3. Say "cleanup worktree for task XXX"
===============================================================
```

## Error Handling

- **Not in worktree**: Error with instructions to run from worktree
- **Task ID mismatch**: Error showing which task this worktree is for
- **Task not IN_PROGRESS**: Error with current status
- **PR not ready**: Show which checks/reviews are blocking
- **Merge conflicts**: Instructions to resolve conflicts
- **Already merged**: Instructions to run cleanup

## Next Steps

After completion:
- Task is moved to COMPLETED in task list
- PR is merged and branch deleted
- **Run cleanup from main repository** to remove worktree

## References

- Complete workflow details: Plugin's `commands/complete-task.md`
- Task list format: `task-system/tasks/TASK-LIST.md`
- Cleanup skill: Plugin's `skills/worktree-cleanup/SKILL.md`
