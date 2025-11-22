# complete-task

Completes the entire task lifecycle by finalizing documentation, merging the PR, and updating all tracking.

## What it does

1. **Finalizes documentation**: Commits any remaining changes
2. **Updates task status**: Moves task to COMPLETED in TASK-LIST.md
3. **Finalizes journal**: Adds Phase 8 completion entry
4. **Commits completion**: Records final status in feature branch
5. **Verifies PR readiness**: Checks CI status and review requirements
6. **Merges the PR**: Automatically merges to main branch
7. **Updates repository**: Switches to main branch and pulls changes

## Usage

### Interactive Mode (no arguments)

Shows menu of IN_PROGRESS tasks to complete:

```
/project:complete-task
```

### Direct Task Selection (with task ID)

Complete specific task directly:

```
/project:complete-task 013
```

This command is for regular (non-worktree) tasks only. For parallel tasks, use `/project:parallel-finalize-task` from the worktree, then `/project:parallel-cleanup-worktree` from main repo.

## Command Logic

### Step 1: Task Selection

**With Task ID Argument**:
- Use provided task ID (e.g., `/project:complete-task 013`)
- Verify task exists and is IN_PROGRESS in TASK-LIST.md
- Check task does NOT have `[worktree: path]` marker
- If worktree task, error: "Task XXX is in a worktree. Use /project:parallel-finalize-task from within the worktree."

**Without Arguments (Interactive Mode)**:
1. Read TASK-LIST.md to find all IN_PROGRESS tasks
2. Filter out tasks with `[worktree: path]` markers
3. Display numbered menu of regular tasks only:
   ```
   Select task to complete:
   1. [009] Design PostgreSQL Schema (IN_PROGRESS - Phase 7)
   2. [011] Create User API (IN_PROGRESS - Phase 6)
   
   Select task (1-2):
   ```
4. Get user selection

### Step 2: Pre-Completion Checks

1. Check current directory is the main repository (not a worktree)
2. Checkout task branch: `git checkout feature/task-XXX-*`
3. Check for uncommitted changes: `git status --porcelain`
4. If changes exist, commit them: `git add . && git commit -m "docs(task-XXX): final updates before completion"`
5. Push any commits: `git push`

### Step 3: Update TASK-LIST.md

1. Read current TASK-LIST.md
2. Find task in IN_PROGRESS section
3. Extract task details and format for COMPLETED section
4. Move task from IN_PROGRESS to top of COMPLETED section
5. Format: `- ✅ [Task Title] ([Summary of achievements]) [task-type]`

### Step 4: Add Journal Completion Entry

1. Read task journal at `execution/tasks/XXX/journal.md`
2. Update "Current Phase" header to "COMPLETED"
3. Add Phase 8 completion entry with timestamp
4. Include summary of achievements and quality impact

**Journal Entry Template**:
```markdown
### [Date] - Phase 8: Completion

**Task XXX COMPLETED Successfully**
- ✅ Final documentation committed and reflection complete
- ✅ Task status updated to COMPLETED in TASK-LIST.md
- ✅ All sub-tasks verified complete
- ✅ All objectives achieved with comprehensive verification
- ✅ PR successfully merged into main branch

**Quality Impact:** [Brief summary of what was accomplished]

**Status:** TASK COMPLETE - [Brief description of completion]
```

### Step 5: Commit Completion Updates

1. Stage changes: `git add execution/`
2. Commit with message: `git commit -m "docs(task-XXX): complete Phase 8 documentation"`
3. Push to remote: `git push`

### Step 6: Verify PR Readiness

1. Use `gh pr view --json state,mergeable,reviews,statusCheckRollup` to get PR status
2. Check PR is open (not already merged)
3. Verify all status checks are passing
4. Ensure PR is mergeable (no conflicts)
5. Check if reviews are required and approved

If any issues found:
- **Failed checks**: Show which checks failed, ask to fix first
- **Merge conflicts**: Ask user to resolve conflicts first
- **Review required**: Show review status, ask to get reviews
- **Already merged**: Skip to Step 8 (update repository)

### Step 7: Merge the PR

1. Display PR information for final confirmation
2. Merge using: `gh pr merge --squash --delete-branch`
3. If merge fails, show error and exit
4. Confirm merge successful

### Step 8: Update Repository

1. Switch to main branch: `git checkout master`
2. Pull latest changes: `git pull origin master`
3. Ensure working directory is clean

## Error Handling

### Task Selection Issues
```
Error: Task XXX is in a worktree
Location: worktrees/task-XXX-feature

Use /project:parallel-finalize-task from within the worktree.
```

```
Error: Task XXX is not IN_PROGRESS
Current status: COMPLETED

This task has already been completed.
```

```
Error: No regular IN_PROGRESS tasks found
All IN_PROGRESS tasks are in worktrees.

Use /project:parallel-finalize-task from within each worktree.
```

### PR Not Ready
```
Error: PR cannot be merged yet
- Status checks: 2 failing
- Reviews: 0 of 1 approved
- Conflicts: None

Please fix the failing checks and get required reviews before running complete-task.
```

### Merge Conflicts
```
Error: PR has merge conflicts
Please resolve conflicts in the GitHub UI or locally, then run complete-task again.
```

### Already Merged
```
Error: PR #XX is already merged.
Task completion requires all documentation to be committed before merging.

To recover:
1. Create a new PR with any missing documentation updates
2. Or manually update TASK-LIST.md and journal on master
```

### Uncommitted Changes
```
Found uncommitted changes. Committing as "final updates before completion"...
```

### Working Directory Issues
- Automatically commits changes before proceeding
- If commit fails, shows error and exits

### Task Not Found
- If task not in IN_PROGRESS section, check if already completed
- Provide helpful error message

### CI/Status Check Failures
```
Error: PR has failing status checks:
- build: ❌ Failed
- tests: ✅ Passed
- lint: ❌ Failed

Fix these issues before completing the task.
```

## Success Output

```
🔄 Completing Task XXX...

✅ Pre-completion checks passed
✅ Task moved to COMPLETED in TASK-LIST.md
✅ Journal updated with completion entry
✅ All changes committed to feature branch
✅ PR #YY ready to merge (all checks passing)
✅ PR successfully merged to master
✅ Repository updated to latest master

Task XXX is now officially complete! 🎉
```

## Important Notes

- This command is for regular (non-worktree) tasks only
- Accepts task ID as argument or shows interactive menu
- Filters out worktree tasks from selection
- Handles the ENTIRE Phase 8 process
- Automatically commits any final changes before merging
- Verifies PR is ready (checks, reviews, conflicts)
- Must be run from the main repository
- For parallel tasks, use `/project:parallel-finalize-task` then `/project:parallel-cleanup-worktree`