# Technical Plan: Claude Spawn - Same-Pane Session Handoff

**Feature**: [feature.md](./feature.md)
**Created**: 2025-12-22
**Status**: Draft

## Executive Summary

Create a generic bash script `claude-spawn.sh` that schedules a new Claude session in a target directory via `tmux run-shell -d`, then kills the current Claude process. Integrate with `task-start` skill to auto-spawn when user starts a task from wrong location.

## Technical Approach

- **Architectural Pattern**: Simple script-based solution, no persistent state
- **Integration Points**: `task-start` skill invokes script on `not_in_worktree` error
- **Development Strategy**: Build script first, then integrate with skill

## System Architecture

### Components

1. **`claude-spawn.sh`**
   - **Purpose**: Generic utility to spawn Claude in a different directory
   - **Responsibilities**: Validate inputs, schedule new Claude via tmux, kill current process
   - **Interfaces**: CLI arguments (path, prompt), exit codes for error handling

2. **`task-start` Skill (modified)**
   - **Purpose**: Start task execution workflow
   - **Responsibilities**: Detect wrong location, invoke spawn script, handle errors
   - **Interfaces**: Reads detect-context.sh output, invokes claude-spawn.sh

### Component Diagram

```
User: "start task 015"
         │
         ▼
┌─────────────────────┐
│  task-start SKILL   │
│                     │
│  detect-context.sh  │──► not_in_worktree error
│         │           │
│         ▼           │
│  claude-spawn.sh    │──► Exit 1? Show manual instructions
│         │           │
└─────────│───────────┘
          │ (on success, script kills Claude)
          ▼
┌─────────────────────┐
│  tmux run-shell -d  │
│  (1 sec delay)      │
│         │           │
│         ▼           │
│  New Claude session │
│  in worktree with   │
│  "start task 015"   │
└─────────────────────┘
```

### Data Flow

1. User says "start task NNN" from master branch or wrong worktree
2. `detect-context.sh` returns `not_in_worktree` error with worktree path
3. Skill invokes `claude-spawn.sh <worktree_path> "start task NNN"`
4. Script validates inputs and tmux environment
5. Script schedules: `tmux run-shell -d 'sleep 1 && cd <path> && exec claude ...'`
6. Script kills current Claude: `kill $PPID`
7. After 1 second, new Claude starts in correct worktree with prompt

## Technology Choices

### Core Technologies

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Script Language | Bash | Matches existing scripts, no runtime deps |
| Process Scheduling | `tmux run-shell -d` | Tmux owns process, survives parent death |
| Process Termination | `kill $PPID` | Parent process is Claude |

### Key Decisions

- **1 second delay**: Safe buffer for old Claude to die before new one starts
- **`$PPID` for kill**: Script is spawned by Claude, so `$PPID` is Claude process
- **Proper quoting**: Handle prompts with spaces/special characters

## API Contracts

### Script: `claude-spawn.sh`

**Usage:**
```bash
claude-spawn.sh <path> <prompt>
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `path` | Yes | Absolute path to target directory |
| `prompt` | Yes | Prompt to pass to new Claude session |

**Exit Codes:**

| Code | Meaning | Skill Action |
|------|---------|--------------|
| 0 | Success (Claude killed, never returned) | N/A |
| 1 | Not running inside tmux | Show manual instructions |
| 2 | Invalid/missing arguments | Show error message |
| 3 | Target path does not exist | Show error message |

**Example:**
```bash
claude-spawn.sh "/home/user/project/task-system/tasks/015" "start task 015"
```

## Implementation Strategy

### Phase 1: Foundation - Create `claude-spawn.sh`

1. Create `plugin/scripts/` directory
2. Create `claude-spawn.sh` with:
   - Argument validation (path, prompt)
   - Tmux environment check (`$TMUX` variable)
   - Path existence validation
3. Add executable permissions

**Success Criteria**: Script validates inputs and detects tmux correctly

### Phase 2: Core - Implement Spawn Logic

1. Implement `tmux run-shell -d` command with:
   - 1 second sleep
   - `cd` to target path
   - `exec claude --dangerously-skip-permissions "<prompt>"`
2. Implement `kill $PPID` to terminate current Claude
3. Test the spawn mechanism manually

**Success Criteria**: Running script from tmux spawns new Claude and kills old one

### Phase 3: Integration - Modify `task-start` Skill

1. Modify `SKILL.md` to handle `not_in_worktree` error:
   - Invoke `claude-spawn.sh` with worktree path and prompt
   - If script returns error (exit 1/2/3), handle appropriately:
     - Exit 1: Show manual instructions (not in tmux)
     - Exit 2/3: Show error message
   - If script succeeds, Claude is killed - no further handling needed
2. Update `detect-context.sh` to return worktree path for requested task

**Success Criteria**: "start task NNN" from master branch automatically spawns Claude in correct worktree

### Phase 4: Polish - Testing & Edge Cases

1. Create test script `tests/plugin/scripts/test-claude-spawn.sh`
2. Test error cases:
   - Missing arguments
   - Invalid path
   - Not in tmux
3. Add helpful error messages

**Success Criteria**: All error cases tested, graceful fallback when tmux unavailable

## Testing Strategy

### Test Script: `tests/plugin/scripts/test-claude-spawn.sh`

| Test Category | Test Case | Expected Exit |
|---------------|-----------|---------------|
| **Exit 2: Invalid Arguments** | No arguments | 2 |
| | Missing prompt (only path) | 2 |
| | Empty path | 2 |
| | Empty prompt | 2 |
| **Exit 3: Path Not Found** | Non-existent path | 3 |
| | Path is file, not directory | 3 |
| **Exit 1 or 0: TMUX Behavior** | Valid arguments | 0 (in tmux) or 1 (not in tmux) |
| **Edge Cases** | Path with spaces | 0 or 1 |
| | Prompt with special characters | 0 or 1 |

Run via: `./tests/run-tests.sh claude-spawn`

## Security Considerations

- **`--dangerously-skip-permissions`**: Intentional for seamless workflow; user consented by initiating "start task"
- **`kill $PPID`**: Only kills parent process (Claude), not arbitrary processes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `kill $PPID` kills wrong process | Low | High | Validate `$PPID` is Claude process |
| Prompt with special chars breaks command | Medium | Medium | Proper shell quoting |
| 1 second delay insufficient on slow systems | Low | Low | Can increase if needed |
| User not in tmux confused by manual steps | Low | Low | Clear error message |
| Script path hardcoded incorrectly | Low | Medium | Use relative path from plugin |

## Dependencies

### External Tools
- **tmux**: Must be installed and session running inside tmux
- **Claude CLI**: Must support `--dangerously-skip-permissions` flag

### Internal Dependencies
- **detect-context.sh**: Must return worktree path for requested task
- **task-start skill**: Entry point for integration

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `plugin/scripts/claude-spawn.sh` | Create | Main spawn script |
| `plugin/skills/task-start/SKILL.md` | Modify | Add spawn integration |
| `plugin/skills/task-start/scripts/detect-context.sh` | Modify | Return worktree path for task |
| `tests/plugin/scripts/test-claude-spawn.sh` | Create | Test script |

## Future Considerations

- Support for other terminal multiplexers (screen, zellij)
- Configurable delay parameter
- Logging spawn events for debugging
- Custom Claude flags beyond `--dangerously-skip-permissions`

---

**Note**: This document describes HOW to build the feature. Review and approve before generating tasks.
