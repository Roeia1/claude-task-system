---
name: worktree-cleanup
description: "ONLY activate on DIRECT user request to cleanup worktrees. User must explicitly mention keywords: 'cleanup worktree', 'remove worktree', 'delete worktree'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to clean up or remove worktrees."
---

# Worktree Cleanup Skill

When activated, remove worktrees after parallel task completion (Step 2 of 2 for parallel task completion).

## File Locations

- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Cleanup Queue**: `.claude/.worktree-cleanup-queue` (if exists)
- **Full Workflow**: Plugin's `commands/parallel-cleanup-worktree.md`

## Prerequisites

- Task must be finalized first using **parallel-task-finalization** skill
- PR must be merged to main branch
- **Must be run from the MAIN repository**, not from within a worktree

## Important

This is Step 2 of 2. First run **parallel-task-finalization** from the worktree, then run this skill from the main repository.

## Process

### Step 1: Verify Main Repository

1. **Check current directory** is main repository (not a worktree):
   - `.git` is a directory (not a file)
   - Path doesn't contain `/task-system/worktrees/`
2. **If in worktree**, error with instructions to run from main repo

### Step 2: Update Main Branch

1. **Checkout main**: `git checkout master`
2. **Pull latest changes**: `git pull`
3. **Ensure latest TASK-LIST.md** with completed tasks

### Step 3: Task Selection

**With --all Flag**:
- Read `.claude/.worktree-cleanup-queue` if exists
- Process all entries in queue
- Continue with cleanup for each

**With Task ID Argument**:
- Use provided task ID
- Read `task-system/tasks/TASK-LIST.md` to find task in COMPLETED
- Look for worktree path in cleanup queue or git worktree list

**Without Arguments (Interactive Mode)**:
1. **List all worktrees**: `git worktree list`
2. **Read cleanup queue**: `.claude/.worktree-cleanup-queue`
3. **Cross-reference** with COMPLETED tasks in TASK-LIST.md
4. **Display menu** of worktrees that can be cleaned up
5. **Get user selection** or 'a' for all

### Step 4: Worktree Removal

For each worktree to remove:

1. **Verify worktree exists**:
   ```bash
   git worktree list | grep -q "task-system/worktrees/task-XXX-{type}"
   ```
2. **Remove worktree safely**:
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

### Step 5: Update Cleanup Queue

1. **Remove processed entries** from `.claude/.worktree-cleanup-queue`
2. **Delete queue file** if empty
3. **Log cleaned worktrees**

### Step 6: Verify Cleanup

1. **Run git worktree list** to show remaining worktrees
2. **Confirm removed worktrees** no longer appear
3. **Check filesystem** to ensure directories removed

## Usage Modes

### Single Worktree
```
worktree-cleanup [activate with task ID]
```

### Cleanup All
```
worktree-cleanup --all
```
or mention "cleanup all worktrees"

### Interactive
```
worktree-cleanup [activate without arguments]
```

## Error Handling

- **Not in main repository**: Error with path correction
- **Task not found**: Verify task ID is correct
- **Task not completed**: Must finalize first
- **Worktree not found**: May already be removed
- **Removal failed**: Provide manual cleanup options

## Success Output

### Single Cleanup
```
Cleaning up worktree for Task XXX...

Verified running from main repository
Updated to latest main branch
Found worktree: task-system/worktrees/task-XXX-{type}
Worktree removed successfully
Stale references pruned
Cleanup queue updated

Task XXX cleanup complete!

Remaining worktrees:
- main (master)
```

### Multiple Cleanup
```
Cleaning up all pending worktrees...

Processing cleanup queue (3 items):

[1/3] Task 013 - task-system/worktrees/task-013-feature
Worktree removed successfully

[2/3] Task 015 - task-system/worktrees/task-015-feature
Worktree removed successfully

[3/3] Task 016 - task-system/worktrees/task-016-bugfix
Worktree not found (already removed)

Cleanup complete!
- 2 worktrees removed
- 1 already cleaned up
- Cleanup queue cleared

No worktrees remaining.
```

## Important Notes

- **Must run from main repository**, not from worktree
- Task must be completed and merged before cleanup
- Accepts task ID, --all flag, or interactive selection
- Safe removal with force option for dirty worktrees
- Maintains cleanup queue for tracking pending cleanups
- Complementary to **parallel-task-finalization** skill

## Next Steps

After cleanup:
- Worktree directory removed from filesystem
- Git references pruned
- Can start new tasks with **task-start** or **parallel-task-start**

## References

- Complete workflow details: Plugin's `commands/parallel-cleanup-worktree.md`
