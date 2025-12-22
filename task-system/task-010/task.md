# Task 010: Implement claude-spawn.sh and integrate with task-start

## Feature Context

**Feature**: [003-tmux-task-navigation](../../features/003-tmux-task-navigation/feature.md)
**Technical Plan**: [plan.md](../../features/003-tmux-task-navigation/plan.md)

## Overview

This task creates a generic utility script `claude-spawn.sh` that enables seamless handoff to a new Claude session in a different directory using tmux. When a user runs "start task NNN" from the wrong location (master branch or incorrect worktree), the system will automatically spawn a new Claude session in the correct worktree and terminate the current session. This eliminates manual navigation steps and provides a continuous user experience.

The script uses `tmux run-shell -d` to schedule the new Claude session (ensuring it survives the parent process death), then kills the current Claude process. The task-start skill is modified to detect wrong location and invoke this script automatically.

## Task Type

feature - New utility script and skill enhancement for seamless task navigation

## Priority

P1 - Core infrastructure for improved developer experience across all task workflows

## Dependencies

None - This is a foundational task with no prerequisites

## Objectives

- [ ] Create a generic, reusable spawn script for any "spawn Claude elsewhere" scenario
- [ ] Enable automatic navigation to correct worktree when starting tasks from wrong location
- [ ] Provide graceful fallback with manual instructions when tmux is unavailable
- [ ] Ensure robust error handling with clear exit codes

## Sub-tasks

1. [ ] Create `plugin/scripts/` directory structure
2. [ ] Implement `claude-spawn.sh` with argument validation (path, prompt required)
3. [ ] Add tmux environment detection (`$TMUX` variable check)
4. [ ] Add target path existence validation
5. [ ] Implement `tmux run-shell -d` spawn logic with 1-second delay
6. [ ] Implement process termination via `kill $PPID`
7. [ ] Modify `detect-context.sh` to return worktree path for requested task
8. [ ] Modify `task-start/SKILL.md` to invoke spawn on `not_in_worktree` error
9. [ ] Create test script `tests/plugin/scripts/test-claude-spawn.sh`
10. [ ] Test all error cases and edge cases (spaces in paths, special chars in prompts)

## Technical Approach

### Files to Create/Modify

- `plugin/scripts/claude-spawn.sh` - New spawn script with argument validation, tmux detection, and process handoff
- `plugin/skills/task-start/SKILL.md` - Add spawn integration logic for `not_in_worktree` error handling
- `plugin/skills/task-start/scripts/detect-context.sh` - Enhance to return worktree path for requested task ID
- `tests/plugin/scripts/test-claude-spawn.sh` - Comprehensive test suite for spawn script

### Implementation Steps

1. **Create claude-spawn.sh foundation**
   - Create `plugin/scripts/` directory
   - Add shebang and usage documentation
   - Implement argument parsing (path as $1, prompt as $2)
   - Add argument validation with exit code 2 for missing/empty args

2. **Add environment validation**
   - Check `$TMUX` variable for tmux detection (exit 1 if not set)
   - Validate target path exists and is a directory (exit 3 if invalid)
   - Add helpful error messages for each failure case

3. **Implement spawn mechanism**
   - Build tmux command: `tmux run-shell -d 'sleep 1 && cd "$PATH" && exec claude --dangerously-skip-permissions "$PROMPT"'`
   - Ensure proper shell quoting for paths/prompts with spaces or special characters
   - Execute `kill $PPID` to terminate current Claude after scheduling

4. **Modify detect-context.sh**
   - When in main repo with user-provided task ID, look up worktree path
   - Return worktree path in JSON output for spawn script use
   - Pattern: `task-system/tasks/NNN` where NNN is the task ID

5. **Integrate with task-start SKILL.md**
   - On `not_in_worktree` error with user-provided task ID:
     - Extract worktree path from detect-context.sh output
     - Invoke: `claude-spawn.sh <worktree_path> "start task NNN"`
     - Handle spawn script exit codes:
       - Exit 1: Show manual navigation instructions (not in tmux)
       - Exit 2: Show argument error message
       - Exit 3: Show path not found error
   - If spawn succeeds, Claude is killed - no further action needed

6. **Create test suite**
   - Test missing arguments (exit 2)
   - Test empty arguments (exit 2)
   - Test non-existent path (exit 3)
   - Test path is file not directory (exit 3)
   - Test valid args outside tmux (exit 1)
   - Test paths with spaces
   - Test prompts with special characters

### Testing Strategy

- **Unit Tests**: Test script validates arguments and returns correct exit codes
- **Integration Tests**: Manual testing of full spawn flow in tmux environment
- **Edge Cases**:
  - Path with spaces: `/home/user/my project/task-system/tasks/010`
  - Prompt with special characters: `start task 010 "with quotes"`
  - Missing tmux: Should exit 1 with helpful message
  - Invalid path: Should exit 3 with helpful message

### Edge Cases to Handle

- **Path with spaces**: Use proper quoting in tmux command (`"$PATH"`)
- **Prompt with special characters**: Escape or quote properly in command construction
- **Slow systems**: 1-second delay should be sufficient; document as configurable if needed
- **User not in tmux**: Provide clear manual instructions as fallback
- **Invalid worktree path**: Validate path exists before attempting spawn
- **$PPID is not Claude**: Low risk since script is always spawned by Claude

## Risks & Concerns

- **kill $PPID safety**: Script assumes parent is Claude; mitigated by script only being invoked by Claude
- **Prompt injection**: Malformed prompts could break tmux command; mitigated by proper shell escaping
- **1-second delay**: May be insufficient on very slow systems; can increase if issues arise
- **tmux not installed**: User gets clear error and manual fallback instructions

## Resources & Links

- [tmux run-shell documentation](https://man7.org/linux/man-pages/man1/tmux.1.html) - run-shell command reference
- [Claude CLI documentation](https://docs.anthropic.com/claude/docs/claude-cli) - CLI flags and usage
- [Feature definition](../../features/003-tmux-task-navigation/feature.md) - User stories and requirements
- [Technical plan](../../features/003-tmux-task-navigation/plan.md) - Detailed implementation design

## Acceptance Criteria

- [ ] `claude-spawn.sh` accepts path and prompt arguments
- [ ] Script exits with code 1 when not running inside tmux
- [ ] Script exits with code 2 when arguments are missing or empty
- [ ] Script exits with code 3 when target path does not exist
- [ ] Script successfully spawns new Claude session in target directory when in tmux
- [ ] Current Claude process is terminated after scheduling new session
- [ ] New Claude session executes with provided prompt
- [ ] `task-start` invokes spawn when user runs "start task NNN" from wrong location
- [ ] Manual navigation instructions shown when not in tmux
- [ ] All test cases pass in test script
- [ ] Transition feels seamless to user (no perceptible gap between sessions)
