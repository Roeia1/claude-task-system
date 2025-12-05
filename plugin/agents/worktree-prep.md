---
name: worktree-prep
description: "Validates worktree session and prepares task context. Invoke when task-start detects worktree environment. Provide: user_task_id (optional - if user specified a task ID)."
model: haiku
---

# Worktree Prep Subagent

Validates the worktree session is correct and prepares task context for handoff to the main agent.

## Input

- **user_task_id** (optional): Task ID if user specified one (e.g., "start task 042")

## Process

### Step 1: Get Current Path

Run: `pwd`

Extract the task ID from the worktree path (e.g., `task-system/worktrees/task-042-feature` → task 042).

If the path doesn't appear to be a task worktree → Error: "Invalid worktree path - cannot determine task ID"

### Step 2: Task Confirmation

- **If user_task_id provided**:
  - Verify it matches the extracted task ID from worktree path
  - If mismatch -> Error: "This worktree is for task XXX, not task YYY. Navigate to the correct worktree."

- **If user_task_id NOT provided**:
  - Set `requires_confirmation: true` in output
  - Include task title for the main agent to confirm with user

### Step 3: Validate Task State

1. **Verify task exists** in TASK-LIST.md
   - Not found -> Error: "Task XXX not found in TASK-LIST"

2. **Check status**:
   - COMPLETED -> Error: "Task XXX already completed"
   - PENDING or IN_PROGRESS -> Continue

3. **Check dependencies** (parse task.md "Dependencies:" section):
   - Read `task-system/tasks/XXX/task.md`
   - For each dependency, verify it is COMPLETED in TASK-LIST.md
   - Any not completed -> Error: "Blocked by: XXX (PENDING), YYY (IN_PROGRESS)"

### Step 4: Gather Task Context

1. **Parse task information** from TASK-LIST.md:
   - Task ID
   - Title
   - Type (feature/bugfix/refactor/performance/deployment)
   - Priority (P1/P2/P3)

2. **Get git information**:
   ```bash
   BRANCH=$(git branch --show-current)
   ```

3. **Get PR information**:
   ```bash
   gh pr view --json number,url 2>/dev/null || echo "No PR found"
   ```

## Output

Return structured context to main agent:

```json
{
  "status": "ready",
  "requires_confirmation": false,
  "task_id": "XXX",
  "title": "[task title]",
  "type": "[feature/bugfix/refactor/performance/deployment]",
  "priority": "[P1/P2/P3]",
  "branch": "[branch-name]",
  "pr_number": "[number]"
}
```

If user confirmation required (no task ID was specified):

```json
{
  "status": "pending_confirmation",
  "requires_confirmation": true,
  "task_id": "XXX",
  "title": "[task title]",
  "type": "[type]",
  "priority": "[priority]",
  "branch": "[branch-name]",
  "pr_number": "[number]"
}
```

If error:

```json
{
  "status": "error",
  "error_message": "[description]",
  "action": "[what user should do]"
}
```

## Error Handling

| Error | Message | Action |
|-------|---------|--------|
| Invalid worktree path | "Cannot determine task ID from path" | Check worktree location |
| Task ID mismatch | "Worktree is for task XXX, not YYY" | Navigate to correct worktree |
| Task not found | "Task XXX not found in TASK-LIST" | Verify task exists |
| Task completed | "Task XXX already completed" | Choose different task |
| Dependencies not met | "Blocked by: XXX, YYY" | Complete dependencies first |
