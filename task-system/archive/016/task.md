# Task 016: Create /implement command

## Feature Context

**Feature**: [007-task-implementation-orchestration](../features/007-task-implementation-orchestration/feature.md)
**Technical Plan**: [plan.md](../features/007-task-implementation-orchestration/plan.md)

## Overview

Create the `/implement` slash command, the primary entry point for starting or resuming autonomous task implementation. This command accepts flexible identifiers (task ID, task name, or feature name), resolves them to a specific task worktree, validates the task context, spawns the background implementation script, and reports status back to the user. This is a critical user-facing component that bridges human intent with the autonomous execution engine.

## Task Type

feature

## Priority

P1 - Critical path component; users cannot start autonomous implementation without this command

## Dependencies

- [015](../../archive/015/task.md) (Create implementation script): The /implement command spawns implement.py in the background; the script must exist before this command can function

## Objectives

- [ ] Create implement.md command file that triggers the implement skill
- [ ] Create INSTRUCTIONS.md with identifier resolution logic
- [ ] Create SKILL.md with validation and script spawning logic
- [ ] Implement identifier resolution (task ID, task name, feature name)
- [ ] Implement task validation (worktree exists, task.json exists)
- [ ] Implement background script spawning with proper arguments
- [ ] Implement status reporting (success, blocked, errors)

## Sub-tasks

1. [ ] Create `plugin/commands/implement.md` with command registration and skill trigger
2. [ ] Create `plugin/instructions/implement/INSTRUCTIONS.md` with identifier resolution algorithm
3. [ ] Create `plugin/skills/implement/SKILL.md` with full implementation logic
4. [ ] Implement task ID resolution - direct path lookup in `task-system/tasks/{id}/`
5. [ ] Implement task name resolution - search task.json files for matching meta.title
6. [ ] Implement feature name resolution - lookup feature, list tasks, prompt user to select
7. [ ] Implement worktree validation - verify directory exists and is a valid git worktree
8. [ ] Implement task.json validation - verify file exists and is valid JSON
9. [ ] Implement background script spawning using Bash tool with proper arguments
10. [ ] Implement status reporting - parse script output and report to user

## Technical Approach

### Files to Create/Modify

- `plugin/commands/implement.md` - Command registration that triggers the skill
- `plugin/instructions/implement/INSTRUCTIONS.md` - Detailed identifier resolution logic
- `plugin/skills/implement/SKILL.md` - Full skill implementation with validation and spawning

### Implementation Steps

1. Create the command file (`implement.md`) that registers `/implement` and triggers the skill
2. Create the instructions file with the identifier resolution algorithm:
   - First try exact match as task ID in `task-system/tasks/{identifier}/`
   - Then try match as task name by searching task.json files
   - Finally try match as feature name in `task-system/features/`
3. Create the skill file with:
   - Identifier parsing and validation
   - Task resolution logic following the priority order
   - Worktree existence and validity checks
   - task.json existence and JSON validity checks
   - Background script spawning with Bash tool
   - Status parsing and user-friendly reporting
4. Handle error cases with clear, actionable messages

### API Contract

**Command: `/implement <identifier>`**

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `identifier` | Yes | Task ID (`015`), task name (`user-auth`), or feature name (`007-user-auth`) |

**Identifier Resolution Priority:**
1. Try exact match as task ID in `task-system/tasks/{identifier}/`
2. Try match as task name (search task.json meta.title)
3. Try match as feature name -> prompt user to select task

**Success Response:**
- Spawns `implement.py` in background
- Reports: "Starting implementation for task {id}..."
- Returns final status: FINISH, BLOCKED, TIMEOUT, or MAX_CYCLES

**Error Responses:**
| Error | Message |
|-------|---------|
| Identifier not found | "No task found for '{identifier}'. Available tasks: ..." |
| Worktree missing | "Task {id} worktree not found. Run task-resume first." |
| task.json missing | "task.json not found in task {id}." |
| Already blocked | "Task {id} is BLOCKED. Navigate to worktree and run /resolve." |

### Testing Strategy

- **Unit Tests**:
  - Test identifier resolution for each format (ID, name, feature)
  - Test validation logic for missing worktree
  - Test validation logic for missing task.json
  - Test error message formatting
- **Integration Tests**:
  - Test full flow: identifier -> resolution -> validation -> spawn
  - Test blocked task detection and reporting
  - Test feature name -> task selection flow
- **Edge Cases**:
  - Ambiguous task names (multiple matches)
  - Non-existent identifiers
  - Invalid JSON in task.json
  - Script spawn failures

### Edge Cases to Handle

- Multiple tasks with similar names: Present list and prompt for selection
- Feature with no tasks: Report "Feature {name} has no tasks generated yet"
- Feature with all tasks completed: Report status, suggest no action needed
- Task in BLOCKED state: Detect blocker.md, report with instructions to run /resolve
- Task already IN_PROGRESS in another session: Allow (script handles concurrency)
- Invalid task.json (parse error): Clear error message with file path

## Risks & Concerns

- **Path handling across platforms**: Use pathlib patterns for Windows/Unix compatibility
- **Script spawning reliability**: Ensure proper background execution and output capture
- **Identifier ambiguity**: Clear prompts when multiple matches found
- **State race conditions**: Script handles task state; command just validates and spawns

## Resources & Links

- [Claude CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Feature Definition](../features/007-task-implementation-orchestration/feature.md) - Section: Implementation Command
- [Technical Plan](../features/007-task-implementation-orchestration/plan.md) - Phase 3: Commands

## Acceptance Criteria

- `/implement 016` resolves task by ID and spawns implementation script
- `/implement user-auth` resolves task by name search in task.json files
- `/implement 007-task-orchestration` lists tasks in feature and prompts for selection
- Command validates worktree exists before spawning script
- Command validates task.json exists and is valid JSON before spawning
- Clear error messages for missing worktree, missing task.json, and not-found identifier
- Script is spawned in background with correct task_path argument
- Command reports final status (FINISH, BLOCKED, error) to user
- BLOCKED status includes instructions to navigate to worktree and run /resolve
