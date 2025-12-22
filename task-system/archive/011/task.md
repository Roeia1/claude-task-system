# Task 011: Unify Cleanup Spawn to Use claude-spawn.sh

## Feature Context

**Feature**: [004-cleanup-spawn-refactor](../features/004-cleanup-spawn-refactor/feature.md)
**Technical Plan**: [plan.md](../features/004-cleanup-spawn-refactor/plan.md)

## Overview

Refactor the task-cleanup skill to use the existing `claude-spawn.sh` script instead of the separate `spawn-cleanup.sh` script. This consolidates spawn behavior for consistency with task-start, eliminates code duplication, and provides a cleaner user experience where the session seamlessly transitions rather than creating a new TMUX pane.

The key behavior change: instead of creating a side-by-side TMUX pane (spawn-cleanup.sh uses `tmux split-window`), the cleanup will replace the current session in the same pane (claude-spawn.sh uses `tmux run-shell -d` + parent process termination).

## Task Type

refactor - Code improvement without behavior change (from user perspective, cleanup still works; implementation details change)

## Priority

P1 - Critical path for feature completion; single task implementing entire feature

## Dependencies

None - this task has no prerequisites

## Objectives

- [x] Update task-cleanup/SKILL.md to use claude-spawn.sh instead of spawn-cleanup.sh
- [x] Remove the obsolete spawn-cleanup.sh script and its directory
- [x] Update all documentation references to reflect the new spawn mechanism
- [x] Ensure consistent error handling and exit code interpretation

## Sub-tasks

1. [x] Update Step 2a.5 in SKILL.md to invoke `plugin/scripts/claude-spawn.sh` instead of `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh`
2. [x] Change argument order from `$TASK_ID $MAIN_REPO` to `$MAIN_REPO "cleanup task $TASK_ID"`
3. [x] Move success message display BEFORE the claude-spawn.sh call (parent gets killed, so message must appear first)
4. [x] Update success message text to reflect new behavior (session terminates vs new pane created)
5. [x] Update exit code handling to match claude-spawn.sh codes (0=success/killed, 1=not in TMUX, 2=invalid args, 3=path not found)
6. [x] Update Notes section to reference claude-spawn.sh instead of spawn-cleanup.sh
7. [x] Delete `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh`
8. [x] Delete `plugin/skills/task-cleanup/scripts/` directory if empty
9. [x] Update CLAUDE.md line 82 to remove spawn-cleanup.sh reference from plugin/scripts/
10. [x] Verify task-completer.md needs no changes (currently does not reference spawn-cleanup.sh directly)

## Technical Approach

### Files to Modify

- `plugin/skills/task-cleanup/SKILL.md` - Main changes: update script path, argument order, exit codes, messages
- `CLAUDE.md` - Line 82: Remove `spawn-cleanup.sh` from the plugin/scripts/ directory listing

### Files to Delete

- `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh` - No longer needed
- `plugin/skills/task-cleanup/scripts/` - Directory should be removed if empty after script deletion

### Files to Verify (No Changes Expected)

- `plugin/agents/task-completer.md` - Verify no direct spawn-cleanup.sh references

### Implementation Steps

1. **Update SKILL.md Step 2a.5** - Change from:
   ```bash
   bash plugin/skills/task-cleanup/scripts/spawn-cleanup.sh "$TASK_ID" "$MAIN_REPO"
   ```
   To:
   ```bash
   bash plugin/scripts/claude-spawn.sh "$MAIN_REPO" "cleanup task $TASK_ID"
   ```

2. **Relocate success message** - Move the success message block to BEFORE the script invocation since claude-spawn.sh kills the parent process

3. **Update success message content**:
   ```
   ===============================================================
   Spawning Cleanup at Main Repository
   ===============================================================

   Navigating to: $MAIN_REPO
   This session will terminate and cleanup will run automatically.

   ===============================================================
   ```

4. **Update exit code table**:
   | Exit Code | Meaning | Action |
   |-----------|---------|--------|
   | 0 | Success | (never reached - parent killed) |
   | 1 | Not in TMUX | Display manual instructions |
   | 2 | Invalid arguments | Display error + manual fallback |
   | 3 | Path not found | Display error + manual fallback |

5. **Update Notes section** - Replace reference to `scripts/spawn-cleanup.sh` with reference to `plugin/scripts/claude-spawn.sh`

6. **Delete obsolete script** - Remove spawn-cleanup.sh and its parent directory

7. **Update CLAUDE.md** - Remove the line showing spawn-cleanup.sh in plugin/scripts/

### Testing Strategy

- **Manual Testing (Happy Path)**: Complete a task in worktree, trigger cleanup, confirm spawn - verify session terminates and new session starts at main repo with cleanup command
- **Manual Testing (No TMUX)**: Run cleanup from worktree without TMUX - verify manual instructions displayed correctly
- **Manual Testing (User Declines)**: Trigger cleanup, decline spawn - verify manual instructions displayed
- **Manual Testing (Main Repo)**: Run cleanup from main repo - verify direct cleanup works (unchanged behavior)
- **Verification**: Run existing test-spawn-cleanup.sh to confirm it fails gracefully (script no longer exists)

### Edge Cases to Handle

- Success message display timing: Must be shown BEFORE calling claude-spawn.sh since parent process gets killed
- Exit code 0 handling: Document that success code is never reached in normal operation (parent is killed)
- Empty scripts directory: Remove the directory after deleting spawn-cleanup.sh

## Risks & Concerns

- **Success message timing**: If message display is not flushed before script call, user may not see it. Mitigation: explicit flush or ensure output is immediate.
- **Test script references**: The test-spawn-cleanup.sh in tests/ will fail after script deletion. This is expected behavior - the test validates a script that no longer exists. Consider documenting this in verification.
- **Archive references**: Old archived tasks (006, 007) reference spawn-cleanup.sh - these are historical and should not be updated.

## Resources & Links

- [claude-spawn.sh](../../plugin/scripts/claude-spawn.sh) - Existing spawn script to use
- [spawn-cleanup.sh](../../plugin/skills/task-cleanup/scripts/spawn-cleanup.sh) - Script to be deleted
- [Feature Definition](../features/004-cleanup-spawn-refactor/feature.md) - User stories and requirements
- [Technical Plan](../features/004-cleanup-spawn-refactor/plan.md) - Detailed implementation strategy

## Acceptance Criteria

- SKILL.md correctly invokes `plugin/scripts/claude-spawn.sh` with arguments `$MAIN_REPO "cleanup task $TASK_ID"`
- Success message appears BEFORE script invocation and reflects new behavior (session terminates)
- Exit code handling matches claude-spawn.sh codes (0=success/killed, 1=not TMUX, 2=invalid args, 3=path not found)
- spawn-cleanup.sh no longer exists at `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh`
- scripts/ directory under task-cleanup is removed (empty directory cleanup)
- CLAUDE.md no longer references spawn-cleanup.sh in the plugin structure
- task-completer.md has no stale references to spawn-cleanup.sh
- Manual cleanup fallback instructions remain functional for non-TMUX environments
