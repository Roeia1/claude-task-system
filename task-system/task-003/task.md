# Task 003: Implement task counts scanning

## Feature Context

**Feature**: [001-statusline-task-info](../../../features/001-statusline-task-info/feature.md)
**Technical Plan**: [plan.md](../../../features/001-statusline-task-info/plan.md)
**Feature Tasks**: [tasks.md](../../../features/001-statusline-task-info/tasks.md)

## Overview

Implement the task counts scanning functionality for the statusline script. This component scans local task worktrees to determine which tasks are in-progress (have journal.md) vs pending (no journal.md), queries git for remote task branches without local worktrees, and formats the task counts portion of the `--counts` flag output.

This is Phase 3 of the statusline feature implementation and can be developed in parallel with Phase 2 (task information parsing) since both depend only on Phase 1 (foundation script).

## Task Type

feature - New functionality to scan and count tasks by status

## Priority

P1 - Critical path for the counts feature; blocks Phase 5 integration

## Dependencies

- [001](../../001/task-system/task-001/task.md) (Create npm package structure and foundation script): The foundation script must exist with argument parsing, `$CLAUDE_ENV_FILE` sourcing, and origin indicator before adding counts functionality

## Objectives

- [ ] Implement local worktree scanning to find task directories
- [ ] Detect journal.md presence to distinguish in-progress from pending tasks
- [ ] Query git for remote task branches without local worktrees
- [ ] Output formatted task counts with correct icons/ASCII fallbacks
- [ ] Handle edge cases gracefully (no tasks, no git remote, malformed directories)

## Sub-tasks

1. [ ] Create `count_local_tasks()` function that scans `task-system/tasks/` for worktree directories
2. [ ] Implement journal.md detection within each worktree's `task-system/task-NNN/` folder
3. [ ] Categorize local tasks as in-progress (journal exists) or pending (no journal)
4. [ ] Create `count_remote_tasks()` function that queries `git branch -r` for task branches
5. [ ] Filter remote branches to exclude those with existing local worktrees
6. [ ] Create `format_task_counts()` function to assemble the counts output string
7. [ ] Implement icon vs ASCII fallback based on `--no-icons` flag
8. [ ] Add `--counts` flag handling to output task counts section
9. [ ] Write unit tests for count functions with mock filesystem
10. [ ] Write integration tests covering various task configurations

## Technical Approach

### Files to Create/Modify

- `packages/statusline/bin/task-status` - Add count functions and `--counts` flag handling
- `packages/statusline/tests/count-tasks.test.js` - Unit tests for counting logic
- `packages/statusline/tests/fixtures/` - Test fixtures with various task configurations

### Implementation Steps

1. Add `count_local_tasks()` function to scan `$CLAUDE_SPAWN_DIR/task-system/tasks/` directory
2. For each subdirectory in tasks/, check if `task-system/task-{ID}/journal.md` exists
3. Maintain counters: `in_progress_count` and `pending_count`
4. Add `count_remote_tasks()` function using `git branch -r | grep 'origin/task-'`
5. Extract task IDs from remote branch names and exclude those with local worktrees
6. Add `format_task_counts()` function that uses icons or ASCII based on flag state
7. Integrate with existing argument parsing to handle `--counts` flag
8. Output counts in format: `in-progress/pending/remote` (e.g., `2/1/3` or with icons)

### Testing Strategy

- **Unit Tests**: Test `count_local_tasks()`, `count_remote_tasks()`, `format_task_counts()` in isolation
- **Integration Tests**: Full script execution with various mock filesystem states
- **Edge Cases**:
  - Empty tasks directory (no tasks)
  - Tasks with no journal.md (all pending)
  - Tasks all with journal.md (all in-progress)
  - No git remote configured
  - Remote branches with non-standard names
  - Malformed task directory names

### Edge Cases to Handle

- `task-system/tasks/` directory doesn't exist: Return 0/0/0 counts
- Task subdirectory exists but has no `task-system/` folder: Skip it
- Git remote not configured or unreachable: Report remote count as 0
- Branch name doesn't match `task-NNN-*` pattern: Skip it
- Permission errors reading directories: Continue with other directories, log to stderr

## Risks & Concerns

- Git command overhead may slow execution: Use `--no-walk` flags and cache results if needed
- Large number of remote branches could slow scanning: Limit to task branches only with grep filter
- Race condition if tasks created/deleted during scan: Accept eventual consistency, not critical

## Resources & Links

- [Plan - Phase 3 Task Counts](../../../features/001-statusline-task-info/plan.md#phase-3-task-counts)
- [Data Models - Task Status Counts](../../../features/001-statusline-task-info/plan.md#2-task-status-counts-from-filesystem--git)
- [Icon Mapping](../../../features/001-statusline-task-info/plan.md#icon-mapping)

## Acceptance Criteria

- Running `task-status --counts` in main repo outputs task counts in format `in-progress/pending/remote`
- In-progress count matches number of worktrees with journal.md present
- Pending count matches number of worktrees without journal.md
- Remote count matches task branches on origin not present locally
- Output uses icons (`● 2 ◐ 1 ○ 3`) by default, ASCII (`I:2 P:1 R:3`) with `--no-icons`
- Graceful output (`● 0 ◐ 0 ○ 0` or similar) when no tasks exist
- Script completes within 100ms performance budget
- No crashes or errors when task-system directory is missing or empty
