# Task #013: Create worker prompt template

## Git References

- **Branch**: task-013-feature
- **PR**: Pending
- **Base Branch**: main

## Current Phase

Phase 1: Test Creation

## Progress Log

### 2026-01-07 00:00 - Task Started

Task initialized: Create worker prompt template for orchestration system.

Task type: feature (P1 Critical). This is a foundation task with no dependencies - all other orchestration components depend on having a well-defined worker prompt.

Branch: task-013-feature. Working in isolated worktree environment.

The worker prompt will define complete behavior for autonomous workers including:
- Session startup procedures (task.json, journal.md, commits, resolution.md)
- TDD-based implementation workflow
- Commit and journal discipline
- Context awareness for proactive exit
- JSON exit protocol for status reporting

This is a documentation/template task - the deliverable is a markdown file at `plugin/instructions/orchestration/worker-prompt.md`.

**Next:** Begin Phase 1: Test Creation - determine appropriate testing strategy for a markdown template file
