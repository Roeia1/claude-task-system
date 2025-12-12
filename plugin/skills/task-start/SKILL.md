---
name: task-start
description: ONLY activate on DIRECT user request to start a task. User must explicitly mention keywords: 'start task', 'begin task', 'work on task [ID]'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to start or resume a task.
---

# Task Start Skill

Begins the execution workflow for a task. Must be run from within the task's worktree.

## Prerequisites

- Task must already exist with worktree created (via `task-generation` skill)
- Must be run from within the task's worktree directory
- If not in worktree, provides instructions to navigate there

## Step 0: Get Task ID (Optional)

**Task ID is auto-detected from `task-system/task-NNN` folder when in a worktree.**

**If user specified a task ID** (e.g., "start task 042", "work on task 15"):

- Extract the task ID from their prompt
- Store as `$USER_INPUT` (used for validation against detected task)

**If no task ID specified**:

- That's OK - task ID will be auto-detected from folder in worktree
- Store empty `$USER_INPUT`

**Note**: This command only works from within a task worktree.

## Step 1: Detect Context and Validate

Run the context detection script (task ID is optional in worktree):

```bash
bash scripts/detect-context.sh $USER_INPUT
```

**Parse JSON output** and check `status`:

- If `status: "error"`:

  - Display the `message` to user
  - Provide guidance based on `error_type`:
    - `not_in_worktree`: "You must be in a task worktree to start a task. Use 'list tasks' to see available tasks."
    - `no_task_folder`: "No task-system/task-NNN folder found. Cannot determine which task this is."
    - `task_id_mismatch`: "This worktree contains a different task than you requested"
    - `branch_mismatch`: "The git branch doesn't match the task. Check your git state"
  - **STOP** - do not continue

- If `status: "ok"`:
  - Continue to Step 2

## Step 2: Execute Worktree Flow

Read and execute `worktree-flow.md` which:

1. Validates task state and reads task metadata
2. Loads journaling guidelines
3. Hands off to type-specific workflow for Phase 1 execution

---

## From Main Repo Handling

If the user runs `start task` from the main repository (not a worktree), the script returns a `not_in_worktree` error.

Display:

```
===============================================================
Cannot Start Task From Main Repository
===============================================================

Tasks can only be started from within their worktree.

To start a task:
1. Navigate to the task worktree: cd task-system/tasks/NNN
2. Start a new Claude session
3. Say "start task"

Use "list tasks" to see available tasks and their status.
===============================================================
```

---

## Error Handling

| Error            | Message                                                    |
| ---------------- | ---------------------------------------------------------- |
| Not in worktree  | "Tasks can only be started from within a worktree"         |
| No task folder   | "No task-system/task-NNN folder found in worktree"         |
| Task ID mismatch | "This worktree contains task XXX, not task YYY"            |
| Branch mismatch  | "Expected branch task-$TASK_ID-\*, got $CURRENT_BRANCH"    |
