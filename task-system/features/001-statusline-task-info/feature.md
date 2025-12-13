# Feature: Statusline Task System Integration

**Created:** 2025-12-12
**Status:** Planned
**Feature ID:** 001

## Overview

Display task system context information in Claude Code's statusline, giving users immediate visibility into their current task, phase, and feature context without needing to check files or run commands.

## Motivation

When working within the task system workflow, users currently have no ambient awareness of:

- Which task they're working on
- What phase of execution they're in
- Which feature the task belongs to
- Whether they're in a task worktree or the main repo

This information requires manually checking files or running commands. By surfacing this context in the statusline, users can maintain situational awareness and avoid mistakes like working in the wrong worktree or forgetting which phase they're in.

## User Stories

### Story 1: Task Context Awareness

**As a** developer working on a task
**I want** to see the current task ID and type in my statusline
**So that** I always know which task I'm working on without checking files

**Acceptance Criteria:**

- [ ] Statusline displays task ID with icon (e.g., " 015") when in a task worktree
- [ ] Statusline displays task type with icon (e.g., "" for feature, "" for bugfix)
- [ ] Statusline shows indicator (e.g., " --") when in main repo or non-task directory
- [ ] Information updates when changing directories between worktrees

### Story 2: Phase Progress Visibility

**As a** developer following the phased workflow
**I want** to see my current execution phase in the statusline
**So that** I can track my progress and know what comes next

**Acceptance Criteria:**

- [ ] Statusline displays current phase with icon (e.g., " P2" or " Phase 2")
- [ ] Phase information is derived from journal.md entries
- [ ] Shows "Not Started" if task exists but journal.md doesn't
- [ ] Updates when phase transitions are logged

### Story 3: Feature Context

**As a** developer working on tasks within a larger feature
**I want** to see which feature my current task belongs to
**So that** I maintain awareness of the broader context

**Acceptance Criteria:**

- [ ] Statusline displays feature name/ID when task is linked to a feature
- [ ] Feature info is extracted from task.md's Feature Context section
- [ ] Shows gracefully when task has no feature linkage

### Story 4: Quick Status Check

**As a** developer switching between multiple task worktrees
**I want** the statusline to immediately reflect the correct context
**So that** I don't accidentally work in the wrong worktree

**Acceptance Criteria:**

- [ ] Statusline updates within 1 second of directory change
- [ ] Correctly identifies task context from worktree path
- [ ] Works when opening new Claude Code sessions in worktrees

### Story 5: System-Wide Task Overview

**As a** developer managing multiple tasks and features
**I want** to see counts of tasks and features grouped by status
**So that** I have visibility into overall project progress at a glance

**Acceptance Criteria:**

- [ ] Statusline displays task counts grouped by status (e.g., " 2/1/3" for in-progress/pending/remote)
- [ ] Statusline displays feature counts by status (e.g., " 1/2" for in-progress/draft)
- [ ] Counts update when tasks or features change status
- [ ] Zero counts can be hidden or shown based on preference

### Story 6: Session Origin Indicator

**As a** developer starting a new Claude Code session
**I want** to immediately know if I spawned in a task worktree or the main repo
**So that** I have instant awareness of my working context without checking manually

**Acceptance Criteria:**

- [ ] Statusline shows distinct indicator for main repo (e.g., "" or " main")
- [ ] Statusline shows distinct indicator for task worktree (e.g., "" or " worktree")
- [ ] Indicator is visible from the moment the session starts
- [ ] Visual distinction is clear (different icons or colors)

## Functional Requirements

1. The system shall detect when the current working directory is within a task worktree
2. The system shall parse task.md to extract task ID, type, and feature context
3. The system shall parse journal.md to determine current execution phase
4. The system shall format task information for display in the statusline
5. The system shall gracefully degrade when task files are missing or malformed
6. The system shall output composable text that can be piped or combined with other statusline scripts
7. The system shall be distributed as a separate, manually-installed script (not auto-configured)
8. The system shall scan task-system/tasks/ and git branches to count tasks by status (in-progress, pending, remote)
9. The system shall scan task-system/features/ to count features by status
10. The system shall detect session origin (main repo vs task worktree) and display appropriate indicator

## Non-Functional Requirements

### Performance

- Statusline script must complete within 100ms to avoid UI lag
- File parsing should be minimal (read only necessary sections)
- Should cache results when possible between rapid updates

### Usability

- Information should be concise (fit in typical terminal width)
- Use Nerd Font icons for quick visual scanning (e.g., , , , , , )
- Compact format examples:
  - In worktree: ` 015  P2  auth-system  2/1/3`
  - In main repo: `  --  2/1/3  1/2`
- Output must be composable (can be combined with other statusline outputs via pipes)

### Compatibility

- Must work alongside existing statusline scripts (claude-powerline, custom scripts)
- Should support both bash and cross-platform implementations
- Must handle edge cases (missing files, corrupted data) gracefully

## Out of Scope

- Modifying task files from the statusline
- Interactive statusline elements (clicking, expanding)
- Real-time sync with remote task status
- Notifications or alerts based on task state
- Integration with IDE statusbars (VS Code, etc.)

## Success Metrics

- **Adoption**: Statusline script is documented and easy to install
- **Reliability**: Zero crashes or hangs from malformed task data
- **Performance**: 95th percentile execution time under 50ms
- **User satisfaction**: Users report improved workflow awareness

## Dependencies

- **External services**: None
- **Other features**: Requires existing task-system structure (tasks/, features/)
- **Infrastructure**: Claude Code statusline feature (already available)

## Open Questions

- [x] ~~Should the statusline script be bundled with the plugin or installed separately?~~ **Resolved: Separate install**
- [x] ~~What's the preferred output format?~~ **Resolved: Compact with Nerd Font icons**
- [x] ~~Should it integrate with claude-powerline or be standalone?~~ **Resolved: Composable output (can be combined with any statusline)**
- [x] ~~How should it handle the case when task-system is not initialized?~~ **Resolved: Show indicator (e.g., " --")**
- [x] ~~Should phase detection be based on journal.md parsing or a separate state file?~~ **Resolved: Parse journal.md (more accurate)**

## References

- [Claude Code Statusline Documentation](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [Task System CLAUDE.md](../../../CLAUDE.md)
- [Task execution workflows](../../../plugin/skills/task-start/workflows/)

---

**Note**: This document describes WHAT to build, not HOW. Technical implementation details belong in plan.md.
