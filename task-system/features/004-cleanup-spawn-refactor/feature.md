# Feature: Unified Cleanup Spawn Using claude-spawn Script

**Created:** 2025-12-22
**Status:** Draft
**Feature ID:** 004

## Overview

Refactor the task-cleanup spawning mechanism to use the existing `claude-spawn.sh` script instead of the separate `spawn-cleanup.sh` script. This unifies the approach for spawning Claude sessions in different directories, maintaining consistency across the codebase and staying in the same TMUX session (terminating the current session rather than creating a new pane).

## Motivation

Currently, there are two separate mechanisms for spawning Claude sessions in different directories:

1. **claude-spawn.sh** (used by task-start): Terminates the current session and spawns Claude in a new location using `tmux run-shell -d`. The user stays in the same TMUX pane.

2. **spawn-cleanup.sh** (used by task-cleanup): Creates a new TMUX pane side-by-side using `tmux split-window -h`. The user now has two panes.

This inconsistency leads to:
- **Duplicated logic** for TMUX handling and error cases
- **Different user experiences** for similar operations
- **Extra panes** that users need to manage after cleanup
- **Maintenance burden** of two separate scripts with overlapping functionality

Unifying on `claude-spawn.sh` provides a cleaner, more consistent experience where the user's session seamlessly transitions to the cleanup context without leaving behind orphaned sessions.

## User Stories

### Story 1: Seamless Cleanup After Task Completion

**As a** developer completing a task in a worktree
**I want** the cleanup process to seamlessly take over my current session
**So that** I don't have to manage multiple TMUX panes or manually close the old session

**Acceptance Criteria:**
- [ ] When cleanup is triggered from a worktree, the current Claude session terminates
- [ ] A new Claude session automatically starts at the main repo with the cleanup command
- [ ] User remains in the same TMUX pane (no new pane created)
- [ ] The cleanup runs automatically without additional user interaction

### Story 2: Consistent Spawn Behavior Across Features

**As a** developer using the task system
**I want** task-start and task-cleanup to behave consistently when spawning new sessions
**So that** I have a predictable experience and don't need to learn different interaction patterns

**Acceptance Criteria:**
- [ ] Both task-start and task-cleanup use the same underlying spawn mechanism
- [ ] Error messages and fallback behavior are consistent between both features
- [ ] Manual navigation instructions follow the same format when TMUX is unavailable

### Story 3: Graceful Fallback Without TMUX

**As a** developer not using TMUX
**I want** clear instructions for completing cleanup manually
**So that** I can still complete the cleanup process without automated spawning

**Acceptance Criteria:**
- [ ] When TMUX is not available, clear manual instructions are displayed
- [ ] Instructions include the exact commands needed to complete cleanup
- [ ] No errors or confusing messages appear when TMUX is unavailable

## Functional Requirements

1. The task-cleanup skill shall use `claude-spawn.sh` instead of `spawn-cleanup.sh` when spawning cleanup sessions
2. The spawn-cleanup.sh script shall be removed after migration
3. The task-cleanup skill shall call claude-spawn.sh with the main repo path and "cleanup task NNN" prompt
4. The task-completer agent documentation shall be updated to reflect the new behavior
5. All references to spawn-cleanup.sh in documentation shall be updated or removed

## Non-Functional Requirements

### Consistency
- The spawn behavior for cleanup must match the spawn behavior for task-start
- Error handling and exit codes must be interpreted consistently

### Maintainability
- Single spawn mechanism reduces code duplication
- Fewer scripts to maintain and test

### User Experience
- No additional TMUX panes should be created during cleanup
- Session transition should be seamless (kill current, start new)

## Out of Scope

- Changing the fundamental TMUX-based spawn approach
- Adding support for non-TMUX terminal multiplexers (screen, zellij, etc.)
- Modifying the claude-spawn.sh script itself (it already supports the needed functionality)
- Changing the task-merge flow (only affects the cleanup spawn portion)

## Success Metrics

- **Metric 1**: Script count - Target: 1 spawn script (down from 2)
- **Metric 2**: Pane count after cleanup - Target: Same pane (1 instead of 2)
- **Metric 3**: Code consistency - Target: 100% of spawn operations use claude-spawn.sh

## Dependencies

- **Scripts**: `plugin/scripts/claude-spawn.sh` (existing, no changes needed)
- **Skills**: `plugin/skills/task-cleanup/SKILL.md` (requires modification)
- **Agents**: `plugin/agents/task-completer.md` (documentation update)

## Open Questions

- [x] Should the user be prompted before spawning cleanup? (Current behavior prompts; this should be preserved)

## References

- Current claude-spawn.sh: `plugin/scripts/claude-spawn.sh`
- Current spawn-cleanup.sh: `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh`
- Task-start spawn usage: `plugin/skills/task-start/SKILL.md`
- Task-cleanup skill: `plugin/skills/task-cleanup/SKILL.md`

---

**Note**: This document describes WHAT to build, not HOW. Technical implementation details belong in plan.md.
