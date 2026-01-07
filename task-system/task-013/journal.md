# Task #013: Create worker prompt template

## Git References

- **Branch**: task-013-feature
- **PR**: Pending
- **Base Branch**: main

## Current Phase

Phase 2: Implementation

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

**Next:** Begin Phase 2: Implementation - determine appropriate testing strategy for a markdown template file

### 2026-01-07 04:55 - Worker Prompt Template Complete

Completed implementation of the worker prompt template at `plugin/instructions/orchestration/worker-prompt.md`.

The template includes all required sections from feature.md (lines 499-641):

1. **Session Startup** - 6-step protocol covering task.json, journal.md, git log, resolution.md handling, running tests, and objective selection
2. **Implementation Workflow** - TDD approach with failing tests first, implementation, regression testing, and blocker handling workflow
3. **Commit & Journal Discipline** - Paired operations philosophy with clear separation (commits = code state, journal = narrative context)
4. **Context Awareness** - Self-monitoring signals and proactive exit behavior to prevent uncommitted work loss
5. **Exit Protocol** - JSON schema with status (ONGOING/FINISH/BLOCKED), summary, and blocker fields
6. **Important Rules** - 10 key constraints summarizing worker behavior

**Decision**: Skipped test creation phase since this is a markdown template file - pattern-matching tests would not validate prompt quality. Manual review against feature.md specification is the appropriate validation method.

All acceptance criteria from task.md have been verified as met.

**Next:** Review the worker prompt template and proceed to verification/completion
