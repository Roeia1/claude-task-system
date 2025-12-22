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

  - Check `error_type` and handle accordingly:
    - `not_in_worktree`: See [From Main Repo Handling](#from-main-repo-handling) below
    - `no_task_folder`: "No task-system/task-NNN folder found. Cannot determine which task this is."
    - `task_id_mismatch`: "This worktree contains a different task than you requested"
    - `branch_mismatch`: "The git branch doesn't match the task. Check your git state"
  - For non-spawn errors: **STOP** - do not continue

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

**Check JSON output for spawn support:**

1. **If `worktree_path` is populated** (user specified a task ID and worktree exists):
   - Attempt to spawn a new Claude session in the worktree
   - Run:
     ```bash
     bash ../../scripts/claude-spawn.sh "$WORKTREE_PATH" "start task $TASK_ID"
     ```
   - Handle exit codes:
     - Exit 0: Spawn succeeded - new pane created with Claude, old pane killed (no further action)
     - Exit 1: Not in TMUX - show manual navigation instructions
     - Exit 2: Invalid arguments (should not happen if worktree_path is set)
     - Exit 3: Path not found (worktree may have been deleted)

2. **If `worktree_path` is empty** (no task ID specified or worktree doesn't exist):
   - Show manual navigation instructions

**Display for successful spawn (TMUX):**

```
===============================================================
Spawning Claude in Task Worktree
===============================================================

Opening new pane at: task-system/tasks/NNN
A new Claude session will start in the new pane.

===============================================================
```

**Display for manual navigation (not in TMUX or spawn failed):**

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
| Not in worktree  | Attempt spawn if worktree_path available, else show manual instructions |
| No task folder   | "No task-system/task-NNN folder found in worktree"         |
| Task ID mismatch | "This worktree contains task XXX, not task YYY"            |
| Branch mismatch  | "Expected branch task-$TASK_ID-\*, got $CURRENT_BRANCH"    |
