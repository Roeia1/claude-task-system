# Task #007: Update task-cleanup Skill with Location Detection

## Git References

- **Branch**: task-007-feature
- **PR**: Pending
- **Base Branch**: main

## Current Phase: Phase 1

## Progress Log

### 2025-12-21 22:28 - Task Started

Task initialized: Update task-cleanup skill with location detection.
Task type: feature. Dependencies: None.
Branch: task-007-feature.

**Context**: This is Phase 2 from feature-002 (Automatic Task Cleanup via TMUX Terminal Spawning). The goal is to make task-cleanup skill location-aware so it handles both worktree and main repo contexts automatically.

**Current state**: Existing task-cleanup skill only works from main repo. It checks if user is in worktree and errors with manual instructions.

**Target state**: Skill detects location automatically:
- From worktree: Extract task ID, detect TMUX, prompt user, spawn cleanup pane
- From main repo: Preserve existing cleanup behavior unchanged

Read task.md and plan.md. Understood the requirements and implementation approach.

**Next:** Begin Phase 1: Write tests for location detection and worktree context handling
