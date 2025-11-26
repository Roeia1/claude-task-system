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
   - `task-system/worktrees/`

2. Create `task-system/tasks/TASK-LIST.md` with initial content:
   ```markdown
   # Task List

   ## IN_PROGRESS

   ## PENDING

   ## COMPLETED
   ```

3. Confirm to user: "Task system initialized. You can now use /task-system:define-feature to start."
