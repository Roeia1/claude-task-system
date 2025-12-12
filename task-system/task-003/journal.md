# Task #003: Implement task counts scanning

## Git References

- **Branch**: task-003-feature
- **PR**: Pending
- **Base Branch**: main

## Current Phase: Phase 1 - Test Creation

## Progress Log

### 2025-12-13 00:00 - Task Started

Task initialized: Implement task counts scanning for the statusline script.
Task type: feature. Priority: P1 (Critical path for counts feature).

Dependency verified: Task 001 (foundation script) is COMPLETED (archived).

Branch: task-003-feature

This task implements Phase 3 of the statusline feature - scanning local task worktrees to count in-progress vs pending tasks, querying git for remote task branches, and formatting the output for the --counts flag.

**Next:** Begin Phase 1: Test Creation - Write comprehensive tests for count_local_tasks(), count_remote_tasks(), and format_task_counts() functions

### 2025-12-13 14:45 - Phase 1 Complete: Test Suite Created

Completed comprehensive test suite for task counts scanning functionality.

**Tests created** (27 test cases in count-tasks.test.js):

1. **count_local_tasks() tests** (4 tests):
   - Counting tasks with journal.md as in-progress
   - Counting tasks without journal.md as pending
   - Mixed in-progress/pending categorization
   - Skipping malformed task directories

2. **Edge cases** (3 tests):
   - Missing task-system/tasks/ directory → 0/0/0
   - Empty tasks directory → 0/0/0
   - CLAUDE_SPAWN_DIR not set → graceful handling

3. **count_remote_tasks() tests** (5 tests):
   - Counting remote task branches without local worktrees
   - Excluding remote branches that have local worktrees
   - Ignoring non-task branches (feature/, bugfix/, etc.)
   - No git remote configured → R:0
   - Not in a git repo → R:0

4. **format_task_counts() tests** (4 tests):
   - Unicode icons by default (● ◐ ○)
   - ASCII fallback with --no-icons (I: P: R:)
   - Zero formatting when no tasks exist
   - Large task counts handling

5. **Integration tests** (3 tests):
   - --counts alone outputs only counts
   - --origin --counts outputs both sections
   - No flags includes counts in all sections

6. **Acceptance criteria validation** (7 tests):
   - Full format verification (in-progress/pending/remote)
   - Count accuracy against actual filesystem/git state
   - Icon/ASCII output verification
   - No crashes on missing/empty task-system

**Test helpers created**:
- createMockTaskSystem(): Creates temp directory with configurable task worktrees
- createMockGitRepo(): Creates temp git repo with remote branches
- Proper cleanup functions for test isolation

All tests failing as expected (TDD approach).
Existing tests (29) continue to pass.

**Next:** Request permission to proceed to Phase 2 (Implementation)
