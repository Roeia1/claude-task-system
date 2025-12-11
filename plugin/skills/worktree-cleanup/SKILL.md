---
name: worktree-cleanup
description: "Internal skill - ONLY activated by task-completer subagent after task completion. Must run from within a worktree."
---

# Worktree Cleanup Skill

Archives task files and removes the worktree after task completion. Must be run from within the worktree being cleaned up.

## File Locations

- **Task Worktrees**: `task-system/tasks/NNN/` (git worktrees)
- **Archive**: `task-system/archive/NNN/` (archived task files)
- **Scripts**: `scripts/` (relative to this skill)

---

## Process

### Step 1: Determine Paths

From current worktree location, determine:

1. **Task ID**: Extract from current path (pattern: `task-system/tasks/NNN`)
2. **Worktree path**: Current git root (`git rev-parse --show-toplevel`)
3. **Main repo path**: 3 levels up from worktree (`$WORKTREE/../../..`)

### Step 2: Archive Task Files

Run the archive script:

```bash
bash scripts/archive-task.sh $TASK_ID $MAIN_REPO $WORKTREE
```

This copies `task.md` and `journal.md` to `task-system/archive/$TASK_ID/`.

### Step 3: Remove Worktree

Run the remove script:

```bash
bash scripts/remove-worktree.sh $MAIN_REPO $WORKTREE
```

This removes the worktree and prunes stale references using `git -C` (no directory navigation needed).

### Step 4: Display Success

```
===============================================================
Worktree Cleanup Complete
===============================================================

Task: $TASK_ID
Archived to: task-system/archive/$TASK_ID/
Worktree removed successfully

---------------------------------------------------------------
Task is now COMPLETED
---------------------------------------------------------------

Note: Your terminal is now in a deleted directory.
Run: cd $MAIN_REPO
===============================================================
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Not in worktree | Error: Must run from within a worktree |
| Archive failed | Warn but continue with removal |
| Removal failed | Display manual cleanup instructions |

### Manual Cleanup (if automatic removal fails)

```
If automatic removal fails, try manual cleanup:

1. Navigate to main repo:
   cd $MAIN_REPO

2. Force remove worktree:
   git worktree remove $WORKTREE --force

3. If still fails:
   rm -rf $WORKTREE
   git worktree prune
```
