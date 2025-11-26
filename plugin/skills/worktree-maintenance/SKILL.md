---
name: worktree-maintenance
description: "ONLY activate on DIRECT user request for worktree maintenance. User must explicitly mention keywords: 'worktree maintenance', 'check worktrees', 'fix worktrees', 'repair worktrees'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to maintain or repair worktrees."
---

# Worktree Maintenance Skill

When activated, maintain git worktrees by cleaning up stale references, listing active worktrees, and providing recovery options for corrupted scenarios.

## File Locations

- **Task List**: `task-system/tasks/TASK-LIST.md`
- **Full Workflow**: Plugin's `commands/worktree-maintenance.md`

## What This Does

1. **Lists active worktrees**: Shows current worktree status and health
2. **Prunes stale references**: Cleans up broken or deleted worktree references
3. **Validates integrity**: Checks that worktrees match TASK-LIST.md state
4. **Provides recovery**: Helps fix corrupted or inconsistent worktree states

## Usage Modes

### Default Mode (No Arguments)
- List all worktrees
- Check TASK-LIST.md consistency
- Prune stale references
- Report status and issues

### List Mode
- Display active worktrees with detailed status
- Show branch, commit status, task info

### Cleanup Mode
- Aggressive cleanup of stale references
- Directory cleanup for orphaned worktrees
- TASK-LIST.md cleanup for non-existent worktrees

### Repair Mode
- Diagnose common worktree problems
- Repair broken worktree connections
- Reconcile state mismatches
- Provide recovery suggestions

## Process

### Step 1: Gather Worktree Information

1. **Get all worktrees**: `git worktree list --porcelain`
2. **Parse TASK-LIST.md** for worktree markers
3. **Check each worktree** directory exists and is valid
4. **Identify inconsistencies**

### Step 2: Validate Consistency

Check for:

1. **Missing worktrees**: TASK-LIST.md has marker but worktree doesn't exist
2. **Orphaned worktrees**: Worktree exists but no TASK-LIST.md marker
3. **Stale references**: Git knows about worktree but directory is gone
4. **Broken links**: Worktree directory exists but git connection broken

### Step 3: Perform Maintenance

Based on mode:

**Default**: List issues + safe cleanup
**List**: Display current state only
**Cleanup**: Aggressive cleanup with confirmation
**Repair**: Fix broken worktrees and state

### Step 4: Report Results

1. **Show what was found**
2. **List actions taken**
3. **Provide next steps** if issues remain
4. **Update TASK-LIST.md** if needed

## Common Issues and Solutions

### Issue: Stale Worktree Reference
**Symptom**: Git knows about worktree but directory is gone
**Solution**: Prune stale references with `git worktree prune`

### Issue: Orphaned Worktree Directory
**Symptom**: Worktree directory exists but Git doesn't know about it
**Solution**: Remove manually or re-add with `git worktree add`

### Issue: Inconsistent TASK-LIST.md
**Symptom**: Task marked with worktree but worktree doesn't exist
**Solution**: Update TASK-LIST.md to remove marker or fix task status

### Issue: Broken Worktree Link
**Symptom**: Worktree exists but connection to main repo broken
**Solution**: Repair with `git worktree repair`

## Output Example

```
Git Worktree Maintenance Report
==============================

Active Worktrees (2):
task-013-feature: task-system/worktrees/task-013-feature
   - Branch: feature/task-013-parallel-worktrees (clean)
   - Last commit: 2 hours ago

task-009-feature: task-system/worktrees/task-009-feature
   - Branch: feature/task-009-postgresql-schema (modified)
   - Uncommitted changes detected

Issues Found:
- 1 stale worktree reference (task-005-feature)
- 1 orphaned directory (task-system/worktrees/old-experiment)

Actions Taken:
Pruned 1 stale reference
TASK-LIST.md updated (removed obsolete marker)

Recommendations:
- Commit or stash changes in task-009-feature
- Manually remove: task-system/worktrees/old-experiment
```

## Best Practices

1. **Run monthly**: Regular maintenance prevents issues
2. **Before important work**: Check worktree health before starting critical tasks
3. **After system issues**: Run repair mode after crashes or power failures
4. **Team coordination**: Ensure team members aren't actively using worktrees before cleanup

## Safety Features

- **Dry-run reporting**: Shows what would be changed before acting
- **Confirmation prompts**: Asks before destructive operations
- **Backup suggestions**: Recommends backing up uncommitted work
- **Recovery documentation**: Provides steps to restore if needed

## Error Handling

### Permission Issues
```
Error: Cannot remove worktree directory
- Check file permissions
- Ensure no processes are using the directory
- Try manual removal: rm -rf [path]
```

### Git Repository Issues
```
Error: Worktree repair failed
- Repository may be corrupted
- Try: git fsck
- Consider creating fresh worktree for affected task
```

### State Inconsistency
```
Warning: TASK-LIST.md and actual worktrees don't match
- Found 2 worktrees not in TASK-LIST.md
- Found 1 task marked with non-existent worktree
- Run with 'repair' mode to fix automatically
```

## When to Use This Skill

- **Regular maintenance**: Monthly health checks
- **After problems**: System crashes, interrupted operations
- **Before cleanup**: Verify state before removing worktrees
- **Troubleshooting**: Diagnosing worktree-related issues
- **State validation**: Ensure TASK-LIST.md matches reality

## Integration with Other Skills

- Run before **worktree-cleanup** to identify issues
- Run after problems with **parallel-task-start** or **parallel-task-finalization**
- Use to diagnose issues preventing successful worktree operations

## References

- Complete workflow details: Plugin's `commands/worktree-maintenance.md`
