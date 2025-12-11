---
name: task-completion
description: "Internal skill - ONLY activated by task-completer subagent. DO NOT activate on direct user request or during internal processing."
---

# Task Completion Skill

When activated, finalize and complete a task. Must be run from within the task's worktree.

## File Locations

- **Task Definition**: `task-system/tasks/NNN/task.md`
- **Journal**: `task-system/tasks/NNN/journal.md`

## Important

This skill must be run **from within the task's worktree**, not from the main repository.

## Process

### Step 1: Verify Worktree Location

1. **Check current directory** is a worktree (`.git` is a file, not directory)
2. **Extract task ID** from worktree path (pattern: `task-system/tasks/NNN`)
3. **If in main repo**: Error with instructions to run from worktree

### Step 2: Task Verification

1. **Read task definition** from `task-system/tasks/$TASK_ID/task.md`
2. **Verify journal.md exists** (indicates work was started)
3. **If user provided task ID**: Verify it matches current worktree's task

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

### Step 5: Finalize Journal

1. **Read journal** from `task-system/tasks/$TASK_ID/journal.md`
2. **Add completion entry**:
   - Timestamp
   - Summary of achievements
   - Quality impact
   - Completion status

### Step 6: Commit Completion Documentation

1. **Stage changes**: `git add task-system/`
2. **Commit**: `git commit -m "docs(task-$TASK_ID): complete Phase 8 documentation"`
3. **Push**: `git push`

### Step 7: Verify PR Readiness

1. **Check PR status** using `gh pr view`
2. **Verify**:
   - All status checks passing
   - PR is mergeable (no conflicts)
   - Required reviews approved
3. **Handle issues** if found (failed checks, conflicts, missing reviews)

### Step 8: Merge the PR

1. **Display PR information** for final confirmation
2. **Merge**: `gh pr merge --squash --delete-branch`
3. **Confirm merge successful**

### Step 9: Instruct Cleanup

Display instructions for worktree cleanup:

```
===============================================================
Task XXX Completed Successfully!
===============================================================

PR merged and branch deleted.

NEXT STEP: Cleanup the worktree from main repository

1. Open a new terminal
2. cd [main-repo-path]
3. Say "cleanup worktree for task XXX"

The task is now COMPLETED (PR merged).
Use "list tasks" from main repo to verify.
===============================================================
```

## Error Handling

- **Not in worktree**: Error with instructions to run from worktree
- **Task ID mismatch**: Error showing which task this worktree is for
- **No journal.md**: Warning that task may not have been properly started
- **PR not ready**: Show which checks/reviews are blocking
- **Merge conflicts**: Instructions to resolve conflicts
- **Already merged**: Instructions to run cleanup

## Status After Completion

After successful completion:
- PR is merged to main branch
- Task branch is deleted from remote
- Worktree still exists locally (requires cleanup)
- Task will show as COMPLETED in `list tasks` (PR merged)

## Next Steps

After completion:
- **Run cleanup from main repository** to remove worktree
- Task will no longer appear in local task list
- Task history available via `gh pr list --state merged`

## References

- Cleanup skill: Plugin's `skills/worktree-cleanup/SKILL.md`
