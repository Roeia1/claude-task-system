---
name: task-cleanup
description: "ONLY activate on DIRECT user request to cleanup a task. User must explicitly mention keywords: 'cleanup task', 'remove worktree', 'clean task'. Only use when user directly asks to cleanup a completed task."
---

# Task Cleanup Skill

When activated, remove the worktree for a completed task. Must be run from the main repository (not from a worktree).

## Prerequisites

- Task PR must be merged
- Must be run from main repo, not from inside a worktree

## Process

### Step 1: Extract Task ID

1. **Get task ID from user prompt** (e.g., "cleanup task 015" -> TASK_ID=015)
2. **Normalize task ID** to match folder naming (preserve leading zeros if present)
3. **If no task ID provided**: Ask user to specify the task ID

### Step 2: Verify Running from Main Repo

1. **Check `.git` is a directory** (not a file):
   ```bash
   if [ -f ".git" ]; then
       # This is a worktree, not main repo
       ERROR
   fi
   ```
2. **If in worktree**: Error with instructions:
   ```
   ERROR: You are in a worktree, not the main repository.

   To cleanup task $TASK_ID:
   1. Navigate to main repo first
   2. Then say: "cleanup task $TASK_ID"
   ```

### Step 3: Verify Worktree Exists

1. **Check worktree directory exists**:
   ```bash
   WORKTREE_PATH="task-system/tasks/$TASK_ID"
   if [ ! -d "$WORKTREE_PATH" ]; then
       # No worktree found
   fi
   ```
2. **If no worktree found**:
   - Check if task is archived (completed without cleanup)
   - Display: "No worktree found for task $TASK_ID. It may have already been cleaned up."

### Step 4: Verify PR is Merged

1. **Check PR status**:
   ```bash
   # Check for merged PR with task branch
   gh pr list --state merged --head "task-$TASK_ID-" --json number,title,mergedAt
   ```
2. **If PR not merged**:
   ```
   ERROR: Task $TASK_ID PR has not been merged yet.

   Complete the task first:
   1. Navigate to worktree: cd task-system/tasks/$TASK_ID
   2. Complete the workflow and merge the PR
   3. Then return here to cleanup
   ```

### Step 5: Remove Worktree

1. **Remove the worktree**:
   ```bash
   git worktree remove "task-system/tasks/$TASK_ID" --force
   ```
2. **Prune stale references**:
   ```bash
   git worktree prune
   ```
3. **Handle removal failure**: If removal fails, display manual instructions:
   ```
   Automatic removal failed. Try manual cleanup:

   git worktree remove task-system/tasks/$TASK_ID --force

   If that fails:
   rm -rf task-system/tasks/$TASK_ID
   git worktree prune
   ```

### Step 6: Display Success

```
===============================================================
Task $TASK_ID Cleanup Complete
===============================================================

- Worktree removed: task-system/tasks/$TASK_ID
- Task files preserved in archive: task-system/archive/$TASK_ID/

Task $TASK_ID is now fully completed.
===============================================================
```

## Error Handling

| Error | Message |
|-------|---------|
| No task ID | "Please specify the task ID. Example: cleanup task 015" |
| In worktree | "Run cleanup from main repository, not from a worktree" |
| No worktree found | "No worktree found for task $TASK_ID. May already be cleaned up." |
| PR not merged | "Task $TASK_ID PR has not been merged. Complete the merge first." |
| Removal failed | Manual cleanup instructions |

## Notes

- This skill is user-facing (activated by direct user request)
- Safe to run multiple times (idempotent - just reports already cleaned if no worktree)
- Does not touch archived files - only removes the worktree
