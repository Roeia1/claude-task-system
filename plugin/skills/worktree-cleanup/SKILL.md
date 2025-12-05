---
name: worktree-cleanup
description: "ONLY activate on DIRECT user request to cleanup worktrees. User must explicitly mention keywords: 'cleanup worktree', 'remove worktree', 'delete worktree'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to clean up or remove worktrees."
---

# Worktree Cleanup Skill

Cleans up a git worktree after a task has been completed and merged. Must be run from the MAIN repository, not from within a worktree.

## File Locations

- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Worktrees**: `task-system/worktrees/task-NNN-{type}/`

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
3. **Ensure latest TASK-LIST.md** with task statuses

## Step 3: Task/Worktree Selection

**With Task ID** (e.g., "cleanup worktree for task 013"):
1. Find worktree for that task: `git worktree list | grep task-XXX`
2. Verify worktree exists
3. Read task status from TASK-LIST.md

**Without Task ID (Interactive Mode)**:
1. **List all worktrees**: `git worktree list`
2. **Filter for task worktrees** (pattern: `task-system/worktrees/task-*`)
3. **Cross-reference** with TASK-LIST.md to get status
4. **Display menu**:
   ```
   Worktrees available for cleanup:

   1. task-001-feature (COMPLETED) - task-system/worktrees/task-001-feature/
   2. task-003-refactor (IN_PROGRESS) - task-system/worktrees/task-003-refactor/
   3. task-005-bugfix (COMPLETED) - task-system/worktrees/task-005-bugfix/

   Select worktree to cleanup (number or task ID), or 'all' for completed only:
   ```
5. **Get user selection**

## Step 4: Confirmation

**For COMPLETED tasks**: Proceed with cleanup immediately

**For IN_PROGRESS tasks**: Warn and confirm:
```
WARNING: Task XXX is still IN_PROGRESS

This task has not been completed. Removing the worktree will:
- Lose any uncommitted changes
- Require recreating the worktree to continue work

Are you sure you want to remove this worktree? (yes/no)
```
- If no: Cancel and STOP
- If yes: Proceed with cleanup

## Step 5: Worktree Removal

For each worktree to remove:

1. **Verify worktree exists**:
   ```bash
   if git worktree list | grep -q "task-system/worktrees/task-XXX-{type}"; then
       echo "Found worktree"
   else
       echo "Worktree not found (may already be removed)"
   fi
   ```

2. **Remove worktree**:
   ```bash
   git worktree remove "task-system/worktrees/task-XXX-{type}" --force
   ```

3. **Handle removal errors**:
   - Dirty directory: Use --force flag
   - Locked worktree: Check for lock file
   - Provide manual cleanup instructions if needed

4. **Prune stale references**:
   ```bash
   git worktree prune
   ```

## Step 6: Update TASK-LIST.md

1. **Read TASK-LIST.md**
2. **Find task entry** with worktree marker: `[worktree: path]`
3. **Remove worktree marker** from the task line
4. **Commit update** (if changes made):
   ```bash
   git add task-system/tasks/TASK-LIST.md
   git commit -m "chore(task-XXX): cleanup worktree"
   git push
   ```

## Step 7: Display Success

```
===============================================================
Worktree Cleanup Complete
===============================================================

Task: XXX
Worktree removed: task-system/worktrees/task-XXX-{type}/
Stale references pruned
TASK-LIST.md updated

---------------------------------------------------------------
Remaining worktrees:
---------------------------------------------------------------
[List remaining worktrees from `git worktree list`]

===============================================================
```

---

## Batch Cleanup

**If user says "cleanup all worktrees"** or selects "all":

1. Filter for COMPLETED tasks only
2. For each completed task with worktree:
   - Remove worktree
   - Update TASK-LIST.md
3. Display summary:
   ```
   Batch Cleanup Complete

   Removed:
   - task-001-feature (COMPLETED)
   - task-005-bugfix (COMPLETED)

   Skipped (still IN_PROGRESS):
   - task-003-refactor

   Total: 2 worktrees removed, 1 skipped
   ```

---

## Error Handling

| Error                        | Message                                              |
| ---------------------------- | ---------------------------------------------------- |
| In worktree                  | "Must run from main repository, not worktree"        |
| Worktree not found           | "No worktree found for task XXX (may already be removed)" |
| Task not found               | "Task XXX not found in TASK-LIST"                    |
| Removal failed               | "Failed to remove worktree - see manual cleanup steps" |
| No worktrees to cleanup      | "No task worktrees found"                            |

### Manual Cleanup (if automatic removal fails)

```
If automatic removal fails, try manual cleanup:

1. Check for uncommitted changes:
   cd task-system/worktrees/task-XXX-{type}
   git status

2. Force remove (loses uncommitted changes):
   git worktree remove task-system/worktrees/task-XXX-{type} --force

3. If still fails, manually delete and prune:
   rm -rf task-system/worktrees/task-XXX-{type}
   git worktree prune

4. Update TASK-LIST.md to remove [worktree: ...] marker
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
- **COMPLETED tasks** are safe to cleanup immediately
- **IN_PROGRESS tasks** require confirmation before cleanup
- **Worktree marker** in TASK-LIST.md is removed after cleanup
- **Stale references** are automatically pruned

## After Cleanup

- Worktree directory is removed from filesystem
- Git references are pruned
- TASK-LIST.md no longer shows worktree marker
- Can start new tasks with **task-start** skill
