# Task #011: Unify Cleanup Spawn to Use claude-spawn.sh

## Git References

- **Branch**: task-011-refactor
- **PR**: https://github.com/Roeia1/claude-task-system/pull/21
- **Base Branch**: master

## Current Phase: Phase 1 - Code Analysis & Planning

## Progress Log

### 2025-12-22 12:22 - Task Started

Task initialized: Unify Cleanup Spawn to Use claude-spawn.sh.

Task type: refactor. No dependencies.

Branch created: task-011-refactor. PR already created.

This task consolidates spawn behavior by updating task-cleanup skill to use the existing claude-spawn.sh script instead of the separate spawn-cleanup.sh script. Key changes include:
- Updating SKILL.md to invoke claude-spawn.sh
- Changing argument order and exit code handling
- Removing obsolete spawn-cleanup.sh script
- Updating documentation references

**Next:** Begin Phase 1: Code Analysis & Planning - analyze target files and existing behavior

### 2025-12-22 14:35 - Code Analysis Complete

Completed comprehensive analysis of the refactoring scope.

**Files Analyzed:**
- `plugin/skills/task-cleanup/SKILL.md` - Main skill document, 273 lines
- `plugin/scripts/claude-spawn.sh` - Target script to use, 84 lines
- `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh` - Script to delete, 46 lines
- `plugin/agents/task-completer.md` - Verified no spawn-cleanup.sh references
- `CLAUDE.md` line 82 - Has spawn-cleanup.sh reference to update
- `README.md` line 432 - Has spawn-cleanup.sh reference to update

**Key Finding - Exit Code Mapping:**
The two scripts have different exit code semantics:
| Code | spawn-cleanup.sh | claude-spawn.sh |
|------|-----------------|-----------------|
| 0 | Success (returns) | Success (parent killed) |
| 1 | Invalid args | Not in TMUX |
| 2 | Path not found | Invalid args |
| 3 | TMUX failed | Path not found |

**Critical Implementation Consideration:**
claude-spawn.sh kills the parent process on success, so the success message must be displayed BEFORE calling the script. The message content must also change from "new pane created" to "session terminates".

**Refactoring Strategy:**
1. Move success message block BEFORE script invocation
2. Update message text to reflect new behavior
3. Update script path and argument order
4. Update exit code handling table
5. Update Notes section reference
6. Delete obsolete script and empty directory
7. Update CLAUDE.md and README.md references

All tests in tests/plugin/skills/task-cleanup/test-spawn-cleanup.sh will fail after deletion - this is expected behavior and documents the old script is gone.

**Next:** Request permission to proceed to Phase 2 (Safety Net Creation)
