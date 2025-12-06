---
name: task-start
description: ONLY activate on DIRECT user request to start a task. User must explicitly mention keywords: 'start task', 'begin task', 'work on task [ID]'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to start or resume a task.
---

# Task Start Skill

Prepares environment for task execution using git worktrees. Routes to the appropriate flow based on context.

## Step 0: Get Task ID

**If user specified a task ID** (e.g., "start task 042", "work on task 15"):
- Extract the task ID from their prompt
- Store as `$TASK_ID`

**If no task ID specified**:
- Ask user: "Which task ID are you working on?"
- Wait for response
- Store as `$TASK_ID`

## Step 1: Detect Context and Validate

Run the context detection script with the task ID:

```bash
bash scripts/detect-context.sh $TASK_ID
```

**Parse JSON output** and check `status`:

- If `status: "error"`:
  - Display the `message` to user
  - Provide guidance based on `error_type`:
    - `spawn_mismatch`: "Please start a new Claude session from the correct directory"
    - `wrong_worktree`: "Navigate to the correct worktree or use this worktree's task"
    - `branch_mismatch`: "The git branch doesn't match the task. Check your git state"
    - `missing_task_id`: "Task ID is required"
  - **STOP** - do not continue

- If `status: "ok"`:
  - Continue to Step 2

## Step 2: Execute Flow

**Route based on `context` from JSON output:**

- If `context: "main"` → Read and execute `main-repo-flow.md`
- If `context: "worktree"` → Read and execute `worktree-flow.md`
