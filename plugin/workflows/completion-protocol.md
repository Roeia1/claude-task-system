# Phase 8: Task Completion Protocol

## Completion Commands

After completing Phase 7 reflection and documentation, run the appropriate completion command:

### For Regular Workflow (Main Repository)

```bash
/task-system:complete-task
```

### For Parallel Workflow (Two Steps)

```bash
# Step 1: From worktree
/task-system:parallel-finalize-task

# Step 2: From main repository
/task-system:parallel-cleanup-worktree
```

## What the Command Does

The completion command automatically handles:

1. **Commits any final changes** in your working directory
2. **Verifies PR is ready** (all checks passing, no conflicts)
3. **Merges the PR** automatically
4. **Updates task status** to COMPLETED in TASK-LIST.md
5. **Finalizes journal** with completion entry
6. **Cleans up** (removes worktree for parallel tasks)
7. **Returns to main branch** (for parallel tasks)

## Before Running Completion

Ensure you have:

- ✅ Completed all sub-tasks in task file
- ✅ Verified all acceptance criteria are met
- ✅ All tests passing
- ✅ PR checks are green
- ✅ No merge conflicts
- ✅ Phase 7 reflection documented
- ✅ Journal is up to date
- ✅ Ready for PR to be merged to main

## What to Review

Before running the completion command, review:

1. **Should new tasks be created?**
   - Did you discover follow-up work?
   - Are there related improvements needed?
   - Should technical debt be addressed?

2. **Are there learnings to document?**
   - Update task file with discoveries
   - Note risks for future reference
   - Add helpful resources found

3. **Is everything committed and pushed?**
   - All code changes committed
   - Journal up to date
   - No uncommitted work

## After Completion

The command handles cleanup automatically. You will:

- Return to main branch (for parallel tasks)
- Have worktree removed (for parallel tasks)
- See task marked COMPLETED in TASK-LIST.md
- Be ready to start next task

## Troubleshooting

If completion fails:

- **PR checks failing**: Fix issues, push, wait for green checks
- **Merge conflicts**: Rebase on latest main, resolve conflicts
- **Missing permissions**: Verify GitHub authentication
- **Worktree issues**: Run `/task-system:worktree-maintenance` to diagnose
