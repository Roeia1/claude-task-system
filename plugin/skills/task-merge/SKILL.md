---
name: task-merge
description: "Internal skill - ONLY activated by task-completer subagent. Handles archive and PR merge, but NOT worktree removal."
---

# Task Merge Skill

When activated, archive task files and merge the PR. Must be run from within the task's worktree. Worktree cleanup is handled separately from the main repo.

## File Locations

- **Task Definition**: `task-system/task-NNN/task.md`
- **Journal**: `task-system/task-NNN/journal.md`
- **Archive**: `task-system/archive/NNN/` (destination for archiving)

## Important

This skill must be run **from within the task's worktree**, not from the main repository.

## Process

### Step 1: Verify Worktree Location and Detect Task

1. **Check current directory** is a worktree (`.git` is a file, not directory)
2. **Auto-detect task ID** from `task-system/task-NNN` folder (source of truth):
   ```bash
   TASK_ID=$(ls -d task-system/task-[0-9]* 2>/dev/null | head -1 | grep -oP 'task-system/task-\K\d+')
   ```
3. **If no task folder found**: Error "No task-system/task-NNN folder found"
4. **If in main repo**: Error with instructions to run from worktree
5. **Capture main repo path** for final message:
   ```bash
   MAIN_REPO=$(dirname "$(git rev-parse --git-common-dir)")
   ```

### Step 2: Task Verification

1. **Read task definition** from `task-system/task-$TASK_ID/task.md`
2. **Verify journal.md exists** at `task-system/task-$TASK_ID/journal.md` (indicates work was started)

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
4. **Display success and cleanup instructions**:
   ```
   ===============================================================
   Task $TASK_ID Merged Successfully!
   ===============================================================

   - Task files archived to task-system/archive/$TASK_ID/
   - PR merged to main branch
   - Task branch deleted from remote

   ---------------------------------------------------------------
   NEXT STEP: Clean up the worktree from the main repository
   ---------------------------------------------------------------

   1. Navigate to main repo: cd $MAIN_REPO
   2. Start a new Claude session
   3. Say: "cleanup task $TASK_ID"

   (Or manually: git worktree remove task-system/tasks/$TASK_ID --force)
   ===============================================================
   ```

## Error Handling

- **Not in worktree**: Error with instructions to run from worktree
- **No task folder**: Error "No task-system/task-NNN folder found in worktree"
- **No journal.md**: Warning that task may not have been properly started
- **PR not ready**: Show which checks/reviews are blocking
- **Merge conflicts**: Instructions to resolve conflicts
- **Already merged**: Display cleanup instructions directly

## Status After Merge

After successful merge:
- Task files archived to `task-system/archive/NNN/`
- PR is merged to main branch
- Task branch is deleted from remote
- Worktree still exists (user must run cleanup from main repo)
- Task will show as COMPLETED in `list tasks` (PR merged)
