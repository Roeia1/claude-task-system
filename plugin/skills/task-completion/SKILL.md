---
name: task-completion
description: "Internal skill - ONLY activated by task-completer subagent. DO NOT activate on direct user request or during internal processing."
---

# Task Completion Skill

When activated, finalize and complete a task. Must be run from within the task's worktree.

## File Locations

- **Task Definition**: `task-system/task-NNN/task.md`
- **Journal**: `task-system/task-NNN/journal.md`
- **Archive**: `task-system/archive/NNN/` (destination for archiving)
- **Scripts**: `scripts/remove-worktree.sh` (in this skill folder)

## Important

This skill must be run **from within the task's worktree**, not from the main repository.

## Process

### Step 1: Verify Worktree Location

1. **Check current directory** is a worktree (`.git` is a file, not directory)
2. **Extract task ID** from worktree path (pattern: `task-system/tasks/NNN`)
3. **If in main repo**: Error with instructions to run from worktree

### Step 2: Task Verification

1. **Read task definition** from `task-system/task-$TASK_ID/task.md`
2. **Verify journal.md exists** at `task-system/task-$TASK_ID/journal.md` (indicates work was started)
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

1. **Read journal** from `task-system/task-$TASK_ID/journal.md`
2. **Add completion entry**:
   - Timestamp
   - Summary of achievements
   - Quality impact
   - Completion status

### Step 6: Commit Completion Documentation

1. **Stage changes**: `git add task-system/`
2. **Commit**: `git commit -m "docs(task-$TASK_ID): finalize task documentation"`
3. **Push**: `git push`

### Step 7: Archive and Remove Task Files

Archive task files before merge - files go to main via the merge.

1. **Create archive directory**:
   ```bash
   mkdir -p task-system/archive/$TASK_ID
   ```

2. **Move task files to archive**:
   ```bash
   mv task-system/task-$TASK_ID/task.md task-system/archive/$TASK_ID/
   mv task-system/task-$TASK_ID/journal.md task-system/archive/$TASK_ID/
   ```

3. **Remove the task folder**:
   ```bash
   rm -rf task-system/task-$TASK_ID
   ```

4. **Commit archive + deletion together**:
   ```bash
   git add task-system/archive/$TASK_ID/ task-system/task-$TASK_ID
   git commit -m "archive(task-$TASK_ID): move task files to archive before merge"
   git push
   ```

This ensures:
- Archive files go to main via merge
- `task-system/task-NNN/` folder is removed before merge
- Single atomic commit for archive operation

### Step 8: Verify PR Readiness

1. **Check PR status** using `gh pr view`
2. **Verify**:
   - All status checks passing
   - PR is mergeable (no conflicts)
   - Required reviews approved
3. **Handle issues** if found (failed checks, conflicts, missing reviews)

### Step 9: Merge the PR

1. **Display PR information** for final confirmation
2. **Merge**: `gh pr merge --squash --delete-branch`
3. **Confirm merge successful**

### Step 10: Remove Worktree

Determine paths and remove the worktree:

1. **Capture paths before removal**:
   ```bash
   WORKTREE=$(git rev-parse --show-toplevel)
   MAIN_REPO=$(dirname "$(git rev-parse --git-common-dir)")
   ```

2. **Remove worktree**:
   ```bash
   bash scripts/remove-worktree.sh $MAIN_REPO $WORKTREE
   ```

3. **Display final success**:
   ```
   ===============================================================
   Task $TASK_ID Completed Successfully!
   ===============================================================

   - Task files archived to task-system/archive/$TASK_ID/
   - PR merged to main branch
   - Task branch deleted from remote
   - Worktree removed

   ---------------------------------------------------------------
   IMPORTANT: Your terminal is now in a deleted directory.
   Run: cd $MAIN_REPO
   ---------------------------------------------------------------
   ===============================================================
   ```

## Error Handling

- **Not in worktree**: Error with instructions to run from worktree
- **Task ID mismatch**: Error showing which task this worktree is for
- **No journal.md**: Warning that task may not have been properly started
- **PR not ready**: Show which checks/reviews are blocking
- **Merge conflicts**: Instructions to resolve conflicts
- **Already merged**: Skip to worktree removal
- **Worktree removal failed**: Display manual cleanup instructions:
  ```
  If automatic removal fails, try manual cleanup:
  1. Navigate to main repo: cd $MAIN_REPO
  2. Force remove worktree: git worktree remove $WORKTREE --force
  3. If still fails: rm -rf $WORKTREE && git worktree prune
  ```

## Status After Completion

After successful completion:
- Task files archived to `task-system/archive/NNN/`
- PR is merged to main branch
- Task branch is deleted from remote
- Worktree is removed
- Task will show as COMPLETED in `list tasks` (PR merged)
