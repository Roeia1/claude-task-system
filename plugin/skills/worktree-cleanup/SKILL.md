---
name: worktree-cleanup
description: "ONLY activate on DIRECT user request to cleanup worktrees. User must explicitly mention keywords: 'cleanup worktree', 'remove worktree', 'delete worktree'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to clean up or remove worktrees."
---

# Worktree Cleanup Skill

Cleans up a git worktree after a task has been completed and merged. Must be run from the MAIN repository, not from within a worktree.

## File Locations

- **Task Worktrees**: `task-system/tasks/NNN/` (git worktrees)

## Prerequisites

- Task should be completed (PR merged) for safe cleanup
- **Must be run from the MAIN repository**, not from within a worktree

---

## Step 1: Verify Main Repository

1. **Check current directory** is main repository (not a worktree):
   ```bash
   # .git is a directory in main repo, a file in worktree
   if [ -f ".git" ]; then
       ERROR="In worktree"
   fi
   ```

2. **If in worktree**, display error:
   ```
   ===============================================================
   ERROR: Must run from main repository
   ===============================================================

   You are currently in a worktree.
   Current location: [current-path]

   ---------------------------------------------------------------
   NEXT STEP: Run cleanup from main repository
   ---------------------------------------------------------------

   1. Open a new terminal
   2. cd [main-repo-path]
   3. Say "cleanup worktree" or "cleanup worktree for task XXX"
   ===============================================================
   ```
   **STOP**

## Step 2: Update Main Branch

1. **Checkout main**: `git checkout master` (or `main`)
2. **Pull latest changes**: `git pull`

## Step 3: Task/Worktree Selection

**With Task ID** (e.g., "cleanup worktree for task 013"):
1. Find worktree for that task: `git worktree list | grep task-system/tasks/$TASK_ID`
2. Verify worktree exists
3. Check if PR is merged: `gh pr list --state merged --head "task-$TASK_ID-*"`

**Without Task ID (Interactive Mode)**:
1. **List all worktrees**: `git worktree list`
2. **Filter for task worktrees** (pattern: `task-system/tasks/NNN`)
3. **Check PR status** for each task
4. **Display menu**:
   ```
   Worktrees available for cleanup:

   1. task-system/tasks/001 (COMPLETED - PR merged)
   2. task-system/tasks/003 (IN_PROGRESS - PR open)
   3. task-system/tasks/005 (COMPLETED - PR merged)

   Select worktree to cleanup (number or task ID), or 'all' for completed only:
   ```
5. **Get user selection**

## Step 4: Confirmation

**For COMPLETED tasks** (PR merged): Proceed with cleanup immediately

**For IN_PROGRESS tasks** (PR not merged): Warn and confirm:
```
WARNING: Task XXX PR has not been merged yet

This task is still in progress. Removing the worktree will:
- Lose any uncommitted changes
- Require recreating the worktree to continue work

Are you sure you want to remove this worktree? (yes/no)
```
- If no: Cancel and STOP
- If yes: Proceed with cleanup

## Step 5: Archive Task Files

Before removing the worktree, archive task artifacts for future reference:

1. **Create archive directory**:
   ```bash
   mkdir -p task-system/archive/$TASK_ID
   ```

2. **Copy task files to archive**:
   ```bash
   cp task-system/tasks/$TASK_ID/task.md task-system/archive/$TASK_ID/
   cp task-system/tasks/$TASK_ID/journal.md task-system/archive/$TASK_ID/
   ```

3. **Handle missing files gracefully**:
   - If `task.md` doesn't exist, warn but continue
   - If `journal.md` doesn't exist (task never started), skip it

## Step 6: Worktree Removal

For each worktree to remove:

1. **Verify worktree exists**:
   ```bash
   if git worktree list | grep -q "task-system/tasks/$TASK_ID"; then
       echo "Found worktree"
   else
       echo "Worktree not found (may already be removed)"
   fi
   ```

2. **Remove worktree**:
   ```bash
   git worktree remove "task-system/tasks/$TASK_ID" --force
   ```

3. **Handle removal errors**:
   - Dirty directory: Use --force flag
   - Locked worktree: Check for lock file
   - Provide manual cleanup instructions if needed

4. **Prune stale references**:
   ```bash
   git worktree prune
   ```

## Step 7: Display Success

```
===============================================================
Worktree Cleanup Complete
===============================================================

Task: XXX
Archived to: task-system/archive/XXX/
Worktree removed: task-system/tasks/XXX/
Stale references pruned

---------------------------------------------------------------
Remaining worktrees:
---------------------------------------------------------------
[List remaining worktrees from `git worktree list`]

Use "list tasks" to see current task status.
View archived tasks: ls task-system/archive/
===============================================================
```

---

## Batch Cleanup

**If user says "cleanup all worktrees"** or selects "all":

1. Filter for COMPLETED tasks only (PRs merged)
2. For each completed task with worktree:
   - Archive task files to `task-system/archive/$TASK_ID/`
   - Remove worktree
3. Display summary:
   ```
   Batch Cleanup Complete

   Archived & Removed:
   - task-system/tasks/001 → task-system/archive/001/
   - task-system/tasks/005 → task-system/archive/005/

   Skipped (PR not merged):
   - task-system/tasks/003

   Total: 2 tasks archived, 2 worktrees removed, 1 skipped
   ```

---

## Error Handling

| Error                        | Message                                              |
| ---------------------------- | ---------------------------------------------------- |
| In worktree                  | "Must run from main repository, not worktree"        |
| Worktree not found           | "No worktree found for task XXX (may already be removed)" |
| Task not found               | "Task XXX not found"                                 |
| Removal failed               | "Failed to remove worktree - see manual cleanup steps" |
| No worktrees to cleanup      | "No task worktrees found"                            |

### Manual Cleanup (if automatic removal fails)

```
If automatic removal fails, try manual cleanup:

1. Check for uncommitted changes:
   cd task-system/tasks/XXX
   git status

2. Force remove (loses uncommitted changes):
   git worktree remove task-system/tasks/XXX --force

3. If still fails, manually delete and prune:
   rm -rf task-system/tasks/XXX
   git worktree prune

```

---

## Usage Examples

### Single Worktree
- "cleanup worktree for task 013"
- "remove worktree 013"
- "delete worktree for task 13"

### Cleanup All Completed
- "cleanup all worktrees"
- "remove all completed worktrees"

### Interactive
- "cleanup worktree" (shows menu)

---

## Important Notes

- **Must run from main repository**, not from worktree
- **COMPLETED tasks** (PR merged) are safe to cleanup immediately
- **IN_PROGRESS tasks** (PR open) require confirmation before cleanup
- **Stale references** are automatically pruned
- **Task status** determined by PR state (merged = COMPLETED)
- **Automatic archiving**: Task files are archived before worktree removal

## After Cleanup

- Task files archived to `task-system/archive/$TASK_ID/`
- Worktree directory is removed from filesystem
- Git references are pruned
- Use `list tasks` to see remaining tasks
- Use `ls task-system/archive/` to browse archived tasks
- Can start new tasks or resume remote tasks
