---
name: parallel-task-finalization
description: "ONLY activate on DIRECT user request to finalize a parallel task. User must explicitly mention keywords: 'finalize parallel task', 'complete worktree task', 'finish parallel'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to finalize a parallel/worktree task."
---

# Parallel Task Finalization Skill

When activated, finalize a parallel task by completing documentation and merging the PR (Step 1 of 2 for parallel task completion).

## File Locations

- **Task List**: `execution/TASK-LIST.md`
- **Journal**: `execution/tasks/NNN/journal.md`
- **Full Workflow**: `.claude/commands/parallel-finalize-task.md`

## Important

This skill is for **parallel (worktree) tasks only**. For regular tasks in the main repository, use the **task-completion** skill instead.

This is Step 1 of 2. After finalization, run **worktree-cleanup** skill from the main repository.

## Process

### Step 1: Task Selection

1. **Read task list** from `execution/TASK-LIST.md`
2. **Filter for IN_PROGRESS tasks** WITH `[worktree: path]` markers
3. **Interactive selection** or use direct task ID from user input
4. **Validate**: Task must be IN_PROGRESS and IN a worktree
5. **Extract worktree path** from TASK-LIST.md

### Step 2: Switch to Worktree

1. **Change to worktree directory**: `cd [worktree-path]`
2. **Verify in correct worktree**
3. **Confirm task branch** is checked out

### Step 3: Pre-Completion in Worktree

1. **Remove worktree-specific CLAUDE.md content**:
   - Check if CLAUDE.md contains worktree isolation instructions
   - Remove section before "# Claude Code Instructions" or original content
   - Keep only the original CLAUDE.md content
   ```bash
   # Remove worktree-specific content
   sed -i '/# Claude Code Instructions/,$!d' CLAUDE.md
   ```
2. **Check for uncommitted changes**: `git status --porcelain`
3. **Commit any changes** (including CLAUDE.md cleanup):
   ```bash
   git add . && git commit -m "docs(task-XXX): final updates before completion"
   ```
4. **Push commits**: `git push`

### Step 4: Update Task Status in Worktree

1. **Read TASK-LIST.md** in worktree
2. **Find task** in IN_PROGRESS section with worktree marker
3. **Remove worktree marker** from task line
4. **Move task** to COMPLETED section
5. **Format**: `- ✅ [Task Title] ([Summary]) [task-type]`

### Step 5: Finalize Journal in Worktree

1. **Read journal** from `execution/tasks/NNN/journal.md`
2. **Update "Current Phase"** to "COMPLETED"
3. **Add Phase 8 completion entry**:
   - Timestamp
   - Summary of achievements
   - Quality impact
   - Completion status
   - Note about parallel execution

### Step 6: Commit Completion Documentation

1. **Stage changes**: `git add execution/`
2. **Commit**: `git commit -m "docs(task-XXX): complete Phase 8 documentation"`
3. **Push**: `git push`

### Step 7: Verify and Merge PR

1. **Check PR status**: `gh pr view --json state,mergeable,reviews,statusCheckRollup`
2. **Verify**:
   - All status checks passing
   - PR is mergeable (no conflicts)
   - Required reviews approved
3. **Display PR information** for final confirmation
4. **Merge PR**: `gh pr merge --squash --delete-branch`
5. **Confirm merge successful**

### Step 8: Provide Cleanup Instructions

Display next steps:
```
Task XXX is now finalized! 🎉

NEXT STEP: Cleanup the worktree
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To complete the task cleanup:

1. Open a NEW Claude Code session from the main repository
2. Run the worktree-cleanup skill with task ID XXX

The worktree will be removed and the task will be fully complete.

Current worktree: [worktree-path]
```

## Error Handling

- **Task not in worktree**: Error with instructions to use task-completion
- **Task not IN_PROGRESS**: Error with current status
- **PR not ready**: Show which checks/reviews are blocking
- **Merge conflicts**: Instructions to resolve conflicts
- **Already merged**: Recovery instructions
- **Worktree access issues**: Verify worktree exists

## Important Notes

- This command is for parallel (worktree) tasks only
- **MUST remove worktree-specific CLAUDE.md content** before merging
- Runs from within the worktree directory
- Handles documentation finalization and PR merge
- Does NOT remove the worktree (that's Step 2)
- After this, use **worktree-cleanup** from main repo

## Next Steps

After finalization:
1. Task is finalized and PR is merged
2. Worktree still exists on filesystem
3. Run **worktree-cleanup** skill from main repository to complete

## References

- Complete workflow details: `.claude/commands/parallel-finalize-task.md`
- Parallel execution guide: `execution/PARALLEL-WORKFLOW-GUIDE.md`
- Project guidelines: `CLAUDE.md`
