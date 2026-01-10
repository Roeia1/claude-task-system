# Task Cleanup Skill

When activated, handles cleanup for a completed task by removing the worktree.

## Prerequisites

- Task PR must be merged
- Must be run from the main repository (not from within a worktree)

## Process

### Step 0: Verify Context

**Check the `$TASK_CONTEXT` environment variable set by the session-init hook:**

```bash
if [ "$TASK_CONTEXT" = "worktree" ]; then
    echo "ERROR: /task-cleanup must be run from the main repository, not from within a task worktree."
    echo "Current task: $CURRENT_TASK_ID"
    echo ""
    echo "Please navigate to the main repository and run /task-cleanup again."
    exit 1
fi
```

**If `$TASK_CONTEXT` is "worktree":**
- Display the error message above
- **STOP** - do not continue

**If `$TASK_CONTEXT` is "main" or unset:** Continue to Step 1.

### Step 1: Extract Task ID

1. **Get task ID from user prompt** (e.g., "cleanup task 015" -> TASK_ID=015)
2. **Normalize task ID** to match folder naming (preserve leading zeros if present)
3. **If no task ID provided**: Ask user to specify the task ID

### Step 2: Check Target Task Worktree

1. **Check if the task's worktree directory exists**:
   ```bash
   WORKTREE_PATH="task-system/tasks/$TASK_ID"
   if [ ! -d "$WORKTREE_PATH" ]; then
       # No worktree found for target task
   fi
   ```
2. **If no worktree found**:
   - Check if task is archived (completed without cleanup)
   - Display: "No worktree found for task $TASK_ID. It may have already been cleaned up."

### Step 3: Verify PR is Merged

1. **Check PR status**:
   ```bash
   # Check for merged PR with task branch
   gh pr list --state merged --head "task-$TASK_ID-" --json number,title,mergedAt
   ```
2. **If PR not merged**:
   ```
   ERROR: Task $TASK_ID PR has not been merged yet.

   Complete the task first using /implement, then merge the PR.
   ```

### Step 4: Remove Worktree

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

### Step 5: Display Success

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
| No task ID in prompt | "Please specify the task ID. Example: cleanup task 015" |
| No worktree found | "No worktree found for task $TASK_ID. May already be cleaned up." |
| PR not merged | "Task $TASK_ID PR has not been merged. Complete the task first." |
| Removal failed | Manual cleanup instructions |

## Notes

- Safe to run multiple times (idempotent - reports already cleaned if no worktree)
- Does not touch archived files - only removes the worktree
