# worktree-maintenance

Maintains git worktrees by cleaning up stale references, listing active worktrees, and providing recovery options for corrupted worktree scenarios.

## What it does

1. **Lists all active worktrees**: Shows current worktree status and health
2. **Prunes stale worktree references**: Cleans up broken or deleted worktree references
3. **Validates worktree integrity**: Checks that worktrees match TASK-LIST.md state
4. **Provides recovery options**: Helps fix corrupted or inconsistent worktree states

## Usage

### Basic Maintenance (recommended monthly)
```
/project:worktree-maintenance
```

### Show Active Worktrees Only
```
/project:worktree-maintenance list
```

### Force Cleanup of Stale References
```
/project:worktree-maintenance cleanup
```

### Repair Corrupted Worktrees
```
/project:worktree-maintenance repair
```

## Command Logic

### Default Mode (No Arguments)

1. **List all worktrees**: `git worktree list --porcelain`
2. **Check TASK-LIST.md consistency**: Verify worktree markers match actual worktrees
3. **Prune stale references**: `git worktree prune --dry-run` then actual prune if needed
4. **Report status**: Show any issues found and actions taken

### List Mode

1. **Display active worktrees** with status:
   ```
   Active Worktrees:
   1. task-013-feature (worktrees/task-013-feature)
      - Branch: feature/task-013-parallel-worktrees
      - Status: Clean, 2 commits ahead
      - Task: 013 | P2 | Enable Parallel Task Execution
   
   2. task-009-feature (worktrees/task-009-feature)
      - Branch: feature/task-009-postgresql-schema
      - Status: Modified files, 1 commit ahead
      - Task: 009 | P1 | Design PostgreSQL Schema
   ```

### Cleanup Mode

1. **Aggressive cleanup**: Remove stale worktree references
2. **Directory cleanup**: Check for orphaned worktree directories
3. **TASK-LIST.md cleanup**: Remove markers for non-existent worktrees
4. **Report**: Show what was cleaned up

### Repair Mode

1. **Diagnose issues**: Check for common worktree problems
2. **Repair worktree links**: Fix broken worktree connections using `git worktree repair`
3. **Reconcile state**: Fix mismatches between TASK-LIST.md and actual worktrees
4. **Recovery suggestions**: Provide manual steps for complex issues

## Implementation Steps

### Step 1: Gather Worktree Information

1. Get all worktrees: `git worktree list --porcelain`
2. Parse TASK-LIST.md for worktree markers
3. Check each worktree directory exists and is valid
4. Identify inconsistencies

### Step 2: Validate Consistency

1. **Missing worktrees**: TASK-LIST.md has marker but worktree doesn't exist
2. **Orphaned worktrees**: Worktree exists but no TASK-LIST.md marker
3. **Stale references**: Git knows about worktree but directory is gone
4. **Broken links**: Worktree directory exists but git connection broken

### Step 3: Perform Maintenance

Based on mode selected:

**Default**: List issues + safe cleanup  
**List**: Display current state only  
**Cleanup**: Aggressive cleanup with confirmation  
**Repair**: Fix broken worktrees and state  

### Step 4: Report Results

1. Show what was found
2. List actions taken
3. Provide next steps if issues remain
4. Update TASK-LIST.md if needed

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

## Example Output

```
Git Worktree Maintenance Report
==============================

Active Worktrees (2):
✅ task-013-feature: worktrees/task-013-feature
   - Branch: feature/task-013-parallel-worktrees (clean)
   - Last commit: 2 hours ago
   
⚠️  task-009-feature: worktrees/task-009-feature
   - Branch: feature/task-009-postgresql-schema (modified)
   - Uncommitted changes detected
   
Issues Found:
- 1 stale worktree reference (task-005-feature)
- 1 orphaned directory (worktrees/old-experiment)

Actions Taken:
✅ Pruned 1 stale reference
✅ TASK-LIST.md updated (removed obsolete marker)

Recommendations:
- Commit or stash changes in task-009-feature
- Manually remove: worktrees/old-experiment
```

This command helps maintain a clean and healthy worktree environment for optimal parallel development.