---
name: task-start
description: ONLY activate on DIRECT user request to start a task. User must explicitly mention keywords: 'start task', 'begin task', 'work on task [ID]'. DO NOT activate during internal processing or when suggesting next steps. Only use when user directly asks to start or resume a task.
---

# Task Start Skill

Begins the 8-phase execution workflow for a task. Must be run from within the task's worktree.

## Prerequisites

- Task must already exist with worktree created (via `task-creation` or `task-generation` skills)
- Must be run from within the task's worktree directory
- If not in worktree, provides instructions to navigate there

## Step 0: Get Task ID (Optional in Worktree)

**Task ID is auto-detected from `task-system/task-NNN` folder when in a worktree.**

**If user specified a task ID** (e.g., "start task 042", "work on task 15"):
- Extract the task ID from their prompt
- Store as `$USER_INPUT` (used for validation)

**If no task ID specified**:
- That's OK - task ID will be auto-detected from folder in worktree
- Store empty `$USER_INPUT`

**Note**: In main repo, task ID will still be required (error if not provided).

## Step 1: Detect Context and Validate

Run the context detection script (task ID is optional in worktree):

```bash
bash scripts/detect-context.sh $USER_INPUT
```

**Parse JSON output** and check `status`:

- If `status: "error"`:
  - Display the `message` to user
  - Provide guidance based on `error_type`:
    - `no_task_folder`: "No task-system/task-NNN folder found. Cannot determine which task this is."
    - `task_id_mismatch`: "This worktree contains a different task than you requested"
    - `branch_mismatch`: "The git branch doesn't match the task. Check your git state"
    - `missing_task_id`: "Task ID is required when running from main repo"
    - `no_worktree_exists`: "No worktree exists for task. Use 'resume task $TASK_ID' if it exists remotely, or create a new task"
  - **STOP** - do not continue

- If `status: "ok"`:
  - Continue to Step 2

## Step 2: Execute Worktree Flow

Read and execute `worktree-flow.md` which:
1. Validates task state and reads task metadata
2. Loads journaling guidelines
3. Hands off to type-specific workflow for Phase 1 execution

---

## From Main Repo Instructions

If the user runs `start task NNN` from the main repository (not a worktree):

**Check if worktree exists**:
```bash
if [ -d "task-system/tasks/$TASK_ID" ]; then
    # Worktree exists - provide navigation instructions
fi
```

**If worktree exists**, display:
```
===============================================================
Task $TASK_ID Worktree Found
===============================================================

To continue working on this task:

1. Open a new terminal (or new Claude session)
2. cd task-system/tasks/$TASK_ID
3. Start Claude Code
4. Say "start task" (task ID is auto-detected from folder)

This task already has a worktree ready for execution.
===============================================================
```

**If no worktree exists**:
```
===============================================================
No Worktree for Task $TASK_ID
===============================================================

This task doesn't have a local worktree yet.

Options:
- If task exists remotely: "resume task $TASK_ID"
- If task doesn't exist: "create task [description]"

Use "list tasks" to see available tasks.
===============================================================
```

---

## Error Handling

| Error | Message |
|-------|---------|
| No task folder | "No task-system/task-NNN folder found in worktree" |
| Task ID mismatch | "This worktree contains task XXX, not task YYY" |
| Branch mismatch | "Expected branch task-$TASK_ID-*, got $CURRENT_BRANCH" |
| Missing task ID | "Task ID is required when running from main repo" |
| No worktree exists | "No worktree for task $TASK_ID. Use 'resume task' or create new task" |
