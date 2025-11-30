# Phase 8: Task Completion Protocol

## Completion Command

After completing Phase 7 reflection and documentation, run the completion command **from within the worktree**:

```bash
/task-system:complete-task
```

## What the Command Does

The completion command automatically handles:

1. **Cleans CLAUDE.md** - removes worktree-specific isolation instructions
2. **Commits any final changes** in your working directory
3. **Verifies PR is ready** (all checks passing, no conflicts)
4. **Updates task status** to COMPLETED in TASK-LIST.md
5. **Merges the PR** automatically
6. **Instructs cleanup** - tells you to run worktree-cleanup from main repo

## After Completion: Cleanup

After the PR is merged, you need to cleanup the worktree from the **main repository**:

```bash
# Open new terminal in main repository
cd /path/to/project
claude

# Say:
cleanup worktree for task XXX
```

This removes the worktree directory and cleans up git references.

## Before Running Completion

Ensure you have:

- ✅ Completed all sub-tasks in task file
- ✅ Verified all acceptance criteria are met
- ✅ All tests passing
- ✅ PR checks are green
- ✅ No merge conflicts
- ✅ Phase 7 reflection documented
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
   - No uncommitted work

## After Cleanup

Once both completion and cleanup are done:

- Task is marked COMPLETED in TASK-LIST.md
- Worktree directory is removed
- PR is merged to main
- Ready to start next task

## Troubleshooting

If completion fails:

- **PR checks failing**: Fix issues, push, wait for green checks
- **Merge conflicts**: Rebase on latest main, resolve conflicts
- **Missing permissions**: Verify GitHub authentication
- **CLAUDE.md issues**: Manually remove isolation instructions if needed

If cleanup fails:

- **Worktree still exists**: Run `git worktree remove <path> --force`
- **Stale references**: Run `git worktree prune`
- **Other issues**: Run `/task-system:worktree-maintenance` to diagnose
