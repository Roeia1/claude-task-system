# parallel-cleanup-worktree

Cleans up a worktree after a parallel task has been finalized and merged. This is step 2 of 2 for completing parallel tasks.

## Prerequisites

- Task must be finalized first using `/project:parallel-finalize-task`
- PR must be merged to main branch
- Must be run from the MAIN repository, not from within a worktree

## What it does

1. **Verifies location**: Ensures running from main repository
2. **Updates main branch**: Pulls latest changes
3. **Task selection**: Shows completed worktree tasks or uses provided task ID
4. **Removes worktree**: Safely removes the git worktree
5. **Cleans up references**: Prunes any stale worktree references
6. **Updates cleanup queue**: Removes entry from cleanup queue if present

## Usage

### Interactive Mode (no arguments)

Shows menu of completed tasks with worktrees to clean up:

```
/project:parallel-cleanup-worktree
```

### Direct Task Selection (with task ID)

Clean up specific task's worktree directly:

```
/project:parallel-cleanup-worktree 013
```

### Cleanup All Pending Worktrees

Clean up all worktrees in the cleanup queue:

```
/project:parallel-cleanup-worktree --all
```

## Command Logic

### Step 1: Verify Main Repository

1. Check current directory is main repository (not a worktree)
2. Verify by checking:
   - `.git` is a directory (not a file, which indicates worktree)
   - Current directory path doesn't contain `/worktrees/`
3. If in worktree, error with instructions to run from main repo

### Step 2: Update Main Branch

1. Checkout master: `git checkout master`
2. Pull latest changes: `git pull`
3. Ensure we have the latest TASK-LIST.md with completed tasks

### Step 3: Task Selection

**With --all Flag**:
- Read `.claude/.worktree-cleanup-queue` if it exists
- Process all entries in the queue
- Continue with cleanup for each entry

**With Task ID Argument**:
- Use provided task ID (e.g., `/project:parallel-cleanup-worktree 013`)
- Read TASK-LIST.md to find task in COMPLETED section
- Look for worktree path in cleanup queue or git worktree list
- If not found, check if worktree still exists

**Without Arguments (Interactive Mode)**:
1. List all current worktrees: `git worktree list`
2. Read `.claude/.worktree-cleanup-queue` for pending cleanups
3. Cross-reference with COMPLETED tasks in TASK-LIST.md
4. Display menu of worktrees that can be cleaned up:
   ```
   Select worktree to clean up:
   1. [013] Enable Parallel Task Execution - worktrees/task-013-feature
   2. [015] Add Search Feature - worktrees/task-015-feature
   
   Select worktree (1-2) or 'a' for all:
   ```

### Step 4: Worktree Removal

For each worktree to remove:

1. **Verify worktree exists**:
   ```bash
   if git worktree list | grep -q "worktrees/task-XXX-type"; then
       echo "Found worktree: worktrees/task-XXX-type"
   else
       echo "Worktree already removed or doesn't exist"
       continue
   fi
   ```

2. **Remove worktree safely**:
   ```bash
   git worktree remove "worktrees/task-XXX-type" --force
   ```

3. **Handle removal errors**:
   - If directory is dirty, use --force flag
   - If worktree is locked, check for .git/worktrees/*/locked file
   - If removal fails, provide manual cleanup instructions

4. **Prune stale references**:
   ```bash
   git worktree prune
   ```

### Step 5: Update Cleanup Queue

1. Remove processed entries from `.claude/.worktree-cleanup-queue`
2. If queue is empty, delete the file
3. Log which worktrees were cleaned up

### Step 6: Verify Cleanup

1. Run `git worktree list` to show remaining worktrees
2. Confirm removed worktrees no longer appear
3. Check filesystem to ensure directories are removed

## Error Handling

### Not in Main Repository
```
Error: This command must be run from the main repository

You are currently in: worktrees/task-XXX-type
Please run this command from: /home/roei/projects/Titinski

cd /home/roei/projects/Titinski
/project:parallel-cleanup-worktree XXX
```

### Task Not Found
```
Error: Task XXX not found in TASK-LIST.md
Please verify the task ID is correct.
```

### Task Not Completed
```
Error: Task XXX is still IN_PROGRESS
Tasks must be completed and merged before cleanup.

Run /project:parallel-finalize-task XXX first.
```

### Worktree Not Found
```
Warning: No worktree found for task XXX
The worktree may have been manually removed already.

Current worktrees:
- main (master)
- worktrees/task-014-refactor (task-014-refactor)
```

### Worktree Removal Failed
```
Error: Failed to remove worktree worktrees/task-XXX-type
Reason: Directory contains uncommitted changes

Options:
1. Force removal (will lose changes):
   git worktree remove worktrees/task-XXX-type --force

2. Save changes first:
   cd worktrees/task-XXX-type
   git stash or git commit changes
   Then run cleanup again
```

### No Cleanup Queue
```
Info: No cleanup queue file found
Showing all worktrees that can be cleaned up...
```

## Success Output

### Single Worktree Cleanup
```
🧹 Cleaning up worktree for Task XXX...

✅ Verified running from main repository
✅ Updated to latest main branch
✅ Found worktree: worktrees/task-XXX-type
✅ Worktree removed successfully
✅ Stale references pruned
✅ Cleanup queue updated

Task XXX cleanup complete! 

Remaining worktrees:
- main (master)
```

### Multiple Worktree Cleanup (--all)
```
🧹 Cleaning up all pending worktrees...

Processing cleanup queue (3 items):

[1/3] Task 013 - worktrees/task-013-feature
✅ Worktree removed successfully

[2/3] Task 015 - worktrees/task-015-feature  
✅ Worktree removed successfully

[3/3] Task 016 - worktrees/task-016-bugfix
⚠️  Worktree not found (already removed)

Cleanup complete!
- 2 worktrees removed
- 1 already cleaned up
- Cleanup queue cleared

No worktrees remaining.
```

## Important Notes

- Must be run from the MAIN repository, not from within a worktree
- Task must be completed and merged before cleanup
- Accepts task ID, --all flag, or interactive selection
- Safe removal with force option for dirty worktrees
- Maintains cleanup queue for tracking pending cleanups
- Complementary to `/project:parallel-finalize-task`