# Task #006: Create spawn-cleanup.sh Script with Tests

## Git References

- **Branch**: task-006-feature
- **PR**: Pending
- **Base Branch**: main

## Current Phase

Phase 4: Verification

## Progress Log

### 2025-12-21 16:45 - Task Started

Task initialized: Create spawn-cleanup.sh Script with Tests.

Task type: feature. No dependencies - this is the first task in feature 002-automatic-task-cleanup.
Branch: task-006-feature. This is the foundation task for the automatic cleanup feature.

**Task Objectives:**
- Create spawn-cleanup.sh that spawns a TMUX pane with Claude cleanup session
- Implement proper argument validation with distinct exit codes (0, 1, 2, 3)
- Create test script that validates all exit code scenarios
- Make both scripts executable and properly documented

**Technical Approach:**
Following TDD - will write test-spawn-cleanup.sh first, then implement spawn-cleanup.sh to pass the tests.

**Next:** Write test-spawn-cleanup.sh with test cases for all exit code scenarios

### 2025-12-21 17:15 - Phase 1 Complete: Test Suite Created

Completed comprehensive TDD test suite for spawn-cleanup.sh. The test script (test-spawn-cleanup.sh) validates all exit code scenarios specified in the technical approach, providing a clear contract for implementation.

**Tests Created:**
- Exit code 1: Missing/empty arguments (5 test cases)
  - No arguments provided
  - Missing main_repo_path argument
  - Empty task_id value
  - Empty main_repo_path value
  - Both arguments empty

- Exit code 2: Path validation (2 test cases)
  - Non-existent directory path
  - Path points to file instead of directory

- Exit code 0/3: TMUX environment detection (1 test case)
  - Passes if script exits 0 (within TMUX) or 3 (outside TMUX)

- Edge cases (3 test cases)
  - Directory path containing spaces
  - Task ID with leading zeros (007)
  - Very long directory paths

**Total: 11 test cases covering all acceptance criteria exit codes.**

Test script committed and pushed. Tests correctly fail as spawn-cleanup.sh doesn't exist yet (TDD verification successful). This test suite serves as executable specification for the implementation phase.

**Next:** Request permission to proceed to Phase 2 (Implementation) and begin coding spawn-cleanup.sh to satisfy the test suite

### 2025-12-21 17:45 - Phase 2 Complete: Implementation Finished

Implemented spawn-cleanup.sh successfully. All 11 tests pass on first run.

**Implementation Details:**
- Used `set -euo pipefail` for strict error handling
- Argument validation with clear error messages to stderr
- Path validation checks both existence and directory type (-d flag)
- TMUX command uses proper quoting for paths with spaces
- Exit codes match the API contract exactly (0, 1, 2, 3)

**Key Decision:**
Used `${1:-}` and `${2:-}` syntax for argument defaults to handle unset variables safely with `set -u` enabled. This is cleaner than checking `$#` for argument count.

**Test Results:**
- All argument validation tests pass (exit 1)
- All path validation tests pass (exit 2)
- TMUX behavior test passes (exit 0 since we're in TMUX)
- All edge cases pass (spaces, leading zeros, long paths)

Implementation committed: b2c0ec9. All sub-tasks marked complete in task.md.

**Next:** Request permission to proceed to Phase 3 (Refactor)

### 2025-12-21 17:50 - Phase 3 Complete: Refactoring Finished

Completed code quality refactoring for both scripts.

**Changes Made:**

spawn-cleanup.sh:
- Removed redundant `exit 0` at end - bash scripts naturally exit with the last command's exit status, so explicit exit 0 after successful if block is unnecessary

test-spawn-cleanup.sh:
- Removed unused YELLOW color variable (was defined but never used)
- Extracted `run_tmux_test()` helper function for tests that accept either exit 0 or 3
- Consolidated 4 TMUX-dependent tests to use the new helper
- Net reduction of ~43 lines while maintaining same test coverage

**Quality Improvements:**
- Better code organization with dedicated helper for TMUX tests
- Less duplication = easier maintenance
- Cleaner, more readable test structure

All 11 tests still passing after refactoring. Committed: 4f41cc3

**Next:** Request permission to proceed to Phase 4 (Verification)
