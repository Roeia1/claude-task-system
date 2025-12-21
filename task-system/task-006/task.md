# Task 006: Create spawn-cleanup.sh Script with Tests

## Feature Context

**Feature**: [002-automatic-task-cleanup](../../features/002-automatic-task-cleanup/feature.md)
**Technical Plan**: [plan.md](../../features/002-automatic-task-cleanup/plan.md)

## Overview

Create the shell script that spawns a TMUX pane at the main repository root with a Claude Code session for task cleanup. This script is the foundation of the automatic cleanup feature - it handles argument validation, path verification, and TMUX command execution. A companion test script validates all argument handling scenarios and exit codes.

This is Phase 1 (Foundation) from the technical plan. The spawn script will be invoked by the task-cleanup skill when running from a worktree context.

## Task Type

feature - Creates new functionality for automatic TMUX pane spawning.

## Priority

P1 - Critical path for the automatic cleanup feature. Other tasks depend on this script existing and working correctly.

## Dependencies

None - This is the first task in the feature implementation sequence.

## Objectives

- [ ] Create spawn-cleanup.sh that spawns a TMUX pane with Claude cleanup session
- [ ] Implement proper argument validation with distinct exit codes
- [ ] Create test script that validates all exit code scenarios
- [ ] Make both scripts executable and properly documented

## Sub-tasks

1. [ ] Create scripts directory at `plugin/skills/task-cleanup/scripts/`
2. [ ] Create spawn-cleanup.sh with argument parsing ($1=task_id, $2=main_repo_path)
3. [ ] Add validation for missing/empty arguments (exit 1)
4. [ ] Add path existence check for main_repo_path (exit 2)
5. [ ] Add TMUX split-window command execution
6. [ ] Add error handling for TMUX command failure (exit 3)
7. [ ] Create test-spawn-cleanup.sh with test cases
8. [ ] Add test for missing arguments scenario
9. [ ] Add test for invalid path scenario
10. [ ] Add test for valid arguments scenario (mock TMUX if not available)

## Technical Approach

### Files to Create/Modify

- `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh` - New script that spawns TMUX pane
- `plugin/skills/task-cleanup/scripts/test-spawn-cleanup.sh` - New test script for validation

### Implementation Steps

1. Create the scripts directory structure under task-cleanup skill
2. Write spawn-cleanup.sh with the following logic:
   - Parse $1 as task_id and $2 as main_repo_path
   - Check both arguments are provided and non-empty (exit 1 if not)
   - Check main_repo_path exists as a directory (exit 2 if not)
   - Execute: `tmux split-window -h -c "$main_repo_path" "claude --prompt 'cleanup task $task_id'"`
   - Check TMUX command exit status (exit 3 if failed)
   - Exit 0 on success
3. Write test-spawn-cleanup.sh that:
   - Tests missing arguments (expects exit 1)
   - Tests invalid path (expects exit 2)
   - Tests valid arguments (expects exit 0 or 3 depending on TMUX availability)
4. Make both scripts executable with chmod +x

### API Contract

**spawn-cleanup.sh Interface**:

| Argument | Position | Required | Description | Example |
|----------|----------|----------|-------------|---------|
| task_id | $1 | Yes | Task ID number | `015` |
| main_repo_path | $2 | Yes | Absolute path to main repo | `/home/user/project` |

**Exit Codes**:

| Code | Meaning | Condition |
|------|---------|-----------|
| 0 | Success | TMUX pane spawned successfully |
| 1 | Invalid arguments | Missing or empty task_id or main_repo_path |
| 2 | Path not found | main_repo_path directory does not exist |
| 3 | TMUX failed | tmux split-window command failed |

### Testing Strategy

- **Unit Tests** (test-spawn-cleanup.sh):
  - Test missing task_id argument: `./spawn-cleanup.sh` (expect exit 1)
  - Test missing main_repo_path: `./spawn-cleanup.sh 015` (expect exit 1)
  - Test empty task_id: `./spawn-cleanup.sh "" /tmp` (expect exit 1)
  - Test invalid path: `./spawn-cleanup.sh 015 /nonexistent/path` (expect exit 2)
  - Test valid arguments: `./spawn-cleanup.sh 015 /tmp` (expect exit 0 if in TMUX, exit 3 if not)

- **Edge Cases**:
  - Path with spaces in name
  - Task ID with leading zeros (015)
  - Very long paths
  - Special characters in path

### Edge Cases to Handle

- Empty string arguments: Treat same as missing, exit 1
- Path exists but is a file not directory: Exit 2
- TMUX not installed: tmux command fails, exit 3
- Not running inside TMUX session: tmux command fails, exit 3
- Path with spaces: Use proper quoting in tmux command

## Risks & Concerns

- **TMUX availability**: Script should fail gracefully with exit 3 when TMUX is unavailable. Test script should handle this case.
- **Claude CLI availability**: If `claude` is not in PATH, the spawned pane will show an error but that's expected (not our script's responsibility to validate).
- **Shell compatibility**: Using bash explicitly via shebang. Avoid bashisms that don't work across systems.

## Resources & Links

- [TMUX split-window documentation](https://man7.org/linux/man-pages/man1/tmux.1.html)
- [Technical Plan - Phase 1](../../features/002-automatic-task-cleanup/plan.md)
- [Feature Definition](../../features/002-automatic-task-cleanup/feature.md)

## Acceptance Criteria

- spawn-cleanup.sh exists at `plugin/skills/task-cleanup/scripts/spawn-cleanup.sh`
- Script accepts task_id and main_repo_path as positional arguments
- Script exits with code 1 when arguments are missing or empty
- Script exits with code 2 when main_repo_path does not exist
- Script exits with code 3 when TMUX command fails
- Script exits with code 0 when TMUX pane is successfully spawned
- test-spawn-cleanup.sh exists and validates all exit code scenarios
- Both scripts are executable (chmod +x)
- Running test script produces clear pass/fail output for each test case
