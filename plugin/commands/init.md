---
description: Initialize the task-system directory structure in a project
---

# Initialize Task System

Creates the `task-system/` directory structure for tracking features, tasks, and ADRs.

## Process

1. Create directories:
   - `task-system/features/`
   - `task-system/tasks/`
   - `task-system/adrs/`
   - `task-system/archive/`

2. Add gitignore pattern for task worktrees:
   - Check if `.gitignore` exists at project root
   - If the pattern `task-system/tasks/*/` is not already present, append:
     ```
     # Claude Task System - Task worktrees (each task folder is a git worktree)
     task-system/tasks/*/
     ```

3. Confirm to user: "Task system initialized. You can now use /task-system:define-feature to start."

## Notes

- **No TASK-LIST.md**: Task status is derived dynamically from filesystem and git state
- **Task worktrees**: Each task gets its own worktree in `task-system/tasks/NNN/`
- **Use `list tasks`**: To see all tasks and their status
