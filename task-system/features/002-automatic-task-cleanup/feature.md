# Feature: Automatic Task Cleanup via TMUX Terminal Spawning

**Created:** 2025-12-18
**Status:** Planned
**Feature ID:** 002

## Overview

Automatically trigger task worktree cleanup after a task is merged by spawning a new TMUX terminal window with a fresh Claude Code session at the main repository root. This eliminates the manual step where users must navigate to the main repo and run "cleanup task NNN" after completing a task.

## Motivation

Currently, when a task is completed and merged:
1. The task-merge skill archives files and merges the PR
2. The user is shown instructions to manually navigate to the main repo and run cleanup
3. The worktree cleanup cannot happen in the same session because the agent is running inside the worktree that would be deleted

This creates friction in the workflow and leaves orphaned worktrees if users forget to clean up. By automatically spawning a new terminal session at the repo root, we can seamlessly complete the full task lifecycle.

## User Stories

### Story 1: Automatic Cleanup After Merge

**As a** developer completing a task
**I want** the worktree cleanup to happen automatically after merge
**So that** I don't need to manually navigate and run cleanup commands

**Acceptance Criteria:**
- [ ] Before merge, user is prompted: "Ready to merge and cleanup? A new terminal will spawn and this session will terminate."
- [ ] After successful PR merge, a new TMUX pane is spawned (split view)
- [ ] The new pane opens at the main repository root (not the worktree)
- [ ] A fresh Claude Code session starts in the new pane
- [ ] The cleanup command is automatically executed for the completed task
- [ ] User sees completion message and pane remains open for user to close
- [ ] The original worktree session terminates immediately after spawning

### Story 2: Graceful Handling When Not in TMUX

**As a** developer who may not be using TMUX
**I want** clear feedback about why automatic cleanup isn't available
**So that** I understand the prerequisites and can proceed manually

**Acceptance Criteria:**
- [ ] System detects whether running inside a TMUX session
- [ ] If not in TMUX, falls back to current manual instructions
- [ ] Clear message explains that TMUX is required for automatic cleanup
- [ ] Manual cleanup instructions are still provided as fallback

### Story 3: Cleanup Failure Recovery

**As a** developer whose automatic cleanup failed
**I want** to know what went wrong and how to fix it
**So that** I can complete the cleanup manually if needed

**Acceptance Criteria:**
- [ ] If TMUX spawn fails, error is reported with reason
- [ ] Manual cleanup instructions are provided as fallback
- [ ] The task merge remains successful even if cleanup spawn fails
- [ ] User can retry cleanup manually without re-merging

## Functional Requirements

1. The system shall detect if running inside a TMUX session before attempting automatic cleanup
2. The system shall spawn a new TMUX window/pane at the main repository root directory
3. The system shall start a Claude Code session in the spawned terminal
4. The system shall pass the task ID to the new session for cleanup execution
5. The system shall report success/failure of the spawn operation to the user
6. The system shall preserve the current manual cleanup flow as a fallback

## Non-Functional Requirements

### Performance
- TMUX spawn should complete within 2 seconds
- New Claude session should be ready for cleanup within 5 seconds of spawn

### Reliability
- Spawn failure must not affect the already-completed merge
- The feature must be idempotent (running cleanup multiple times is safe)

### Usability
- User should see clear status messages about what's happening
- The spawned terminal should be visible/focused for user awareness
- No additional user input required for the automatic flow

## Out of Scope

- Supporting terminal multiplexers other than TMUX (screen, zellij, etc.)
- Running cleanup in background without user visibility
- Automatic cleanup for non-TMUX environments
- Modifying the task-merge process itself (only adding post-merge automation)
- Batch cleanup of multiple tasks

## Success Metrics

- **Adoption**: 90% of task completions use automatic cleanup (when in TMUX)
- **Reliability**: <1% failure rate for TMUX spawn operations
- **User Satisfaction**: Reduction in orphaned worktrees to near zero

## Dependencies

- **External services**: TMUX must be installed and session must be running inside TMUX
- **Other features**: Depends on existing task-merge and task-cleanup skills
- **Infrastructure**: Unix-like environment with TMUX support

## Open Questions

All questions have been resolved:

1. **Spawn location**: New TMUX pane (split current window, keeps context visible)
2. **Responsible component**: Task-completer agent orchestrates the flow - invokes task-merge skill, then spawns cleanup pane
3. **Shell script**: Yes, create a dedicated `scripts/spawn-cleanup.sh` script
4. **Spawned session behavior**: New Claude session invokes task-cleanup skill, shows completion message, waits for user to close
5. **Original session behavior**: Immediately terminate after spawning (with user permission prompt beforehand)

### Architectural Decision: Worktree Merge Flow

Evaluated two approaches:
- **Option A**: Merge in worktree, cleanup in root (current flow + TMUX spawn)
- **Option B**: Both merge and cleanup from root session

**Decision**: Keep Option A. The worktree isolation is a core design principle - users work *inside* the task environment. Moving merge to root would require significant rework and lose that isolation benefit. The TMUX spawn is a targeted solution that keeps the existing flow intact while automating the one manual step.

### Complete Flow

1. User completes task phases in worktree
2. Task-completer agent asks permission: "Ready to merge and cleanup? A new terminal will spawn and this session will terminate."
3. User confirms
4. Task-completer invokes **task-merge skill** (archive files, merge PR)
5. Task-completer runs spawn script to create new TMUX pane at main repo root
6. Original worktree session terminates
7. New pane starts Claude Code session
8. New session invokes **task-cleanup skill** (removes worktree)
9. Cleanup completes, shows message, pane remains open for user

## References

- Current task-merge skill: `plugin/skills/task-merge/SKILL.md`
- Current task-cleanup skill: `plugin/skills/task-cleanup/SKILL.md`
- Task-completer agent: `plugin/agents/task-completer.md`
- Worktree flow: `plugin/skills/task-start/worktree-flow.md`

---

**Note**: This document describes WHAT to build, not HOW. Technical implementation details belong in plan.md.
