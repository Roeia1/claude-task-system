# complete-task

Completes the task lifecycle by finalizing documentation, merging the PR, and cleaning up. Must be run from within the task's worktree.

## What it does

1. **Verifies location**: Ensures running from a task worktree (not main repo)
2. **Cleans CLAUDE.md**: Removes worktree-specific isolation instructions
3. **Finalizes documentation**: Commits any remaining changes
4. **Finalizes journal**: Adds Phase 8 completion entry
5. **Commits completion**: Records final status in feature branch
6. **Verifies PR readiness**: Checks CI status and review requirements
7. **Merges the PR**: Automatically merges to main branch
8. **Instructs cleanup**: Tells user to run worktree-cleanup from main repo

## Usage

### Interactive Mode (no arguments)

Auto-detects task from current worktree:

```
/task-system:complete-task
```

### Direct Task Selection (with task ID)

Complete specific task (verifies it matches current worktree):

```
/task-system:complete-task 013
```

## Prerequisites

- Must be run from within a task worktree
- Task must have journal.md (work started)
- All work should be committed

---

## Command Logic

### Step 1: Verify Worktree Location

1. **Check current directory** is a worktree (not main repo):
   ```bash
   # .git is a file in worktree, directory in main repo
   if [ -d ".git" ]; then
       # We're in main repo - error
       ERROR="Must run from worktree"
   fi
   ```

2. **Extract task ID** from worktree path:
   ```bash
   CURRENT_DIR=$(pwd)
   # Pattern: task-system/tasks/NNN
   TASK_ID=$(echo "$CURRENT_DIR" | grep -oP 'task-system/tasks/\K\d+')
   ```

3. **If user provided task ID**, verify it matches current worktree

4. **If in main repo**, display error:
   ```
   Error: This command must be run from a task worktree

   You are in the main repository.

   To complete a task:
   1. cd task-system/tasks/XXX
   2. /task-system:complete-task

   Or use worktree-cleanup skill if task is already merged.
   ```

### Step 2: Verify Task State

1. **Check journal.md exists** (indicates work was started)
2. **If no journal.md**: Warning "Task may not have been properly started"
3. **Verify task.md exists**: Read task definition

### Step 3: Clean CLAUDE.md

**Important**: The task-start skill may add worktree-specific isolation instructions to CLAUDE.md. These must be removed before merging to avoid polluting the main repository.

1. **Check for worktree-specific content**:
   ```bash
   if grep -q "# Task .* Worktree - ISOLATED ENVIRONMENT" CLAUDE.md; then
       HAS_ISOLATION=true
   fi
   ```

2. **Remove isolation instructions** (keep original content):
   ```bash
   # Find the marker and keep everything after it
   # The isolation instructions end with "---" before original content
   sed -i '1,/^---$/d' CLAUDE.md
   ```

3. **Verify CLAUDE.md is clean** (no isolation instructions remain)

### Step 4: Pre-Completion Checks

1. **Check for uncommitted changes**: `git status --porcelain`
2. **If changes exist** (including CLAUDE.md cleanup):
   ```bash
   git add .
   git commit -m "docs(task-XXX): final updates before completion"
   ```
3. **Push any commits**: `git push`

### Step 5: Add Journal Completion Entry

1. **Read journal** at `task-system/tasks/XXX/journal.md`
2. **Add Phase 8 completion entry** with timestamp

**Journal Entry Template**:
```markdown
### [Date] - Phase 8: Completion

**Task XXX COMPLETED Successfully**
- Final documentation committed and reflection complete
- All sub-tasks verified complete
- All objectives achieved with comprehensive verification
- PR successfully merged into main branch

**Quality Impact:** [Brief summary of what was accomplished]

**Status:** TASK COMPLETE - [Brief description of completion]
```

### Step 6: Commit Completion Updates

1. **Stage changes**: `git add task-system/`
2. **Commit**: `git commit -m "docs(task-XXX): complete Phase 8 documentation"`
3. **Push**: `git push`

### Step 7: Verify PR Readiness

1. **Get PR status**: `gh pr view --json state,mergeable,reviews,statusCheckRollup`
2. **Check PR is open** (not already merged)
3. **Verify status checks** are passing
4. **Ensure PR is mergeable** (no conflicts)
5. **Check reviews** if required

If issues found:
- **Failed checks**: Show which checks failed, ask to fix first
- **Merge conflicts**: Ask user to resolve conflicts first
- **Review required**: Show review status, ask to get reviews
- **Already merged**: Skip to Step 9 (instructions)

### Step 8: Merge the PR

1. **Display PR information** for final confirmation
2. **Merge**: `gh pr merge --squash --delete-branch`
3. **If merge fails**, show error and exit
4. **Confirm merge** successful

### Step 9: Display Success and Cleanup Instructions

```
===============================================================
Task XXX Completed Successfully!
===============================================================

CLAUDE.md cleaned (isolation instructions removed)
Journal updated with Phase 8 completion
PR #YY merged to main branch
Task branch deleted

---------------------------------------------------------------
NEXT STEP: Cleanup the worktree
---------------------------------------------------------------

To remove the worktree (from main repository):

1. Open a new terminal
2. cd [main-repo-path]
3. Say "cleanup worktree for task XXX"

Or: git worktree remove task-system/tasks/XXX

The task is now COMPLETED (PR merged).
Use "list tasks" from main repo to verify.
===============================================================
```

---

## Error Handling

### Not in Worktree
```
Error: This command must be run from a task worktree

You are in the main repository.

To complete a task:
1. cd task-system/tasks/XXX
2. Run this command again
```

### Task ID Mismatch
```
Error: Task ID XXX doesn't match this worktree (task YYY)

You are in worktree for task YYY.
Either:
1. Run without task ID to complete task YYY
2. Or navigate to the correct worktree for task XXX
```

### No Journal Found
```
Warning: journal.md not found for task XXX

This task may not have been properly started.
Continue with completion anyway? (y/n)
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
Please resolve conflicts in the GitHub UI or locally, then run complete-task again.
```

### Already Merged
```
Warning: PR #XX is already merged.

The task documentation has been updated.
Please run worktree-cleanup from the main repository to remove the worktree.
```

---

## Success Output

```
Completing Task XXX...

Verified running from worktree: task-system/tasks/XXX
Cleaned CLAUDE.md (removed isolation instructions)
Pre-completion checks passed
Journal updated with completion entry
All changes committed to feature branch
PR #YY ready to merge (all checks passing)
PR successfully merged to main

===============================================================
Task XXX is now complete!
===============================================================

NEXT STEP: Cleanup the worktree from main repository
Run: "cleanup worktree for task XXX"
```

---

## Important Notes

- **Must run from worktree** - this command operates on tasks in worktrees
- **CLAUDE.md cleanup is automatic** - isolation instructions are removed before merge
- **Journal gets final entry** - Phase 8 completion is documented
- **PR is squash-merged** - feature branch is deleted after merge
- **Worktree cleanup is separate** - run worktree-cleanup from main repo after completion
- **Task status is derived** - after PR merge, task shows as COMPLETED in `list tasks`
