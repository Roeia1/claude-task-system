# Feature: Windows-Compatible Task Context Detection

**Created:** 2026-01-06
**Status:** Draft
**Feature ID:** 006

## Overview

The task system needs a cross-platform approach for detecting and accessing task context (current task ID, worktree vs main repo, spawn directory). The current approach relies on Claude Code's `CLAUDE_ENV_FILE` feature which works on Unix but doesn't function properly on Windows.

**Approach Decision**: Use on-demand context detection via a Python script - run detection logic each time context is needed rather than persisting to an env file. Python provides native cross-platform path handling and eliminates Windows bash compatibility issues.

## Motivation

Currently, the session-init hook writes context variables to `$CLAUDE_ENV_FILE` at session start:
- `TASK_CONTEXT` - "worktree" or "main"
- `CURRENT_TASK_ID` - task number when in worktree
- `CLAUDE_SPAWN_DIR` - original spawn directory

On Windows, this mechanism fails because:
1. The `CLAUDE_ENV_FILE` variable may not be set or may not work with Windows paths
2. Bash scripts writing to the env file have compatibility issues with Windows line endings and path formats
3. The statusline script and context detection scripts cannot reliably source the env file

This breaks the statusline feature (Feature 001) and task-start context validation on Windows.

## User Stories

### Story 1: Context Detection on Any Platform

**As a** developer using the task system on Windows or Unix
**I want** task context detection to work reliably regardless of my operating system
**So that** I can use statusline features and start tasks without platform-specific issues

**Acceptance Criteria:**
- [ ] Context detection works on Windows (PowerShell, Git Bash, MSYS2)
- [ ] Context detection works on macOS and Linux
- [ ] No manual platform configuration required from users
- [ ] Existing Unix workflows continue to work unchanged

### Story 2: Statusline Works Cross-Platform

**As a** developer viewing my Claude Code statusline
**I want** to see accurate task information (origin, task ID, counts)
**So that** I always know my current context regardless of OS

**Acceptance Criteria:**
- [ ] Statusline script correctly identifies main vs worktree on Windows
- [ ] Task ID is correctly detected and displayed on Windows
- [ ] Feature counts work on Windows
- [ ] No visual regressions on Unix platforms

### Story 3: Task Start Validation Cross-Platform

**As a** developer starting a task
**I want** context validation (worktree check, branch alignment) to work on Windows
**So that** I get proper guidance when starting tasks from the wrong location

**Acceptance Criteria:**
- [ ] `task-start` skill correctly detects worktree context on Windows
- [ ] Branch alignment validation works on Windows
- [ ] Error messages about wrong context are accurate on Windows

## Functional Requirements

1. The system shall provide a Python-based context detection script that works on Windows and Unix
2. The system shall detect task context (worktree vs main) without relying on `CLAUDE_ENV_FILE`
3. The system shall detect current task ID from filesystem when in a worktree
4. The system shall output context as JSON for easy consumption by other scripts/tools
5. The system shall provide context information to both the statusline script and task-start validation
6. The system shall replace or wrap existing bash-based detection scripts

## Non-Functional Requirements

### Performance
- Context detection should complete in <100ms to maintain statusline responsiveness
- Detection should not require spawning multiple subprocesses on each invocation

### Compatibility
- Must work on Windows 10/11 with Git for Windows installed
- Must work on common Unix shells (bash, zsh)
- Should work with MSYS2/Git Bash terminal environments on Windows

### Maintainability
- Solution should minimize platform-specific code paths
- Detection logic should be centralized, not duplicated across scripts

## Out of Scope

- GUI-based context indicators (beyond terminal statusline)
- Supporting Windows without Git installed
- Supporting CMD.exe (PowerShell or Git Bash required)
- Rewriting entire plugin in a cross-platform language

## Success Metrics

- **Cross-platform success rate**: Context detection works 100% of the time on Windows and Unix
- **No regressions**: All existing tests pass on Unix
- **Performance parity**: Windows detection performs within 20% of Unix timing

## Dependencies

- **Python 3.x**: Required for the detection script (typically bundled with modern systems)
- **Git**: Required for git commands (Git for Windows on Windows)
- **Feature 001**: Statusline feature that consumes context data
- **Existing scripts**: detect-context.sh, session-init.sh, statusline script (to be replaced/wrapped)

## Open Questions

- [x] ~~Should we create our own session-scoped env file with a known location?~~ **Decision: No - use on-demand detection instead**
- [x] ~~Should we use on-demand detection (run detection script each time context is needed)?~~ **Decision: Yes - this is the chosen approach**
- [x] ~~Should detection be pure bash or could a lightweight cross-platform script be beneficial?~~ **Decision: Use Python for cross-platform compatibility**
- [ ] Can we optimize repeated detection calls to minimize overhead? (Explore during implementation)

## References

- [Feature 001: Statusline Task Info](../001-statusline-task-info/feature.md)
- Current session-init hook: `plugin/hooks/session-init.sh`
- Current context detection: `plugin/instructions/task-start/scripts/detect-context.sh`

---

**Note**: This document describes WHAT to build, not HOW. Technical implementation details belong in plan.md.
