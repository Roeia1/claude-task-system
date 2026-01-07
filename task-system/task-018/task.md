# Task 018: Create identifier resolution utilities

## Feature Context

**Feature**: [007-task-implementation-orchestration](../features/007-task-implementation-orchestration/feature.md)
**Technical Plan**: [plan.md](../features/007-task-implementation-orchestration/plan.md)

## Overview

Create shared utilities for resolving task identifiers in the `/implement` command. Users can specify tasks using multiple formats:
- Task ID: `015`, `42`
- Task name: `user-authentication`, `jwt-utils`
- Feature name: `001-user-auth` (prompts user to select task from feature)

This task builds the identifier resolution module that handles all these formats, enabling flexible task targeting for the orchestration system.

## Task Type

feature - Determines which workflow to follow during execution

## Priority

P1 - Foundation for the /implement command; other commands depend on identifier resolution

## Dependencies

- [014](../tasks/014/task-system/task-014/task.md) (Create task.json schema and templates): Resolution utilities need to read task.json files to search by task name and feature association

## Objectives

- [ ] Task ID lookup utility that finds worktrees by numeric ID
- [ ] Task name search utility that searches task.json files for matching titles
- [ ] Feature name to task list mapping utility
- [ ] User selection prompt for feature-to-task resolution
- [ ] Unified resolver function that handles all identifier formats

## Sub-tasks

1. [ ] Create `plugin/scripts/resolve_identifier.py` module structure with CLI interface
2. [ ] Implement `resolve_task_id()` function to find task worktrees by ID
3. [ ] Implement `resolve_task_name()` function to search task.json files by title
4. [ ] Implement `get_tasks_for_feature()` function to list tasks belonging to a feature
5. [ ] Implement task status detection (PENDING, IN_PROGRESS, BLOCKED, COMPLETED)
6. [ ] Implement `prompt_task_selection()` function for interactive feature-to-task selection
7. [ ] Implement main `resolve_identifier()` function that orchestrates resolution
8. [ ] Add error handling with clear, actionable error messages
9. [ ] Add cross-platform path handling (Windows/Unix compatibility)

## Technical Approach

### Files to Create/Modify

- `plugin/scripts/resolve_identifier.py` - New file: identifier resolution utilities

### Implementation Steps

1. Create module with clear imports and type hints using stdlib only (pathlib, json, typing, argparse)
2. Define data classes or TypedDict for task metadata and resolution results
3. Implement `resolve_task_id()`:
   - Look for `task-system/tasks/{id}/` directory
   - Validate worktree exists and contains expected structure
   - Return task path or None
4. Implement `resolve_task_name()`:
   - Search all `task-system/tasks/*/task-system/task-*/task.json` files
   - Parse JSON and match against meta.title (case-insensitive, partial match)
   - Return list of matching tasks (may be multiple)
5. Implement `get_tasks_for_feature()`:
   - Search task.json files for meta.feature matching feature ID
   - Return list of tasks with their status
6. Implement task status detection:
   - PENDING: worktree exists, no journal.md, all objectives pending
   - IN_PROGRESS: journal.md exists, no blocker.md
   - BLOCKED: blocker.md exists
   - COMPLETED: all objectives done or PR merged (check via git)
7. Implement `prompt_task_selection()`:
   - Display numbered list of tasks with status
   - Accept user input for selection
   - Return selected task
8. Implement `resolve_identifier()`:
   - Try task ID first (exact match on numeric ID)
   - Try task name second (search by title)
   - Try feature name last (prompt for selection)
   - Return resolved task path or appropriate error

### API Contract

The module exposes these functions:

```python
def resolve_identifier(identifier: str, project_root: Path) -> ResolveResult:
    """
    Main entry point. Resolves identifier to a task worktree path.

    Args:
        identifier: Task ID, task name, or feature name
        project_root: Root of the project containing task-system/

    Returns:
        ResolveResult with task_path or error details
    """

def resolve_task_id(task_id: str, project_root: Path) -> Optional[Path]:
    """Find task worktree by numeric ID."""

def resolve_task_name(name: str, project_root: Path) -> List[TaskInfo]:
    """Search task.json files for matching titles."""

def get_tasks_for_feature(feature_id: str, project_root: Path) -> List[TaskInfo]:
    """List all tasks belonging to a feature."""

def get_task_status(task_path: Path) -> TaskStatus:
    """Detect task status from filesystem state."""

def prompt_task_selection(tasks: List[TaskInfo]) -> Optional[TaskInfo]:
    """Interactive prompt for task selection."""
```

### Data Models

```python
class TaskStatus(Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"

@dataclass
class TaskInfo:
    id: str
    title: str
    task_type: str
    priority: str
    feature_id: Optional[str]
    status: TaskStatus
    worktree_path: Path

@dataclass
class ResolveResult:
    success: bool
    task_path: Optional[Path]
    task_info: Optional[TaskInfo]
    error: Optional[str]
    candidates: List[TaskInfo]  # Multiple matches for disambiguation
```

### Testing Strategy

- **Unit Tests**: Test each resolve function independently with mock filesystem
- **Integration Tests**: Test full resolution flow with actual task-system structure
- **Edge Cases**:
  - Non-existent task ID
  - Partial task name matching multiple tasks
  - Feature with no tasks
  - Feature with mix of task statuses
  - Cross-platform paths (forward slash vs backslash)
  - Empty task-system directory

### Edge Cases to Handle

- Task ID that doesn't exist: Return clear "Task {id} not found" error
- Task name matching multiple tasks: Return list for disambiguation
- Feature name with no tasks: Return "No tasks found for feature {name}"
- Invalid task.json (malformed JSON): Skip and log warning, continue searching
- Missing task-system directory: Return "task-system directory not found"
- Worktree exists but task.json missing: Status is PENDING (not yet built properly)

## Risks & Concerns

- **JSON parsing errors**: Mitigation - wrap in try/except, skip malformed files with warning
- **Path compatibility**: Mitigation - use pathlib.Path consistently, avoid hardcoded separators
- **Performance with many tasks**: Mitigation - lazy loading, stop search on exact match
- **Interactive prompt in non-TTY**: Mitigation - detect TTY, return error if prompt needed but not available

## Resources & Links

- [Python pathlib documentation](https://docs.python.org/3/library/pathlib.html)
- [Python json module](https://docs.python.org/3/library/json.html)
- [Feature 007 plan.md](../features/007-task-implementation-orchestration/plan.md) - identifier resolution requirements

## Acceptance Criteria

- Resolving task ID `015` returns path to `task-system/tasks/015/` if it exists
- Resolving task name `user-auth` finds tasks with "user-auth" in title
- Resolving feature name `007` lists all tasks for that feature with status
- User can interactively select a task when feature has multiple tasks
- Clear error messages for: task not found, feature has no tasks, multiple matches
- Works on both Windows and Unix platforms
- All functions have proper type hints
- Module can be imported and used by implement.py
