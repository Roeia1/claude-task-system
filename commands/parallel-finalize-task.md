# parallel-finalize-task

Finalizes a parallel task by completing all documentation and merging the PR. This is step 1 of 2 for completing parallel tasks.

## What it does

1. **Task selection**: Shows IN_PROGRESS worktree tasks or uses provided task ID
2. **Switches to worktree**: Changes to the task's worktree directory
3. **Removes worktree-specific CLAUDE.md content**: Cleans up isolation instructions
4. **Finalizes documentation**: Updates TASK-LIST.md and journal in worktree
5. **Commits all changes**: Ensures all documentation is in the feature branch
6. **Verifies PR readiness**: Checks CI status and review requirements
7. **Merges the PR**: Automatically merges to main branch

After this command, run `/task-system:parallel-cleanup-worktree` from the main repository to remove the worktree.

## Usage

### Interactive Mode (no arguments)

Shows menu of IN_PROGRESS worktree tasks to finalize:

```
/task-system:parallel-finalize-task
```

### Direct Task Selection (with task ID)

Finalize specific parallel task directly:

```
/task-system:parallel-finalize-task 013
```

This command is for parallel (worktree) tasks only. For regular tasks, use `/task-system:complete-task`.

## Command Logic

**Important**: The parallel-start-task command adds worktree-specific isolation instructions to CLAUDE.md. These must be removed before merging to avoid polluting the main repository's CLAUDE.md file.

### Step 1: Task Selection

**With Task ID Argument**:
- Use provided task ID (e.g., `/task-system:parallel-finalize-task 013`)
- Verify task exists and is IN_PROGRESS in TASK-LIST.md
- Check task HAS `[worktree: path]` marker
- If not worktree task, error: "Task XXX is not in a worktree. Use /task-system:complete-task instead."
- Extract worktree path from TASK-LIST.md

**Without Arguments (Interactive Mode)**:
1. Read TASK-LIST.md to find all IN_PROGRESS tasks
2. Filter for tasks WITH `[worktree: path]` markers only
3. Display numbered menu of worktree tasks:
   ```
   Select parallel task to finalize:
   1. [013] Enable Parallel Task Execution (IN_PROGRESS - Phase 7) [worktree: task-system/worktrees/task-013-feature]
   2. [015] Add Search Feature (IN_PROGRESS - Phase 6) [worktree: task-system/worktrees/task-015-feature]

   Select task (1-2):
   ```
4. Get user selection and extract worktree path

### Step 2: Switch to Worktree

1. Change to the worktree directory: `cd [worktree-path]`
2. Verify we're in the correct worktree
3. Confirm task branch is checked out

### Step 3: Pre-Completion in Worktree

1. Remove worktree-specific CLAUDE.md additions:
   - Check if CLAUDE.md contains worktree isolation instructions
   - Remove the worktree-specific section (everything before original content)
   - Keep only the original Claude Code Instructions content
   ```bash
   # Example: Remove worktree-specific content from CLAUDE.md
   if grep -q "# Task .* Worktree - ISOLATED ENVIRONMENT" CLAUDE.md; then
       # Extract content starting from original content marker
       sed -i '/# Claude Code Instructions/,$!d' CLAUDE.md
       echo "Removed worktree-specific CLAUDE.md content"
   fi
   ```
2. Check for uncommitted changes: `git status --porcelain`
3. If changes exist (including CLAUDE.md cleanup), commit: `git add . && git commit -m "docs(task-XXX): final updates before completion"`
4. Push any commits: `git push`

### Step 4: Update Task Status in Worktree

1. Read TASK-LIST.md
2. Find task in IN_PROGRESS section with worktree marker
3. Remove worktree marker from task line
4. Move task to COMPLETED section
5. Format: `- [Task Title] ([Summary]) [type]`

### Step 5: Finalize Journal in Worktree

1. Read journal at `task-system/tasks/XXX/journal.md`
2. Update "Current Phase" to "COMPLETED"
3. Add Phase 8 completion entry
4. Include note about parallel execution

**Journal Entry Addition**:
```markdown
### [Date] - Phase 8: Completion

**Task XXX COMPLETED Successfully**
- Final documentation committed and reflection complete
- Task status updated to COMPLETED in TASK-LIST.md
- All sub-tasks verified complete
- All objectives achieved with comprehensive verification
- PR successfully merged into main branch
- Parallel worktree ready for cleanup

**Quality Impact:** [Summary of achievements]

**Status:** TASK COMPLETE - [Description]

**Note:** This task was completed using parallel execution workflow.
```

### Step 6: Commit Completion Documentation

1. Stage changes: `git add task-system/`
2. Commit: `git commit -m "docs(task-XXX): complete Phase 8 documentation"`
3. Push: `git push`

### Step 7: Verify and Merge PR

1. Check PR status with `gh pr view --json state,mergeable,reviews,statusCheckRollup`
2. Verify all status checks are passing
3. Ensure PR is mergeable (no conflicts)
4. Check if reviews are required and approved
5. Display PR information for final confirmation
6. Merge PR: `gh pr merge --squash --delete-branch`
7. If already merged, error out (documentation should be committed before merge)

### Step 8: Save Cleanup Information

1. Get current worktree path: `pwd`
2. Save to cleanup queue: `echo "task-XXX|$(pwd)|$(date)" >> ../../.claude/.worktree-cleanup-queue`
3. Display next steps for cleanup

## Error Handling

### Task Selection Issues
```
Error: Task XXX is not in a worktree
This task is in the main repository.

Use /task-system:complete-task instead.
```

```
Error: Task XXX is not IN_PROGRESS
Current status: COMPLETED

This task has already been completed.
```

```
Error: No parallel IN_PROGRESS tasks found
All IN_PROGRESS tasks are in the main repository.

Use /task-system:complete-task for regular tasks.
```

### Worktree Access Issues
```
Error: Cannot access worktree at task-system/worktrees/task-XXX-type
Worktree may have been manually removed.

Please check if the worktree exists or run from the main repository.
```

### PR Not Ready
```
Error: PR cannot be merged yet
- Status checks: 2 failing
- Reviews: 0 of 1 approved
- Conflicts: None

Please fix the failing checks and get required reviews before completing.
```

### Merge Conflicts
```
Error: PR has merge conflicts
Please resolve conflicts in the GitHub UI or locally, then run parallel-finalize-task again.
```

### Already Merged
```
Error: PR #XX is already merged.
Task completion requires all documentation to be committed before merging.

To recover:
1. Create a new PR from the worktree with documentation updates
2. Or manually update TASK-LIST.md and journal on master
```

## Success Output

```
Finalizing Task XXX (parallel)...

Switched to worktree: task-system/worktrees/task-XXX-type
Removed worktree-specific CLAUDE.md content
Pre-completion checks passed
Task moved to COMPLETED in TASK-LIST.md
Journal updated with completion entry
All changes committed to feature branch
PR #YY ready to merge (all checks passing)
PR successfully merged to master

Task XXX is now finalized!

NEXT STEP: Cleanup the worktree

To complete the task cleanup:

1. Open a NEW Claude Code session from the main repository
2. Run: /task-system:parallel-cleanup-worktree XXX

The worktree will be removed and the task will be fully complete.

Current worktree: task-system/worktrees/task-XXX-type
```

## Important Notes

- This command is for parallel (worktree) tasks only
- Accepts task ID as argument or shows interactive menu
- Filters to show only worktree tasks from selection
- Automatically switches to the correct worktree
- Handles documentation finalization and PR merge ONLY
- Does NOT remove the worktree (use parallel-cleanup-worktree for that)
- For regular tasks, use `/task-system:complete-task`
