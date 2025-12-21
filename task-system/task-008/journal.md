# Task 008: Simplify task-completer Agent

## Git References

- **Branch**: task-008-refactor
- **PR**: Pending
- **Base Branch**: main

## Current Phase: Phase 2: Safety Net Creation

## Progress Log

### 2025-12-21 16:42 - Task Started

Task initialized: Simplify task-completer agent to become a straightforward orchestrator.
Task type: refactor. Priority: P1 (Critical path for automatic task cleanup feature).
No dependencies - can be developed in parallel with T006 and T007.

Key objectives:
- Remove manual cleanup instructions from task-completer agent
- Update agent to invoke task-merge then task-cleanup sequentially
- Simplify agent description to reflect new responsibility
- Preserve permission prompt before merge

Branch: task-008-refactor. Working in isolated worktree environment.

**Next:** Begin Phase 1: Read and analyze current task-completer.md agent file to understand existing structure

### 2025-12-21 22:30 - Phase 1 Complete: Code Analysis Finished

Completed analysis of task-completer.md agent:

**Current structure:**
- Frontmatter: name, description ("Handles task archive and PR merge. Worktree cleanup is done separately."), model: haiku, skills: task-merge only
- Pre-Completion Validation: Checks sub-tasks, tests, PR, conflicts (to preserve)
- Process: 2 steps - execute task-merge, display cleanup instructions
- Error Handling: Basic reporting

**Refactoring plan:**
1. Update frontmatter description to reflect orchestration role
2. Add task-cleanup to skills list (currently only task-merge)
3. Replace "Display cleanup instructions" step with "Execute task-cleanup skill"
4. Simplify error handling since task-cleanup handles its own errors

**Key decision:** This task develops in parallel with T007 (location-aware task-cleanup). The agent will invoke task-cleanup which will handle location detection internally once T007 is complete.

Analyzed other agents (journaling.md, task-builder.md) for consistent structure patterns.

**Next:** Request permission to proceed to Phase 2 (Safety Net Creation)
